import { request } from "http";

import { createDAVClient } from "tsdav";

import { TEST_CREDENTIALS, generateTestUid } from "../../../test/helpers";

export { TEST_CREDENTIALS, generateTestUid };

/**
 * Create a unique test calendar using an identifier
 * Returns the calendar URL
 */
export async function createTestCalendar(identifier: string): Promise<string> {
  const url = `${TEST_CREDENTIALS.calDavApi.serverUrl}/test/${identifier}/`;
  const { username, password } = TEST_CREDENTIALS.calDavApi;

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:set>
    <D:prop>
      <D:displayname>Test Calendar</D:displayname>
      <C:calendar-description>Calendar for integration tests</C:calendar-description>
      <C:supported-calendar-component-set>
        <C:comp name="VEVENT"/>
        <C:comp name="VTODO"/>
      </C:supported-calendar-component-set>
    </D:prop>
  </D:set>
</C:mkcalendar>`;

    const req = request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: "MKCALENDAR",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        if (
          res.statusCode === 201 ||
          res.statusCode === 405 ||
          res.statusCode === 409
        ) {
          // 201 = created, 405/409 = already exists
          resolve(url);
        } else {
          let errorBody = "";
          res.on("data", (chunk) => {
            errorBody += chunk;
          });
          res.on("end", () => {
            reject(
              new Error(
                `Failed to create calendar: ${res.statusCode} - ${errorBody}`,
              ),
            );
          });
        }
      },
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Create an event directly via DAV client
 */
export async function createEvent(
  calendarUrl: string,
  username: string,
  password: string,
  serverUrl: string,
  uid: string,
  summary: string,
  start: Date,
  end: Date,
  rrule?: string,
): Promise<void> {
  const client = await createDAVClient({
    serverUrl,
    credentials: { username, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  const rruleLine = rrule ? `RRULE:${rrule}\n` : "";
  const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//n8n//CalDAV Node Test//EN
BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
DTSTART:${start
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")}
DTEND:${end
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")}
${rruleLine}END:VEVENT
END:VCALENDAR`;

  await client.createCalendarObject({
    calendar: { url: calendarUrl },
    filename: `${uid}.ics`,
    iCalString: ical,
  });
}

/**
 * Update an event via DAV client
 */
export async function updateEvent(
  calendarUrl: string,
  username: string,
  password: string,
  serverUrl: string,
  uid: string,
  summary: string,
  start: Date,
  end: Date,
): Promise<void> {
  const client = await createDAVClient({
    serverUrl,
    credentials: { username, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//n8n//CalDAV Node Test//EN
BEGIN:VEVENT
UID:${uid}
SUMMARY:${summary}
DTSTART:${start
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")}
DTEND:${end
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")}
END:VEVENT
END:VCALENDAR`;

  await client.updateCalendarObject({
    calendarObject: {
      url: `${calendarUrl}${uid}.ics`,
      data: ical,
    },
  });
}

/**
 * Delete an event via DAV client
 */
export async function deleteEvent(
  calendarUrl: string,
  username: string,
  password: string,
  serverUrl: string,
  uid: string,
): Promise<void> {
  const client = await createDAVClient({
    serverUrl,
    credentials: { username, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  await client.deleteCalendarObject({
    calendarObject: {
      url: `${calendarUrl}${uid}.ics`,
      etag: "",
    },
  });
}
