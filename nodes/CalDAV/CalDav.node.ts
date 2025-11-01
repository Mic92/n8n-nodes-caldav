import { NodeOperationError } from "n8n-workflow";

import { calendarFields, calendarOperations } from "./CalendarDescription";
import { eventFields, eventOperations } from "./EventDescription";
import {
  eventToICalendar,
  findCalendarByUrl,
  generateFilename,
  getCalDavClient,
  getCalendars,
  getTodoCalendars,
  hasData,
  iCalendarToEvent,
  iCalendarToTodo,
  todoToICalendar,
} from "./GenericFunctions";
import { todoFields, todoOperations } from "./TodoDescription";

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow";

export class CalDav implements INodeType {
  description: INodeTypeDescription = {
    displayName: "CalDAV",
    name: "calDav",
    icon: "fa:calendar",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      "Interact with CalDAV servers (Nextcloud, iCloud, Radicale, etc.)",
    defaults: {
      name: "CalDAV",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "calDavApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Calendar",
            value: "calendar",
          },
          {
            name: "Event",
            value: "event",
          },
          {
            name: "Todo",
            value: "todo",
          },
        ],
        default: "event",
      },
      ...calendarOperations,
      ...calendarFields,
      ...eventOperations,
      ...eventFields,
      ...todoOperations,
      ...todoFields,
    ],
  };

  methods = {
    listSearch: {
      getCalendars,
      getTodoCalendars,
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter("resource", 0);
    const operation = this.getNodeParameter("operation", 0);

    for (let i = 0; i < items.length; i++) {
      try {
        // ======================
        // CALENDAR OPERATIONS
        // ======================
        if (resource === "calendar") {
          if (operation === "getAll") {
            const client = await getCalDavClient.call(this);
            const calendars = await client.fetchCalendars();

            const results = calendars.map((cal) => ({
              url: cal.url,
              displayName: cal.displayName,
              description: cal.description,
              timezone: cal.timezone,
              components: cal.components,
              ctag: cal.ctag,
              syncToken: cal.syncToken,
            }));

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(results),
                { itemData: { item: i } },
              ),
            );
          }
        }

        // ======================
        // EVENT OPERATIONS
        // ======================
        else if (resource === "event") {
          const calendarUrl = this.getNodeParameter("calendar", i, "", {
            extractValue: true,
          }) as string;

          // CREATE
          if (operation === "create") {
            const summary = this.getNodeParameter("summary", i) as string;
            const start = this.getNodeParameter("start", i) as string;
            const end = this.getNodeParameter("end", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i,
            );

            const iCalString = eventToICalendar(
              summary,
              start,
              end,
              additionalFields,
            );
            const uid =
              (additionalFields.uid as string) ||
              `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@n8n-caldav`;
            const filename = generateFilename(uid);

            const credentials = await this.getCredentials("calDavApi");
            const serverUrl = credentials.serverUrl as string;

            const client = await getCalDavClient.call(this);
            const calendars = await client.fetchCalendars();

            const calendar = findCalendarByUrl(calendars, calendarUrl, serverUrl);

            if (!calendar) {
              throw new NodeOperationError(
                this.getNode(),
                `Calendar not found at ${calendarUrl}. Available calendars: ${calendars.map(c => c.url).join(", ")}`,
                {
                  itemIndex: i,
                },
              );
            }

            const response = await client.createCalendarObject({
              calendar,
              filename,
              iCalString,
            });

            if (!response.ok) {
              throw new NodeOperationError(
                this.getNode(),
                `Failed to create event: ${response.status} ${response.statusText}`,
                { itemIndex: i },
              );
            }

            // Fetch the created event to return it
            const createdObjects = await client.fetchCalendarObjects({
              calendar,
              objectUrls: [`${calendar.url}${filename}`],
            });

            if (createdObjects.length === 0 || !createdObjects[0].data) {
              throw new NodeOperationError(
                this.getNode(),
                "Failed to fetch created event",
                {
                  itemIndex: i,
                },
              );
            }

            const event = iCalendarToEvent(
              createdObjects[0].data,
              createdObjects[0].url,
              createdObjects[0].etag,
            );

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(event),
                {
                  itemData: { item: i },
                },
              ),
            );
          }

          // GET
          else if (operation === "get") {
            const eventUrl = this.getNodeParameter("eventUrl", i) as string;

            const credentials = await this.getCredentials("calDavApi");
            const serverUrl = credentials.serverUrl as string;

            const client = await getCalDavClient.call(this);

            // Extract calendar URL from event URL (remove the filename)
            const eventCalendarUrl = eventUrl.substring(0, eventUrl.lastIndexOf("/") + 1);
            const calendars = await client.fetchCalendars();
            const calendar = findCalendarByUrl(calendars, eventCalendarUrl, serverUrl);

            if (!calendar) {
              throw new NodeOperationError(
                this.getNode(),
                `Calendar not found for event at ${eventUrl}`,
                { itemIndex: i },
              );
            }

            const objects = await client.fetchCalendarObjects({
              calendar,
              objectUrls: [eventUrl],
            });

            if (objects.length === 0 || !objects[0].data) {
              throw new NodeOperationError(this.getNode(), "Event not found", {
                itemIndex: i,
              });
            }

            const event = iCalendarToEvent(
              objects[0].data,
              objects[0].url,
              objects[0].etag,
            );

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(event),
                {
                  itemData: { item: i },
                },
              ),
            );
          }

          // GET ALL
          else if (operation === "getAll") {
            const credentials = await this.getCredentials("calDavApi");
            const serverUrl = credentials.serverUrl as string;

            const client = await getCalDavClient.call(this);
            const calendars = await client.fetchCalendars();

            // Normalize URLs for comparison using shared helper
            const calendar = findCalendarByUrl(calendars, calendarUrl, serverUrl);

            if (!calendar) {
              throw new NodeOperationError(
                this.getNode(),
                `Calendar not found at ${calendarUrl}. Available calendars: ${calendars.map(c => c.url).join(", ")}`,
                {
                  itemIndex: i,
                },
              );
            }

            const fetchOptions: {
              calendar: typeof calendar;
              timeRange?: { start: string; end: string };
              expand?: boolean;
            } = {
              calendar,
            };

            // Add time range if both start and end are specified
            const timeMin = this.getNodeParameter("options.timeMin", i, "") as string;
            const timeMax = this.getNodeParameter("options.timeMax", i, "") as string;
            if (timeMin && timeMax) {
              fetchOptions.timeRange = {
                start: timeMin,
                end: timeMax,
              };
            }

            // Add expand option
            const expand = this.getNodeParameter("options.expand", i, false) as boolean;
            if (expand) {
              fetchOptions.expand = true;
            }

            const objects = await client.fetchCalendarObjects(fetchOptions);

            const events = objects
              .filter(hasData)
              .map((obj) => iCalendarToEvent(obj.data, obj.url, obj.etag));

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(events),
                { itemData: { item: i } },
              ),
            );
          }

          // UPDATE
          else if (operation === "update") {
            const eventUrl = this.getNodeParameter("eventUrl", i) as string;
            const etag = this.getNodeParameter("etag", i) as string;
            const summary = this.getNodeParameter("summary", i) as string;
            const start = this.getNodeParameter("start", i) as string;
            const end = this.getNodeParameter("end", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i,
            );

            const iCalString = eventToICalendar(
              summary,
              start,
              end,
              additionalFields,
            );

            const client = await getCalDavClient.call(this);
            const response = await client.updateCalendarObject({
              calendarObject: {
                url: eventUrl,
                data: iCalString,
                etag,
              },
            });

            if (!response.ok) {
              if (response.status === 412) {
                throw new NodeOperationError(
                  this.getNode(),
                  "Event was modified by another client (ETag mismatch)",
                  { itemIndex: i },
                );
              }
              throw new NodeOperationError(
                this.getNode(),
                `Failed to update event: ${response.status} ${response.statusText}`,
                { itemIndex: i },
              );
            }

            // Fetch the updated event
            const credentials = await this.getCredentials("calDavApi");
            const serverUrl = credentials.serverUrl as string;

            // Extract calendar URL from event URL (remove the filename)
            const eventCalendarUrl = eventUrl.substring(0, eventUrl.lastIndexOf("/") + 1);
            const calendars = await client.fetchCalendars();
            const calendar = findCalendarByUrl(calendars, eventCalendarUrl, serverUrl);

            if (!calendar) {
              throw new NodeOperationError(
                this.getNode(),
                `Calendar not found for event at ${eventUrl}`,
                {
                  itemIndex: i,
                },
              );
            }

            const objects = await client.fetchCalendarObjects({
              calendar,
              objectUrls: [eventUrl],
            });

            if (!objects[0]?.data) {
              throw new NodeOperationError(
                this.getNode(),
                "Failed to fetch updated event",
                { itemIndex: i },
              );
            }

            const event = iCalendarToEvent(
              objects[0].data,
              objects[0].url,
              objects[0].etag,
            );

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(event),
                {
                  itemData: { item: i },
                },
              ),
            );
          }

          // DELETE
          else if (operation === "delete") {
            const eventUrl = this.getNodeParameter("eventUrl", i) as string;
            const etag = this.getNodeParameter("etag", i, "") as string;

            const client = await getCalDavClient.call(this);
            const response = await client.deleteCalendarObject({
              calendarObject: {
                url: eventUrl,
                etag: etag || undefined,
              },
            });

            if (!response.ok) {
              throw new NodeOperationError(
                this.getNode(),
                `Failed to delete event: ${response.status} ${response.statusText}`,
                { itemIndex: i },
              );
            }

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray({ success: true }),
                { itemData: { item: i } },
              ),
            );
          }
        }

        // ======================
        // TODO OPERATIONS
        // ======================
        else if (resource === "todo") {
          const calendarUrl = this.getNodeParameter("calendar", i, "", {
            extractValue: true,
          }) as string;

          // CREATE
          if (operation === "create") {
            const summary = this.getNodeParameter("summary", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i,
            );

            const iCalString = todoToICalendar(summary, additionalFields);
            const uid =
              (additionalFields.uid as string) ||
              `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@n8n-caldav`;
            const filename = generateFilename(uid);

            const credentials = await this.getCredentials("calDavApi");
            const serverUrl = credentials.serverUrl as string;

            const client = await getCalDavClient.call(this);
            const calendars = await client.fetchCalendars();

            const calendar = findCalendarByUrl(calendars, calendarUrl, serverUrl);

            if (!calendar) {
              throw new NodeOperationError(
                this.getNode(),
                `Calendar not found at ${calendarUrl}. Available calendars: ${calendars.map(c => c.url).join(", ")}`,
                {
                  itemIndex: i,
                },
              );
            }

            const response = await client.createCalendarObject({
              calendar,
              filename,
              iCalString,
            });

            if (!response.ok) {
              throw new NodeOperationError(
                this.getNode(),
                `Failed to create todo: ${response.status} ${response.statusText}`,
                { itemIndex: i },
              );
            }

            // Fetch the created todo
            const createdObjects = await client.fetchCalendarObjects({
              calendar,
              objectUrls: [`${calendar.url}${filename}`],
            });

            if (createdObjects.length === 0 || !createdObjects[0].data) {
              throw new NodeOperationError(
                this.getNode(),
                "Failed to fetch created todo",
                {
                  itemIndex: i,
                },
              );
            }

            const todo = iCalendarToTodo(
              createdObjects[0].data,
              createdObjects[0].url,
              createdObjects[0].etag,
            );

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(todo),
                {
                  itemData: { item: i },
                },
              ),
            );
          }

          // GET
          else if (operation === "get") {
            const todoUrl = this.getNodeParameter("todoUrl", i) as string;

            const credentials = await this.getCredentials("calDavApi");
            const serverUrl = credentials.serverUrl as string;

            const client = await getCalDavClient.call(this);

            // Extract calendar URL from todo URL (remove the filename)
            const todoCalendarUrl = todoUrl.substring(0, todoUrl.lastIndexOf("/") + 1);
            const calendars = await client.fetchCalendars();
            const calendar = findCalendarByUrl(calendars, todoCalendarUrl, serverUrl);

            if (!calendar) {
              throw new NodeOperationError(
                this.getNode(),
                `Calendar not found for todo at ${todoUrl}`,
                { itemIndex: i },
              );
            }

            const objects = await client.fetchCalendarObjects({
              calendar,
              objectUrls: [todoUrl],
            });

            if (objects.length === 0 || !objects[0].data) {
              throw new NodeOperationError(this.getNode(), "Todo not found", {
                itemIndex: i,
              });
            }

            const todo = iCalendarToTodo(
              objects[0].data,
              objects[0].url,
              objects[0].etag,
            );

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(todo),
                {
                  itemData: { item: i },
                },
              ),
            );
          }

          // GET ALL
          else if (operation === "getAll") {
            const credentials = await this.getCredentials("calDavApi");
            const serverUrl = credentials.serverUrl as string;

            const client = await getCalDavClient.call(this);
            const calendars = await client.fetchCalendars();

            const calendar = findCalendarByUrl(calendars, calendarUrl, serverUrl);

            if (!calendar) {
              throw new NodeOperationError(
                this.getNode(),
                `Calendar not found at ${calendarUrl}. Available calendars: ${calendars.map(c => c.url).join(", ")}`,
                {
                  itemIndex: i,
                },
              );
            }

            const objects = await client.fetchCalendarObjects({
              calendar,
            });

            let todos = objects
              .filter(hasData)
              .map((obj) => iCalendarToTodo(obj.data, obj.url, obj.etag));

            // Filter by status if specified
            const statusFilter = this.getNodeParameter("options.status", i, "") as string;
            if (statusFilter) {
              todos = todos.filter((todo) => todo.status === statusFilter);
            }

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(todos),
                { itemData: { item: i } },
              ),
            );
          }

          // UPDATE
          else if (operation === "update") {
            const todoUrl = this.getNodeParameter("todoUrl", i) as string;
            const etag = this.getNodeParameter("etag", i) as string;
            const summary = this.getNodeParameter("summary", i) as string;
            const additionalFields = this.getNodeParameter(
              "additionalFields",
              i,
            );

            const iCalString = todoToICalendar(summary, additionalFields);

            const client = await getCalDavClient.call(this);
            const response = await client.updateCalendarObject({
              calendarObject: {
                url: todoUrl,
                data: iCalString,
                etag,
              },
            });

            if (!response.ok) {
              if (response.status === 412) {
                throw new NodeOperationError(
                  this.getNode(),
                  "Todo was modified by another client (ETag mismatch)",
                  { itemIndex: i },
                );
              }
              throw new NodeOperationError(
                this.getNode(),
                `Failed to update todo: ${response.status} ${response.statusText}`,
                { itemIndex: i },
              );
            }

            // Fetch the updated todo
            const credentials = await this.getCredentials("calDavApi");
            const serverUrl = credentials.serverUrl as string;

            // Extract calendar URL from todo URL (remove the filename)
            const todoCalendarUrl = todoUrl.substring(0, todoUrl.lastIndexOf("/") + 1);
            const calendars = await client.fetchCalendars();
            const calendar = findCalendarByUrl(calendars, todoCalendarUrl, serverUrl);

            if (!calendar) {
              throw new NodeOperationError(
                this.getNode(),
                `Calendar not found for todo at ${todoUrl}`,
                {
                  itemIndex: i,
                },
              );
            }

            const objects = await client.fetchCalendarObjects({
              calendar,
              objectUrls: [todoUrl],
            });

            if (!objects[0]?.data) {
              throw new NodeOperationError(
                this.getNode(),
                "Failed to fetch updated todo",
                { itemIndex: i },
              );
            }

            const todo = iCalendarToTodo(
              objects[0].data,
              objects[0].url,
              objects[0].etag,
            );

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray(todo),
                {
                  itemData: { item: i },
                },
              ),
            );
          }

          // DELETE
          else if (operation === "delete") {
            const todoUrl = this.getNodeParameter("todoUrl", i) as string;
            const etag = this.getNodeParameter("etag", i, "") as string;

            const client = await getCalDavClient.call(this);
            const response = await client.deleteCalendarObject({
              calendarObject: {
                url: todoUrl,
                etag: etag || undefined,
              },
            });

            if (!response.ok) {
              throw new NodeOperationError(
                this.getNode(),
                `Failed to delete todo: ${response.status} ${response.statusText}`,
                { itemIndex: i },
              );
            }

            returnData.push(
              ...this.helpers.constructExecutionMetaData(
                this.helpers.returnJsonArray({ success: true }),
                { itemData: { item: i } },
              ),
            );
          }
        }
      } catch (error) {
        if (this.continueOnFail()) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          returnData.push(
            ...this.helpers.constructExecutionMetaData(
              this.helpers.returnJsonArray({ error: errorMessage }),
              { itemData: { item: i } },
            ),
          );
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
