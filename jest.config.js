module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/*.test.ts"],
	testPathIgnorePatterns: ["/node_modules/", "/dist/"],
	collectCoverageFrom: ["nodes/**/*.ts", "credentials/**/*.ts"],
	coveragePathIgnorePatterns: ["/node_modules/", "/dist/", "/test/"],
	globalSetup: "<rootDir>/test/globalSetup.ts",
	globalTeardown: "<rootDir>/test/globalTeardown.ts",
	setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: {
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
				},
			},
		],
	},
	testTimeout: 30000,
	verbose: true,
};
