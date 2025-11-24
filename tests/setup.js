/**
 * Test Setup Configuration
 */

// Global test configuration  
// Use built-in fetch for Node 18+, fallback for older versions
if (!global.fetch) {
  const { default: fetch } = require('node-fetch');
  global.fetch = fetch;
}

// Set test timeout to 30 seconds for integration tests
jest.setTimeout(30000);

// Suppress console logs during tests unless debugging
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: () => {}, // Suppress console.log
  warn: originalConsole.warn,
  error: originalConsole.error,
  info: originalConsole.info,
  debug: () => {}, // Suppress console.debug
};