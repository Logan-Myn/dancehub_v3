module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFiles: ['dotenv/config'],
  projects: [
    {
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/api/**/*.test.ts', '<rootDir>/__tests__/storage/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      setupFiles: ['dotenv/config'],
    },
    {
      displayName: 'lib',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/lib/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      setupFiles: ['dotenv/config'],
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/__tests__/components/**/*.test.tsx'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest-dom.ts'],
    },
  ],
};
