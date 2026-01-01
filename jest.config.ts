import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: [
    "controllers/**/*.ts",
    "services/**/*.ts",
    "middlewares/**/*.ts",
    "routes/**/*.ts",
    "!**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  testTimeout: 10000,
};

export default config;
