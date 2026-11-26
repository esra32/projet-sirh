// cypress/support/e2e.ts
// Import custom commands and global setup
import './commands';

// Prevent uncaught exception from failing tests (e.g. Angular zone errors in tests)
Cypress.on('uncaught:exception', (_err, _runnable) => false);
