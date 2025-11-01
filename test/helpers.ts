/**
 * Test helper functions for CalDAV integration tests
 */

export const TEST_CREDENTIALS = {
	calDavApi: {
		serverUrl: "http://127.0.0.1:5232",
		username: "test",
		password: "test",
	},
};

/**
 * Generate a unique UID for test events/todos
 */
export function generateTestUid(prefix: string = "test"): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@n8n-test`;
}

/**
 * Generate ISO datetime string for tests
 */
export function generateISODateTime(
	hoursFromNow: number = 0,
): string {
	const date = new Date();
	date.setHours(date.getHours() + hoursFromNow);
	return date.toISOString();
}

/**
 * Generate ISO date string (YYYY-MM-DD) for all-day events
 */
export function generateISODate(daysFromNow: number = 0): string {
	const date = new Date();
	date.setDate(date.getDate() + daysFromNow);
	return date.toISOString().split("T")[0];
}

/**
 * Create a test calendar URL
 */
export function getTestCalendarUrl(calendarName: string = "test-calendar"): string {
	return `http://127.0.0.1:5232/test/${calendarName}/`;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeout: number = 5000,
	interval: number = 100,
): Promise<void> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Sample event data for tests
 */
export const SAMPLE_EVENT = {
	summary: "Test Event",
	start: generateISODateTime(1),
	end: generateISODateTime(2),
	description: "This is a test event",
	location: "Test Location",
};

/**
 * Sample all-day event data for tests
 */
export const SAMPLE_ALLDAY_EVENT = {
	summary: "All Day Event",
	start: generateISODate(1),
	end: generateISODate(2),
	allDay: true,
};

/**
 * Sample recurring event data for tests
 */
export const SAMPLE_RECURRING_EVENT = {
	summary: "Weekly Meeting",
	start: generateISODateTime(1),
	end: generateISODateTime(2),
	rrule: "FREQ=WEEKLY;COUNT=10",
};

/**
 * Sample todo data for tests
 */
export const SAMPLE_TODO = {
	summary: "Test Todo",
	description: "This is a test todo",
	priority: 5,
};
