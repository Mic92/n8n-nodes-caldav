import type { IDataObject } from "n8n-workflow";

export interface ICalDavCredentials extends IDataObject {
  serverUrl: string;
  username: string;
  password: string;
}

export interface IEvent extends IDataObject {
  uid: string;
  summary: string;
  start: string;
  end: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  rrule?: string;
  attendees?: string[];
  url?: string;
  etag?: string;
}

export interface ITodo extends IDataObject {
  uid: string;
  summary: string;
  due?: string;
  completed?: boolean;
  description?: string;
  priority?: number;
  status?: string;
  url?: string;
  etag?: string;
}

export interface ICalendar extends IDataObject {
  url: string;
  displayName: string;
  description?: string;
  timezone?: string;
  ctag?: string;
  syncToken?: string;
  components?: string[];
}
