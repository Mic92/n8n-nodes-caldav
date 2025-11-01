import { TEST_CREDENTIALS, generateTestUid, createTestCalendar, createEvent, updateEvent, deleteEvent } from "./helpers";
import { CalDavTrigger } from "../CalDavTrigger.node";

import type { IDataObject, IPollFunctions, INode } from "n8n-workflow";

// Mock IPollFunctions with workflow static data persistence
function createMockPollFunctions(
	parameters: { [key: string]: unknown } = {},
	staticData: IDataObject = {},
): IPollFunctions {
	return {
		getNodeParameter: (
			parameterName: string,
			fallbackValue?: unknown,
			options?: { extractValue?: boolean },
		) => {
			if (parameterName in parameters) {
				const value = parameters[parameterName];
				if (
					options?.extractValue &&
					value &&
					typeof value === "object" &&
					"value" in value
				) {
					return (value as { value: unknown }).value;
				}
				return value;
			}
			return fallbackValue;
		},
		getNode: () =>
			({
				name: "CalDAV Trigger Test",
				typeVersion: 1,
				type: "n8n-nodes-caldav.calDavTrigger",
				id: "test-trigger-id",
				position: [0, 0],
			}) as INode,
		getCredentials: async (type: string) => {
			if (type === "calDavApi") {
				return TEST_CREDENTIALS.calDavApi as IDataObject;
			}
			throw new Error(`Unknown credential type: ${type}`);
		},
		getWorkflowStaticData: () => staticData,
		getMode: () => "trigger" as const,
		helpers: {
			returnJsonArray: (items: IDataObject | IDataObject[]) => {
				const itemsArray = Array.isArray(items) ? items : [items];
				return itemsArray.map((item) => ({ json: item }));
			},
		} as IPollFunctions["helpers"],
		logger: {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as IPollFunctions["logger"],
	} as unknown as IPollFunctions;
}

describe("CalDavTrigger Integration Tests", () => {
	const triggerNode = new CalDavTrigger();

	beforeAll(async () => {
		// Wait for Radicale to be ready
		await new Promise((resolve) => setTimeout(resolve, 2000));
	});

	describe("Event Created Trigger", () => {
		it("should trigger on first poll with existing events", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-first-poll");

			const uid = generateTestUid("initial-event");
			const staticData: IDataObject = {};

			// Create an event before first poll
			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Initial Event",
				new Date(Date.now() + 3600000),
				new Date(Date.now() + 7200000),
			);

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventCreated",
				},
				staticData,
			);

			// First poll - should return the event
			const result = await triggerNode.poll.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result).toHaveLength(1);

			if (!result) throw new Error("Result is null");
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json.summary).toBe("Initial Event");

			// Verify ETag was stored
			expect(staticData.knownEvents).toBeDefined();
			expect((staticData.knownEvents as IDataObject)[uid]).toBeDefined();
		});

		it("should trigger on new events but not on existing events", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-new-events");

			const uid1 = generateTestUid("existing-event");
			const uid2 = generateTestUid("new-event");
			const staticData: IDataObject = {};

			// Create first event
			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid1,
				"Existing Event",
				new Date(Date.now() + 3600000),
				new Date(Date.now() + 7200000),
			);

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventCreated",
				},
				staticData,
			);

			// First poll - should return existing event
			const result1 = await triggerNode.poll.call(mockFunctions);
			expect(result1).toBeDefined();

			if (!result1) throw new Error("Result is null");
			expect(result1[0]).toHaveLength(1);

			// Create second event
			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid2,
				"New Event",
				new Date(Date.now() + 3600000),
				new Date(Date.now() + 7200000),
			);

			// Second poll - should only return new event
			const result2 = await triggerNode.poll.call(mockFunctions);
			expect(result2).toBeDefined();

			if (!result2) throw new Error("Result is null");
			expect(result2[0]).toHaveLength(1);
			expect(result2[0][0].json.summary).toBe("New Event");
			expect(result2[0][0].json.uid).toBe(uid2);
		});

		it("should not trigger when no new events exist", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-no-change");

			const uid = generateTestUid("no-change-event");
			const staticData: IDataObject = {};

			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Static Event",
				new Date(Date.now() + 3600000),
				new Date(Date.now() + 7200000),
			);

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventCreated",
				},
				staticData,
			);

			// First poll
			await triggerNode.poll.call(mockFunctions);

			// Second poll - no new events
			const result2 = await triggerNode.poll.call(mockFunctions);
			expect(result2).toBeNull();
		});
	});

	describe("Event Updated Trigger", () => {
		it("should trigger when event is updated", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-event-updated");

			const uid = generateTestUid("update-event");
			const staticData: IDataObject = {};

			// Create initial event
			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Original Summary",
				new Date(Date.now() + 3600000),
				new Date(Date.now() + 7200000),
			);

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventUpdated",
				},
				staticData,
			);

			// First poll - establishes baseline, should not trigger (event is new)
			const result1 = await triggerNode.poll.call(mockFunctions);
			expect(result1).toBeNull(); // eventUpdated doesn't trigger on new events

			// Update the event
			await updateEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Updated Summary",
				new Date(Date.now() + 3600000),
				new Date(Date.now() + 7200000),
			);

			// Second poll - should detect the update
			const result2 = await triggerNode.poll.call(mockFunctions);
			expect(result2).toBeDefined();

			if (!result2) throw new Error("Result is null");
			expect(result2[0]).toHaveLength(1);
			expect(result2[0][0].json.summary).toBe("Updated Summary");
		});

		it("should not trigger on new events", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-no-new-events");

			const uid = generateTestUid("new-no-trigger");
			const staticData: IDataObject = {};

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventUpdated",
				},
				staticData,
			);

			// First poll - no events
			await triggerNode.poll.call(mockFunctions);

			// Create a new event
			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Brand New Event",
				new Date(Date.now() + 3600000),
				new Date(Date.now() + 7200000),
			);

			// Second poll - should NOT trigger (event is new, not updated)
			const result = await triggerNode.poll.call(mockFunctions);
			expect(result).toBeNull();
		});
	});

	describe("Event Started Trigger", () => {
		it("should trigger when event starts within poll interval", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-event-started");

			const uid = generateTestUid("starting-event");
			const staticData: IDataObject = {};

			// Create event that starts in 1 second
			const startTime = new Date(Date.now() + 1000);
			const endTime = new Date(Date.now() + 3600000);

			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Starting Soon",
				startTime,
				endTime,
			);

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventStarted",
				},
				staticData,
			);

			// First poll - event hasn't started yet
			const result1 = await triggerNode.poll.call(mockFunctions);
			expect(result1).toBeNull();

			// Wait for event to start
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Second poll - event should have started
			const result2 = await triggerNode.poll.call(mockFunctions);
			expect(result2).toBeDefined();

			if (!result2) throw new Error("Result is null");
			expect(result2[0]).toHaveLength(1);
			expect(result2[0][0].json.summary).toBe("Starting Soon");
		});

		it("should expand recurring events into individual instances", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-recurring-expanded");

			const uid = generateTestUid("recurring-event");
			const staticData: IDataObject = {};

			// Create a recurring event that repeats daily for 3 days
			// Starting in 1 second
			const startTime = new Date(Date.now() + 1000);
			const endTime = new Date(startTime.getTime() + 3600000); // 1 hour duration

			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Daily Standup",
				startTime,
				endTime,
				"FREQ=DAILY;COUNT=3", // Recurs daily, 3 times
			);

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventStarted",
				},
				staticData,
			);

			// First poll - event hasn't started yet
			const result1 = await triggerNode.poll.call(mockFunctions);
			expect(result1).toBeNull();

			// Wait for first occurrence to start
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Second poll - should only get the first occurrence that has started
			// Not the master event with RRULE, but the expanded instance
			const result2 = await triggerNode.poll.call(mockFunctions);
			expect(result2).toBeDefined();

			if (!result2) throw new Error("Result is null");
			expect(result2[0]).toHaveLength(1);
			expect(result2[0][0].json.summary).toBe("Daily Standup");

			// Verify it's an expanded instance, not the master event
			// Expanded instances should not have RRULE
			expect(result2[0][0].json.rrule).toBeUndefined();
		});

		it("should trigger for event 10 minutes in the future when minutesBefore=10", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-with-offset");

			const uid = generateTestUid("offset-event");
			const staticData: IDataObject = {
				lastTimeChecked: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
			};

			// Create event that starts in 9 minutes 30 seconds
			// With minutesBefore=10, trigger time is 30 seconds ago (safely in the past)
			const startTime = new Date(Date.now() + 9.5 * 60 * 1000);
			const endTime = new Date(Date.now() + 11 * 60 * 1000);

			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Event in 10 Minutes",
				startTime,
				endTime,
			);

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventStarted",
					minutesBefore: 10,
				},
				staticData,
			);

			// Poll - event starts in 9.5 min, minutesBefore=10, so trigger time was 30s ago
			const result1 = await triggerNode.poll.call(mockFunctions);
			expect(result1).toBeDefined();

			if (!result1) throw new Error("Result is null");
			expect(result1[0]).toHaveLength(1);
			expect(result1[0][0].json.summary).toBe("Event in 10 Minutes");
		});
	});

	describe("ETag Cleanup", () => {
		it("should clean up ETags for deleted events", async () => {
			const testCalendarUrl = await createTestCalendar("trigger-cleanup");

			const uid = generateTestUid("cleanup-event");
			const staticData: IDataObject = {};

			// Create event
			await createEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
				"Temporary Event",
				new Date(Date.now() + 3600000),
				new Date(Date.now() + 7200000),
			);

			const mockFunctions = createMockPollFunctions(
				{
					calendar: {
						__rl: true,
						mode: "url",
						value: testCalendarUrl,
					},
					triggerOn: "eventCreated",
				},
				staticData,
			);

			// First poll - creates ETag entry
			await triggerNode.poll.call(mockFunctions);
			expect((staticData.knownEvents as IDataObject)[uid]).toBeDefined();

			// Delete event via helper
			await deleteEvent(
				testCalendarUrl,
				TEST_CREDENTIALS.calDavApi.username,
				TEST_CREDENTIALS.calDavApi.password,
				TEST_CREDENTIALS.calDavApi.serverUrl,
				uid,
			);

			// Second poll - should clean up the ETag
			await triggerNode.poll.call(mockFunctions);
			expect((staticData.knownEvents as IDataObject)[uid]).toBeUndefined();
		});
	});
});
