/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@stellar/freighter-api$": "<rootDir>/src/__mocks__/freighter.ts",
    "^@stellar/stellar-sdk$": "<rootDir>/src/__mocks__/stellar-sdk.ts",
  },
  testMatch: ["**/__tests__/**/*.test.tsx"],
};

module.exports = config;
