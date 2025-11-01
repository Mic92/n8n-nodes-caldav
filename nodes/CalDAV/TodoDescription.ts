import type { INodeProperties } from "n8n-workflow";

export const todoOperations: INodeProperties[] = [
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ["todo"],
      },
    },
    options: [
      {
        name: "Create",
        value: "create",
        action: "Create a todo",
        description: "Create a new todo/task",
      },
      {
        name: "Delete",
        value: "delete",
        action: "Delete a todo",
        description: "Delete a todo/task",
      },
      {
        name: "Get",
        value: "get",
        action: "Get a todo",
        description: "Get a single todo",
      },
      {
        name: "Get All",
        value: "getAll",
        action: "Get all todos",
        description: "Get all todos from a calendar",
      },
      {
        name: "Update",
        value: "update",
        action: "Update a todo",
        description: "Update an existing todo",
      },
    ],
    default: "create",
  },
];

export const todoFields: INodeProperties[] = [
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
        resource: ["todo"],
      },
    },
    modes: [
      {
        displayName: "Calendar",
        name: "list",
        type: "list",
        typeOptions: {
          searchListMethod: "getTodoCalendars",
          searchable: true,
        },
      },
      {
        displayName: "URL",
        name: "url",
        type: "string",
        placeholder: "/calendars/user/tasks/",
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
        resource: ["todo"],
        operation: ["create"],
      },
    },
    description: "Todo title/summary",
  },
  {
    displayName: "Additional Fields",
    name: "additionalFields",
    type: "collection",
    placeholder: "Add Field",
    default: {},
    displayOptions: {
      show: {
        resource: ["todo"],
        operation: ["create"],
      },
    },
    options: [
      {
        displayName: "Completed",
        name: "completed",
        type: "boolean",
        default: false,
        description: "Whether the todo is completed",
      },
      {
        displayName: "Description",
        name: "description",
        type: "string",
        default: "",
        typeOptions: {
          rows: 4,
        },
        description: "Todo description/notes",
      },
      {
        displayName: "Due Date",
        name: "due",
        type: "dateTime",
        default: "",
        description: "Due date for the todo",
      },
      {
        displayName: "Priority",
        name: "priority",
        type: "number",
        default: 0,
        description: "Priority (0 = undefined, 1 = highest, 9 = lowest)",
        typeOptions: {
          minValue: 0,
          maxValue: 9,
        },
      },
      {
        displayName: "Status",
        name: "status",
        type: "options",
        default: "NEEDS-ACTION",
        options: [
          {
            name: "Needs Action",
            value: "NEEDS-ACTION",
          },
          {
            name: "In Progress",
            value: "IN-PROCESS",
          },
          {
            name: "Completed",
            value: "COMPLETED",
          },
          {
            name: "Cancelled",
            value: "CANCELLED",
          },
        ],
        description: "Status of the todo",
      },
      {
        displayName: "UID",
        name: "uid",
        type: "string",
        default: "",
        description:
          "Unique identifier for the todo. Auto-generated if not provided.",
      },
    ],
  },

  // =====================================
  // UPDATE fields
  // =====================================
  {
    displayName: "Todo URL",
    name: "todoUrl",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["todo"],
        operation: ["update"],
      },
    },
    description: "The full URL of the todo (from previous operations)",
    placeholder: "https://caldav.example.com/calendars/user/tasks/todo-123.ics",
  },
  {
    displayName: "ETag",
    name: "etag",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["todo"],
        operation: ["update"],
      },
    },
    description:
      "The ETag of the todo (from Get operation) to prevent conflicts",
  },
  {
    displayName: "Summary",
    name: "summary",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["todo"],
        operation: ["update"],
      },
    },
    description: "Todo title/summary",
  },
  {
    displayName: "Additional Fields",
    name: "additionalFields",
    type: "collection",
    placeholder: "Add Field",
    default: {},
    displayOptions: {
      show: {
        resource: ["todo"],
        operation: ["update"],
      },
    },
    options: [
      {
        displayName: "Completed",
        name: "completed",
        type: "boolean",
        default: false,
        description: "Whether the todo is completed",
      },
      {
        displayName: "Description",
        name: "description",
        type: "string",
        default: "",
        typeOptions: {
          rows: 4,
        },
        description: "Todo description/notes",
      },
      {
        displayName: "Due Date",
        name: "due",
        type: "dateTime",
        default: "",
        description: "Due date for the todo",
      },
      {
        displayName: "Priority",
        name: "priority",
        type: "number",
        default: 0,
        description: "Priority (0 = undefined, 1 = highest, 9 = lowest)",
        typeOptions: {
          minValue: 0,
          maxValue: 9,
        },
      },
      {
        displayName: "Status",
        name: "status",
        type: "options",
        default: "NEEDS-ACTION",
        options: [
          {
            name: "Needs Action",
            value: "NEEDS-ACTION",
          },
          {
            name: "In Progress",
            value: "IN-PROCESS",
          },
          {
            name: "Completed",
            value: "COMPLETED",
          },
          {
            name: "Cancelled",
            value: "CANCELLED",
          },
        ],
        description: "Status of the todo",
      },
      {
        displayName: "UID",
        name: "uid",
        type: "string",
        default: "",
        description: "Unique identifier for the todo",
      },
    ],
  },

  // =====================================
  // GET fields
  // =====================================
  {
    displayName: "Todo URL",
    name: "todoUrl",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["todo"],
        operation: ["get"],
      },
    },
    description: "The full URL of the todo",
    placeholder: "https://caldav.example.com/calendars/user/tasks/todo-123.ics",
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
        resource: ["todo"],
        operation: ["getAll"],
      },
    },
    options: [
      {
        displayName: "Filter by Status",
        name: "status",
        type: "options",
        default: "",
        options: [
          {
            name: "All",
            value: "",
          },
          {
            name: "Needs Action",
            value: "NEEDS-ACTION",
          },
          {
            name: "In Progress",
            value: "IN-PROCESS",
          },
          {
            name: "Completed",
            value: "COMPLETED",
          },
          {
            name: "Cancelled",
            value: "CANCELLED",
          },
        ],
        description: "Filter todos by status",
      },
    ],
  },

  // =====================================
  // DELETE fields
  // =====================================
  {
    displayName: "Todo URL",
    name: "todoUrl",
    type: "string",
    default: "",
    required: true,
    displayOptions: {
      show: {
        resource: ["todo"],
        operation: ["delete"],
      },
    },
    description: "The full URL of the todo to delete",
    placeholder: "https://caldav.example.com/calendars/user/tasks/todo-123.ics",
  },
  {
    displayName: "ETag",
    name: "etag",
    type: "string",
    default: "",
    displayOptions: {
      show: {
        resource: ["todo"],
        operation: ["delete"],
      },
    },
    description:
      "The ETag of the todo (optional, but recommended to prevent conflicts)",
  },
];
