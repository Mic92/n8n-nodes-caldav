const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const n8nNodesBase = require("eslint-plugin-n8n-nodes-base");
const importPlugin = require("eslint-plugin-import-x");
const prettierConfig = require("eslint-config-prettier");
const js = require("@eslint/js");

module.exports = [
  {
    ignores: ["node_modules/**", "dist/**", "n8n/**", "**/*.d.ts"],
  },
  // ESLint recommended rules
  js.configs.recommended,
  // TypeScript files
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "n8n-nodes-base": n8nNodesBase,
      "import-x": importPlugin,
    },
    rules: {
      // TypeScript ESLint recommended with type checking
      ...tsPlugin.configs["recommended-type-checked"].rules,

      // n8n community rules
      ...n8nNodesBase.configs.community.rules,

      // Import organization
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import-x/no-cycle": "warn",

      // Custom overrides
      "no-console": "warn",
      "no-undef": "off", // TypeScript handles this better
      eqeqeq: ["error", "always", { null: "ignore" }],
      curly: ["error", "all"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      // Disable rules that conflict with Prettier
      ...prettierConfig.rules,
    },
  },
  // Test files
  {
    files: ["test/**/*.ts", "**/*.test.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
];
