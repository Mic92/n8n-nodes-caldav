// Per-test setup
// This runs after globalSetup and before each test file

// Extend timeout for integration tests
jest.setTimeout(30000);

// Add custom matchers if needed
expect.extend({
	toHaveValidICalendar(received: string) {
		const hasBegin = received.includes("BEGIN:VCALENDAR");
		const hasEnd = received.includes("END:VCALENDAR");
		const hasVersion = received.includes("VERSION:2.0");

		const pass = hasBegin && hasEnd && hasVersion;

		return {
			pass,
			message: () =>
				pass
					? `Expected not to be valid iCalendar format`
					: `Expected valid iCalendar format with BEGIN:VCALENDAR, END:VCALENDAR, and VERSION:2.0`,
		};
	},
});
