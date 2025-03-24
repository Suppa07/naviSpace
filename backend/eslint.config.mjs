import globals from "globals";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import pluginJest from "eslint-plugin-jest";

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ["**/*.js"],
        ignores: ["**/test/**"],
        languageOptions: {
            sourceType: "commonjs",
            globals: { ...globals.node, ...globals.browser }
        }
    },
    {
        files: ["**/*.mjs"],
        ignores: ["**/test/**"],
        languageOptions: {
            sourceType: "module",
            globals: { ...globals.node, ...globals.browser }
        }
    },
    {
        files: ['**/*.spec.js', '**/*.test.js'],
        plugins: { jest: pluginJest },
        languageOptions: {
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                ...globals.browser,
                ...pluginJest.environments.globals.globals
            }
        },
        rules: {
            'jest/no-disabled-tests': 'warn',
            'jest/no-focused-tests': 'error',
            'jest/no-identical-title': 'error',
            'jest/prefer-to-have-length': 'warn',
            'jest/valid-expect': 'error',
        }
    },
    pluginJs.configs.recommended,
    eslintConfigPrettier,
    {
        files: ["**/*.{js,mjs}"],
        ignores: ["**/test/**"],
        rules: {
            "no-unused-vars": ["error", {
                "argsIgnorePattern": "^(err|error)$",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^(err|error)$"
            }],
        },
    },
];