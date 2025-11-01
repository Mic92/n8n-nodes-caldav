import ICAL from "ical.js";
import { NodeOperationError } from "n8n-workflow";
import { createDAVClient } from "tsdav";

import type { IEvent, ITodo } from "./types";
import type {
  IDataObject,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeListSearchResult,
  IPollFunctions,
} from "n8n-workflow";

/**
 * Normalize a URL for consistent comparison
 * Removes trailing slashes from pathname
 * Handles both absolute URLs and relative paths when baseUrl is provided
 */
function normalizeCalendarUrl(url: string, baseUrl?: string): string {
  const parsed = new URL(url, baseUrl);
  // Remove trailing slash from pathname for consistent comparison
  parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  return parsed.href;
}

/**
 * Find a calendar by URL with normalized comparison
 */
export function findCalendarByUrl(
  calendars: Array<{ url: string }>,
  calendarUrl: string,
  serverUrl?: string,
): { url: string } | undefined {
  const normalizedTarget = normalizeCalendarUrl(calendarUrl, serverUrl);
  return calendars.find((c) => {
    const normalizedCalendar = normalizeCalendarUrl(c.url, serverUrl);
    return normalizedCalendar === normalizedTarget;
  });
}

/**
 * Create and authenticate a CalDAV client
 */
export async function getCalDavClient(
  this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
): Promise<ReturnType<typeof createDAVClient>> {
  const credentials = await this.getCredentials("calDavApi");

  const config = {
    serverUrl: credentials.serverUrl as string,
    credentials: {
      username: credentials.username as string,
      password: credentials.password as string,
    },
    authMethod: "Basic" as const,
    defaultAccountType: "caldav" as const,
  };

  try {
    return await createDAVClient(config);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new NodeOperationError(
      this.getNode(),
      `Failed to connect to CalDAV server: ${errorMessage}`,
    );
  }
}

/**
 * Get list of calendars for resourceLocator dropdown
 */
