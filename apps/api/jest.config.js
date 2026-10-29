/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',

  // Run tests as native ESM so that NestJS 12 (pure ESM) can be imported.
  // Requires:  node --experimental-vm-modules <jest-bin> (see test script).
  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        useESM: true,
        diagnostics: { warnOnly: true },
      },
    ],
  },

  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],

  moduleNameMapper: {
    // Strip the .js extension that NodeNext adds to relative imports in ESM output.
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@taskforge/shared$': '<rootDir>/../../packages/shared/dist/index.js',
  },

  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/main.ts', '!src/**/*.module.ts'],
  coverageDirectory: '../../coverage/apps-api',
  setupFilesAfterEnv: [],
};
