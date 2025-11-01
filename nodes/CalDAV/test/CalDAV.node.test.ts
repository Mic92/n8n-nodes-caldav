
import { TEST_CREDENTIALS, generateTestUid, generateISODateTime } from "../../../test/helpers";
import { CalDav } from "../CalDav.node";

import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from "n8n-workflow";

// Mock the execute functions context
function createMockExecuteFunctions(
	parameters: { [key: string]: unknown } = {},
): IExecuteFunctions {
	const items: INodeExecutionData[] = [{ json: {} }];

	return {
		getNodeParameter: (parameterName: string, _index: number, fallbackValue?: unknown) => {
			if (parameterName in parameters) {
				return parameters[parameterName];
			}
			return fallbackValue;
		},
		getNode: () =>
			({
				name: "CalDAV Test Node",
				typeVersion: 1,
				type: "n8n-nodes-caldav.calDav",
				id: "test-node-id",
				position: [0, 0],
			}) as INode,
		getCredentials: async (type: string) => {
			if (type === "calDavApi") {
				return TEST_CREDENTIALS.calDavApi as IDataObject;
			}
			throw new Error(`Unknown credential type: ${type}`);
		},
		getInputData: () => items,
		getWorkflowDataProxy: () => ({} as ReturnType<IExecuteFunctions["getWorkflowDataProxy"]>),
		helpers: {
			returnJsonArray: (items: IDataObject | IDataObject[]) => {
				const itemsArray = Array.isArray(items) ? items : [items];
				return itemsArray.map((item) => ({ json: item }));
			},
		} as IExecuteFunctions["helpers"],
		continueOnFail: () => false,
		logger: {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as IExecuteFunctions["logger"],
	} as unknown as IExecuteFunctions;
}

describe("CalDAV Integration Tests", () => {
	const caldavNode = new CalDav();
	let testCalendarUrl: string;
	let testEventUrl: string;
	let testTodoUrl: string;

	beforeAll(async () => {
		// Wait a bit for Radicale to be fully ready
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Set test calendar URL
		testCalendarUrl = `${TEST_CREDENTIALS.calDavApi.serverUrl}/test/calendar/`;
	});

	describe("Calendar Operations", () => {
		it("should get all calendars", async () => {
			const mockFunctions = createMockExecuteFunctions({
				resource: "calendar",
				operation: "getAll",
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result[0])).toBe(true);
			// Radicale creates default calendars, so we should have at least something
		});
	});

	describe("Event Operations", () => {
		it("should create a basic event", async () => {
			const uid = generateTestUid("event");
			const startTime = generateISODateTime(1);
			const endTime = generateISODateTime(2);

			const mockFunctions = createMockExecuteFunctions({
				resource: "event",
				operation: "create",
				calendar: {
					__rl: true,
					mode: "url",
					value: testCalendarUrl,
				},
				summary: "Test Event",
				start: startTime,
				end: endTime,
				additionalFields: {
					uid,
					description: "This is a test event",
					location: "Test Location",
				},
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const event = result[0][0].json;
			expect(event.summary).toBe("Test Event");
			expect(event.description).toBe("This is a test event");
			expect(event.location).toBe("Test Location");
			expect(event.url).toBeDefined();

			// Store for later tests
			testEventUrl = event.url as string;
		});

		it("should create an all-day event", async () => {
			const uid = generateTestUid("allday-event");
			const today = new Date().toISOString().split("T")[0];
			const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

			const mockFunctions = createMockExecuteFunctions({
				resource: "event",
				operation: "create",
				calendar: {
					__rl: true,
					mode: "url",
					value: testCalendarUrl,
				},
				summary: "All-Day Event",
				start: today,
				end: tomorrow,
				additionalFields: {
					uid,
					allDay: true,
				},
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const event = result[0][0].json;
			expect(event.summary).toBe("All-Day Event");
			expect(event.allDay).toBe(true);
		});

		it("should create a recurring event", async () => {
			const uid = generateTestUid("recurring-event");
			const startTime = generateISODateTime(1);
			const endTime = generateISODateTime(2);

			const mockFunctions = createMockExecuteFunctions({
				resource: "event",
				operation: "create",
				calendar: {
					__rl: true,
					mode: "url",
					value: testCalendarUrl,
				},
				summary: "Weekly Meeting",
				start: startTime,
				end: endTime,
				additionalFields: {
					uid,
					rrule: "FREQ=WEEKLY;COUNT=10",
				},
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const event = result[0][0].json;
			expect(event.summary).toBe("Weekly Meeting");
			expect(event.rrule).toBeDefined();
			expect(event.rrule).toContain("FREQ=WEEKLY");
		});

		it("should get all events from calendar", async () => {
			const mockFunctions = createMockExecuteFunctions({
				resource: "event",
				operation: "getAll",
				calendar: {
					__rl: true,
					mode: "url",
					value: testCalendarUrl,
				},
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(Array.isArray(result[0])).toBe(true);
			// Should have at least the events we created
			expect(result[0].length).toBeGreaterThan(0);
		});

		it("should update an event", async () => {
			if (!testEventUrl) {
				throw new Error("No test event URL - create event test must run first");
			}

			const mockFunctions = createMockExecuteFunctions({
				resource: "event",
				operation: "update",
				eventUrl: testEventUrl,
				updateFields: {
					summary: "Updated Test Event",
					description: "This event has been updated",
				},
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const event = result[0][0].json;
			expect(event.summary).toBe("Updated Test Event");
			expect(event.description).toBe("This event has been updated");
		});

		it("should delete an event", async () => {
			if (!testEventUrl) {
				throw new Error("No test event URL - create event test must run first");
			}

			const mockFunctions = createMockExecuteFunctions({
				resource: "event",
				operation: "delete",
				eventUrl: testEventUrl,
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const response = result[0][0].json;
			expect(response.success).toBe(true);
		});
	});

	describe("Todo Operations", () => {
		it("should create a todo", async () => {
			const uid = generateTestUid("todo");

			const mockFunctions = createMockExecuteFunctions({
				resource: "todo",
				operation: "create",
				calendar: {
					__rl: true,
					mode: "url",
					value: testCalendarUrl,
				},
				summary: "Test Todo",
				additionalFields: {
					uid,
					description: "This is a test todo",
					priority: 5,
				},
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const todo = result[0][0].json;
			expect(todo.summary).toBe("Test Todo");
			expect(todo.description).toBe("This is a test todo");
			expect(todo.priority).toBe(5);
			expect(todo.url).toBeDefined();

			// Store for later tests
			testTodoUrl = todo.url as string;
		});

		it("should update a todo", async () => {
			if (!testTodoUrl) {
				throw new Error("No test todo URL - create todo test must run first");
			}

			const mockFunctions = createMockExecuteFunctions({
				resource: "todo",
				operation: "update",
				todoUrl: testTodoUrl,
				updateFields: {
					summary: "Updated Todo",
					priority: 1,
				},
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const todo = result[0][0].json;
			expect(todo.summary).toBe("Updated Todo");
			expect(todo.priority).toBe(1);
		});

		it("should complete a todo", async () => {
			if (!testTodoUrl) {
				throw new Error("No test todo URL - create todo test must run first");
			}

			const mockFunctions = createMockExecuteFunctions({
				resource: "todo",
				operation: "update",
				todoUrl: testTodoUrl,
				updateFields: {
					completed: true,
					status: "COMPLETED",
				},
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const todo = result[0][0].json;
			expect(todo.completed).toBe(true);
			expect(todo.status).toBe("COMPLETED");
		});

		it("should delete a todo", async () => {
			if (!testTodoUrl) {
				throw new Error("No test todo URL - create todo test must run first");
			}

			const mockFunctions = createMockExecuteFunctions({
				resource: "todo",
				operation: "delete",
				todoUrl: testTodoUrl,
			});

			const result = await caldavNode.execute.call(mockFunctions);

			expect(result).toBeDefined();
			expect(result[0]).toHaveLength(1);
			const response = result[0][0].json;
			expect(response.success).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle invalid calendar URL", async () => {
			const mockFunctions = createMockExecuteFunctions({
				resource: "event",
				operation: "getAll",
				calendar: {
					__rl: true,
					mode: "url",
					value: "http://127.0.0.1:5232/nonexistent/calendar/",
				},
			});

			await expect(caldavNode.execute.call(mockFunctions)).rejects.toThrow();
		});

		it("should handle invalid event URL in update", async () => {
			const mockFunctions = createMockExecuteFunctions({
				resource: "event",
				operation: "update",
				eventUrl: "http://127.0.0.1:5232/test/calendar/nonexistent.ics",
				updateFields: {
					summary: "This should fail",
				},
			});

			await expect(caldavNode.execute.call(mockFunctions)).rejects.toThrow();
		});
	});
});