export async function getCalendars(
  this: ILoadOptionsFunctions,
  filter?: string,
): Promise<INodeListSearchResult> {
  const client = await getCalDavClient.call(this);

  try {
    const calendars = await client.fetchCalendars();

    const results = calendars
      .filter((cal) => cal.components?.includes("VEVENT"))
      .map((cal) => ({
        name: typeof cal.displayName === "string" ? cal.displayName : "Unnamed Calendar",
        value: cal.url,
      }))
      .filter(
        (cal) =>
          !filter || cal.name.toLowerCase().includes(filter.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return { results };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new NodeOperationError(
      this.getNode(),
      `Failed to fetch calendars: ${errorMessage}`,
    );
  }
}

/**
 * Get list of calendars that support todos
 */
export async function getTodoCalendars(
  this: ILoadOptionsFunctions,
  filter?: string,
): Promise<INodeListSearchResult> {
  const client = await getCalDavClient.call(this);

  try {
    const calendars = await client.fetchCalendars();

    const results = calendars
      .filter((cal) => cal.components?.includes("VTODO"))
      .map((cal) => ({
        name: typeof cal.displayName === "string" ? cal.displayName : "Unnamed Calendar",
        value: cal.url,
      }))
      .filter(
        (cal) =>
          !filter || cal.name.toLowerCase().includes(filter.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return { results };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new NodeOperationError(
      this.getNode(),
      `Failed to fetch calendars: ${errorMessage}`,
    );
  }
}

/**
 * Convert n8n event parameters to iCalendar string (VEVENT)
 */
export function eventToICalendar(
  summary: string,
  start: string,
  end: string,
  additionalFields: IDataObject = {},
): string {
  const calendar = new ICAL.Component(["vcalendar", [], []]);
  calendar.updatePropertyWithValue("version", "2.0");
  calendar.updatePropertyWithValue("prodid", "-//n8n CalDAV Integration//EN");

  const vevent = new ICAL.Component("vevent");

  // UID - required unique identifier
  const uid =
    (additionalFields.uid as string) ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@n8n-caldav`;
  vevent.updatePropertyWithValue("uid", uid);

  // Summary (title)
  vevent.updatePropertyWithValue("summary", summary);

  // Start/End times
  const isAllDay = additionalFields.allDay === true;
  if (isAllDay) {
    // All-day events use DATE format
    const startDate = ICAL.Time.fromDateString(start.split("T")[0]);
    const endDate = ICAL.Time.fromDateString(end.split("T")[0]);
    startDate.isDate = true;
    endDate.isDate = true;
    vevent.updatePropertyWithValue("dtstart", startDate);
    vevent.updatePropertyWithValue("dtend", endDate);
  } else {
    // Regular events use DATETIME format
    // Parse date strings into Date objects first for robustness
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Create ICAL.Time from Date objects (more robust than string parsing)
    const dtstart = ICAL.Time.fromJSDate(startDate, true); // true = use UTC
    const dtend = ICAL.Time.fromJSDate(endDate, true);

    vevent.updatePropertyWithValue("dtstart", dtstart);
    vevent.updatePropertyWithValue("dtend", dtend);
  }

  // Optional fields
  if (additionalFields.description) {
    vevent.updatePropertyWithValue(
      "description",
      additionalFields.description as string,
    );
  }
  if (additionalFields.location) {
    vevent.updatePropertyWithValue(
      "location",
      additionalFields.location as string,
    );
  }
  if (additionalFields.rrule) {
    const rrule = ICAL.Recur.fromString(additionalFields.rrule as string);
    vevent.updatePropertyWithValue("rrule", rrule);
  }

  // Attendees
  if (additionalFields.attendees) {
    const attendeesList = (additionalFields.attendees as string)
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    attendeesList.forEach((email) => {
      const attendee = vevent.addPropertyWithValue(
        "attendee",
        `mailto:${email}`,
      );
      attendee.setParameter("rsvp", "TRUE");
    });
  }

  // Created/Modified timestamps
  const now = ICAL.Time.now();
  vevent.updatePropertyWithValue("created", now);
  vevent.updatePropertyWithValue("dtstamp", now);
  vevent.updatePropertyWithValue("last-modified", now);

  calendar.addSubcomponent(vevent);
  return calendar.toString();
}

/**
 * Convert n8n todo parameters to iCalendar string (VTODO)
 */
export function todoToICalendar(
  summary: string,
  additionalFields: IDataObject = {},
): string {
  const calendar = new ICAL.Component(["vcalendar", [], []]);
  calendar.updatePropertyWithValue("version", "2.0");
  calendar.updatePropertyWithValue("prodid", "-//n8n CalDAV Integration//EN");

  const vtodo = new ICAL.Component("vtodo");

  // UID - required
  const uid =
    (additionalFields.uid as string) ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@n8n-caldav`;
  vtodo.updatePropertyWithValue("uid", uid);

  // Summary (title)
  vtodo.updatePropertyWithValue("summary", summary);

  // Optional fields
  if (additionalFields.description) {
    vtodo.updatePropertyWithValue(
      "description",
      additionalFields.description as string,
    );
  }
  if (additionalFields.due) {
    // Parse date string into Date object first for robustness
    const dueDateObj = new Date(additionalFields.due as string);
    const dueDate = ICAL.Time.fromJSDate(dueDateObj, true); // true = use UTC
    vtodo.updatePropertyWithValue("due", dueDate);
  }
  if (additionalFields.priority !== undefined) {
    vtodo.updatePropertyWithValue(
      "priority",
      additionalFields.priority as number,
    );
  }
  if (additionalFields.status) {
    vtodo.updatePropertyWithValue(
      "status",
      (additionalFields.status as string).toUpperCase(),
    );
  }
  if (additionalFields.completed === true) {
    vtodo.updatePropertyWithValue("status", "COMPLETED");
    const now = ICAL.Time.now();
    vtodo.updatePropertyWithValue("completed", now);
  }

  // Created/Modified timestamps
  const now = ICAL.Time.now();
  vtodo.updatePropertyWithValue("created", now);
  vtodo.updatePropertyWithValue("dtstamp", now);
  vtodo.updatePropertyWithValue("last-modified", now);

  calendar.addSubcomponent(vtodo);
  return calendar.toString();
}

/**
 * Parse iCalendar VEVENT to n8n event format
 * Accepts unknown because tsdav types data as 'any'
 */
export function iCalendarToEvent(
  icalString: unknown,
  url: string,
  etag?: string,
): IEvent {
  if (typeof icalString !== "string") {
    throw new Error("Invalid iCalendar data: expected string");
  }

  try {
    const jcal = ICAL.parse(icalString) as unknown[];
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getFirstSubcomponent("vevent");

    if (!vevent) {
      throw new Error("No VEVENT found in iCalendar data");
    }

    const event: IEvent = {
      uid: String(vevent.getFirstPropertyValue("uid") || ""),
      summary: String(vevent.getFirstPropertyValue("summary") || ""),
      start: "",
      end: "",
      url,
    };

    if (etag) {
      event.etag = etag;
    }

    // Start time
    const dtstart = vevent.getFirstPropertyValue("dtstart");
    if (dtstart && typeof dtstart === "object" && "toJSDate" in dtstart) {
      event.start = dtstart.toJSDate().toISOString();
      event.allDay = "isDate" in dtstart ? Boolean(dtstart.isDate) : false;
    }

    // End time
    const dtend = vevent.getFirstPropertyValue("dtend");
    if (dtend && typeof dtend === "object" && "toJSDate" in dtend) {
      event.end = dtend.toJSDate().toISOString();
    }

    // Optional fields
    const description = vevent.getFirstPropertyValue("description");
    if (description && typeof description === "string") {
      event.description = description;
    }

    const location = vevent.getFirstPropertyValue("location");
    if (location && typeof location === "string") {
      event.location = location;
    }

    const rrule = vevent.getFirstPropertyValue("rrule");
    if (rrule) {
      event.rrule = rrule.toString();
    }

    // Attendees
    const attendees = vevent.getAllProperties("attendee");
    if (attendees.length > 0) {
      event.attendees = attendees.map((a) => {
        const value = a.getFirstValue();
        return typeof value === "string" ? value.replace("mailto:", "") : String(value);
      });
    }

    return event;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse iCalendar: ${errorMessage}`);
  }
}

/**
 * Parse iCalendar VTODO to n8n todo format
 * Accepts unknown because tsdav types data as 'any'
 */
export function iCalendarToTodo(
  icalString: unknown,
  url: string,
  etag?: string,
): ITodo {
  if (typeof icalString !== "string") {
    throw new Error("Invalid iCalendar data: expected string");
  }

  try {
    const jcal = ICAL.parse(icalString) as unknown[];
    const comp = new ICAL.Component(jcal);
    const vtodo = comp.getFirstSubcomponent("vtodo");

    if (!vtodo) {
      throw new Error("No VTODO found in iCalendar data");
    }

    const todo: ITodo = {
      uid: String(vtodo.getFirstPropertyValue("uid") || ""),
      summary: String(vtodo.getFirstPropertyValue("summary") || ""),
      url,
    };

    if (etag) {
      todo.etag = etag;
    }

    // Due date
    const due = vtodo.getFirstPropertyValue("due");
    if (due && typeof due === "object" && "toJSDate" in due) {
      todo.due = due.toJSDate().toISOString();
    }

    // Status
    const status = vtodo.getFirstPropertyValue("status");
    if (status && typeof status === "string") {
      todo.status = status;
      todo.completed = status === "COMPLETED";
    }

    // Priority
    const priority = vtodo.getFirstPropertyValue("priority");
    if (priority !== null && priority !== undefined && typeof priority === "number") {
      todo.priority = priority;
    }

    // Description
    const description = vtodo.getFirstPropertyValue("description");
    if (description && typeof description === "string") {
      todo.description = description;
    }

    return todo;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse iCalendar: ${errorMessage}`);
  }
}

/**
 * Generate unique filename from UID
 */
export function generateFilename(uid: string): string {
  return `${uid}.ics`;
}

/**
 * Type guard to check if calendar object has string data
 * tsdav returns data as 'any', so we validate and narrow to string
 */
export function hasData<T extends { data?: unknown }>(
  obj: T,
): obj is T & { data: string } {
  return typeof obj.data === "string" && obj.data.length > 0;
}
