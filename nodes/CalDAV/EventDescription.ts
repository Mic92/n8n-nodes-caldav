import type { INodeProperties } from "n8n-workflow";

export const eventOperations: INodeProperties[] = [
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ["event"],
      },
    },
    options: [
      {
        name: "Create",
        value: "create",
        action: "Create an event",
        description: "Create a new calendar event",
      },
      {
        name: "Delete",
        value: "delete",
        action: "Delete an event",
        description: "Delete a calendar event",
      },
      {
        name: "Get",
        value: "get",
        action: "Get an event",
        description: "Get a single event",
      },
      {
        name: "Get All",
        value: "getAll",
        action: "Get all events",
        description: "Get all events from a calendar",
      },
      {
        name: "Update",
        value: "update",
        action: "Update an event",
        description: "Update an existing event",
      },
    ],
    default: "create",
  },
];

export const eventFields: INodeProperties[] = [
  // =====================================
  // Calendar selector (all operations)
  // =====================================
  {
    displayName: "Calendar",
    name: "calendar",
    type: "resourceLocator",
    default: { mode: "list", value: "" },
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
      },
    },
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
    description: "The calendar to operate on",
  },

  // =====================================
  // CREATE fields
  // =====================================
  {
    displayName: "Summary",
    name: "summary",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["create"],
      },
    },
    description: "Event title/summary",
  },
  {
    displayName: "Start",
    name: "start",
    type: "dateTime",
    default: "={{ $now }}",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["create"],
      },
    },
    description: "Event start time",
  },
  {
    displayName: "End",
    name: "end",
    type: "dateTime",
    default: "={{ $now.plus(1, 'hour') }}",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["create"],
      },
    },
    description: "Event end time",
  },
  {
    displayName: "Additional Fields",
    name: "additionalFields",
    type: "collection",
    placeholder: "Add Field",
    default: {},
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["create"],
      },
    },
    options: [
      {
        displayName: "All Day Event",
        name: "allDay",
        type: "boolean",
        default: false,
        description: "Whether this is an all-day event",
      },
      {
        displayName: "Attendees",
        name: "attendees",
        type: "string",
        default: "",
        placeholder: "user@example.com, other@example.com",
        description: "Comma-separated list of attendee email addresses",
      },
      {
        displayName: "Description",
        name: "description",
        type: "string",
        default: "",
        typeOptions: {
          rows: 4,
        },
        description: "Event description/notes",
      },
      {
        displayName: "Location",
        name: "location",
        type: "string",
        default: "",
        description: "Event location",
      },
      {
        displayName: "Recurrence Rule (RRULE)",
        name: "rrule",
        type: "string",
        default: "",
        placeholder: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        description:
          "Recurrence rule in iCalendar RRULE format. Example: FREQ=DAILY;COUNT=10 for daily event repeating 10 times.",
      },
      {
        displayName: "UID",
        name: "uid",
        type: "string",
        default: "",
        description:
          "Unique identifier for the event. Auto-generated if not provided.",
      },
    ],
  },

  // =====================================
  // UPDATE fields
  // =====================================
  {
    displayName: "Event URL",
    name: "eventUrl",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["update"],
      },
    },
    description: "The full URL of the event (from previous operations)",
    placeholder: "https://caldav.example.com/calendars/user/home/event-123.ics",
  },
  {
    displayName: "ETag",
    name: "etag",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["update"],
      },
    },
    description:
      "The ETag of the event (from Get operation) to prevent conflicts",
  },
  {
    displayName: "Summary",
    name: "summary",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["update"],
      },
    },
    description: "Event title/summary",
  },
  {
    displayName: "Start",
    name: "start",
    type: "dateTime",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["update"],
      },
    },
    description: "Event start time",
  },
  {
    displayName: "End",
    name: "end",
    type: "dateTime",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["update"],
      },
    },
    description: "Event end time",
  },
  {
    displayName: "Additional Fields",
    name: "additionalFields",
    type: "collection",
    placeholder: "Add Field",
    default: {},
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["update"],
      },
    },
    options: [
      {
        displayName: "All Day Event",
        name: "allDay",
        type: "boolean",
        default: false,
        description: "Whether this is an all-day event",
      },
      {
        displayName: "Attendees",
        name: "attendees",
        type: "string",
        default: "",
        placeholder: "user@example.com, other@example.com",
        description: "Comma-separated list of attendee email addresses",
      },
      {
        displayName: "Description",
        name: "description",
        type: "string",
        default: "",
        typeOptions: {
          rows: 4,
        },
        description: "Event description/notes",
      },
      {
        displayName: "Location",
        name: "location",
        type: "string",
        default: "",
        description: "Event location",
      },
      {
        displayName: "Recurrence Rule (RRULE)",
        name: "rrule",
        type: "string",
        default: "",
        placeholder: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        description: "Recurrence rule in iCalendar RRULE format",
      },
      {
        displayName: "UID",
        name: "uid",
        type: "string",
        default: "",
        description: "Unique identifier for the event",
      },
    ],
  },

  // =====================================
  // GET fields
  // =====================================
  {
    displayName: "Event URL",
    name: "eventUrl",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["get"],
      },
    },
    description: "The full URL of the event",
    placeholder: "https://caldav.example.com/calendars/user/home/event-123.ics",
  },

  // =====================================
  // GET ALL fields
  // =====================================
  {
    displayName: "Options",
    name: "options",
    type: "collection",
    placeholder: "Add Option",
    default: {},
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["getAll"],
      },
    },
    options: [
      {
        displayName: "Expand Recurring Events",
        name: "expand",
        type: "boolean",
        default: false,
        description:
          "Whether to expand recurring events into individual occurrences",
      },
      {
        displayName: "Time Range End",
        name: "timeMax",
        type: "dateTime",
        default: "",
        description: "Filter events ending before this time",
      },
      {
        displayName: "Time Range Start",
        name: "timeMin",
        type: "dateTime",
        default: "",
        description: "Filter events starting after this time",
      },
    ],
  },

  // =====================================
  // DELETE fields
  // =====================================
  {
    displayName: "Event URL",
    name: "eventUrl",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["delete"],
      },
    },
    description: "The full URL of the event to delete",
    placeholder: "https://caldav.example.com/calendars/user/home/event-123.ics",
  },
  {
    displayName: "ETag",
    name: "etag",
    type: "string",
    default: "",
    displayOptions: {
      show: {
        resource: ["event"],
        operation: ["delete"],
      },
    },
    description:
      "The ETag of the event (optional, but recommended to prevent conflicts)",
  },
];
