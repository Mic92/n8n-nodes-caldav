import type { INodeProperties } from "n8n-workflow";

export const calendarOperations: INodeProperties[] = [
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ["calendar"],
      },
    },
    options: [
      {
        name: "Get All",
        value: "getAll",
        action: "Get all calendars",
        description: "Get all calendars from the CalDAV server",
      },
    ],
    default: "getAll",
  },
];

export const calendarFields: INodeProperties[] = [];
