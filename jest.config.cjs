module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/setup.ts"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}"]
}
