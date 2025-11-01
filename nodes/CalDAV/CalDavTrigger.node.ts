import { NodeOperationError } from "n8n-workflow";

import {
  getCalDavClient,
  getCalendars,
  hasData,
  iCalendarToEvent,
} from "./GenericFunctions";

import type {
  IPollFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow";

export class CalDavTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "CalDAV Trigger",
    name: "calDavTrigger",
    icon: "fa:calendar",
    group: ["trigger"],
    version: 1,
    description: "Poll CalDAV server for event changes",
    defaults: {
      name: "CalDAV Trigger",
    },
    inputs: [],
    outputs: ["main"],
    credentials: [
      {
        name: "calDavApi",
        required: true,
      },
    ],
    polling: true,
    properties: [
      {
        displayName: "Calendar",
        name: "calendar",
        type: "resourceLocator",
        default: { mode: "list", value: "" },
        required: true,
        modes: [
          {
            displayName: "Calendar",
            name: "list",
            type: "list",
            typeOptions: {
              searchListMethod: "getCalendars",
              searchable: true,
            },
          },
          {
            displayName: "URL",
            name: "url",
            type: "string",
            placeholder: "/calendars/user/home/",
          },
        ],
        description: "The calendar to monitor",
      },
      {
        displayName: "Trigger On",
        name: "triggerOn",
        type: "options",
        options: [
          {
            name: "Event Created",
            value: "eventCreated",
            description: "Trigger when a new event is created",
          },
          {
            name: "Event Updated",
            value: "eventUpdated",
            description: "Trigger when an event is updated",
          },
          {
            name: "Event Started",
            value: "eventStarted",
            description: "Trigger when an event starts (based on start time)",
          },
        ],
        default: "eventCreated",
        description: "When to trigger",
      },
      {
        displayName: "Minutes Before Event",
        name: "minutesBefore",
        type: "number",
        default: 0,
        description: "Trigger X minutes before the event starts (0 = trigger exactly at start time)",
        typeOptions: {
          minValue: 0,
        },
        displayOptions: {
          show: {
            triggerOn: ["eventStarted"],
          },
        },
      },
      {
        displayName: "Options",
        name: "options",
        type: "collection",
        placeholder: "Add Option",
        default: {},
        options: [
          {
            displayName: "Poll Interval (minutes)",
            name: "pollInterval",
            type: "number",
            default: 5,
            description: "How often to check for changes (in minutes)",
            typeOptions: {
              minValue: 1,
            },
          },
        ],
      },
    ],
  };

  methods = {
    listSearch: {
      getCalendars,
    },
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const webhookData = this.getWorkflowStaticData("node");
    const calendarUrl = this.getNodeParameter("calendar", "", {
      extractValue: true,
    }) as string;
    const triggerOn = this.getNodeParameter("triggerOn") as string;

    const now = new Date();
    const lastTimeChecked = webhookData.lastTimeChecked
      ? new Date(webhookData.lastTimeChecked as string)
      : new Date(now.getTime() - 60 * 60 * 1000); // Default: 1 hour ago

    // Initialize ETag storage for tracking event changes
    if (!webhookData.knownEvents) {
      webhookData.knownEvents = {};
    }
    const knownEvents = webhookData.knownEvents as { [uid: string]: string };

    // Get the minutes before offset for eventStarted trigger
    const minutesBefore =
      triggerOn === "eventStarted"
        ? (this.getNodeParameter("minutesBefore", 0) as number)
        : 0;
    const offsetMs = minutesBefore * 60 * 1000;

    try {
      const client = await getCalDavClient.call(this);
      const calendar = (await client.fetchCalendars()).find(
        (c) => c.url === calendarUrl,
      );

      if (!calendar) {
        throw new NodeOperationError(this.getNode(), "Calendar not found");
      }

      // Fetch events
      const fetchOptions: {
        calendar: typeof calendar;
        timeRange?: { start: string; end: string };
        expand?: boolean;
      } = {
        calendar,
      };

      // For event started, use time range and expand recurring events
      // This follows Google Calendar's behavior: expand recurring events for
      // eventStarted so users get individual triggers for each occurrence
      if (triggerOn === "eventStarted") {
        // Extend the end time to include events that start within the offset period
        // This ensures we fetch events that haven't started yet but will trigger soon
        const fetchEndTime = new Date(now.getTime() + offsetMs);

        fetchOptions.timeRange = {
          start: lastTimeChecked.toISOString(),
          end: fetchEndTime.toISOString(),
        };
        fetchOptions.expand = true;
      }

      const objects = await client.fetchCalendarObjects(fetchOptions);

      const events = objects
        .filter(hasData)
        .map((obj) => {
          try {
            return iCalendarToEvent(obj.data, obj.url, obj.etag);
          } catch (error) {
            // Log parsing errors for debugging
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to parse event from ${obj.url}: ${errorMessage}`);
            return null;
          }
        })
        .filter((event) => event !== null);

      // Filter events based on trigger type
      let filteredEvents = events;

      if (triggerOn === "eventStarted") {
        // Filter events whose trigger time falls between lastTimeChecked and now
        // Trigger time = start time - offset
        filteredEvents = events.filter((event) => {
          const startTime = new Date(event.start);
          const triggerTime = new Date(startTime.getTime() - offsetMs);
          return triggerTime >= lastTimeChecked && triggerTime <= now;
        });
      } else if (triggerOn === "eventCreated") {
        // New events don't have stored ETags
        filteredEvents = events.filter((event) => !knownEvents[event.uid]);
      } else if (triggerOn === "eventUpdated") {
        // Updated events have different ETags than stored ones
        // Only include events we've seen before (not new ones)
        filteredEvents = events.filter((event) => {
          const oldEtag = knownEvents[event.uid];
          return oldEtag && oldEtag !== event.etag;
        });
      }

      // Update stored ETags only for triggers that use ETag tracking
      // For eventStarted, we use time-based filtering so we skip ETag tracking
      // to avoid issues with expanded recurring events (which share the same UID)
      if (triggerOn === "eventCreated" || triggerOn === "eventUpdated") {
        // Update stored ETags for all current events
        // This ensures we track both new and updated events
        events.forEach((event) => {
          knownEvents[event.uid] = event.etag || "";
        });

        // Clean up deleted events to prevent unbounded storage growth
        const currentUids = new Set(events.map((e) => e.uid));
        Object.keys(knownEvents).forEach((uid) => {
          if (!currentUids.has(uid)) {
            delete knownEvents[uid];
          }
        });
      }

      // Update last check time
      webhookData.lastTimeChecked = now.toISOString();

      if (filteredEvents.length === 0) {
        return null;
      }

      return [this.helpers.returnJsonArray(filteredEvents)];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new NodeOperationError(
        this.getNode(),
        `Failed to poll CalDAV server: ${errorMessage}`,
      );
    }
  }
}
