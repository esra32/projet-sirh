/// <reference types="cypress" />

/** Inject a fake JWT session directly into localStorage to bypass the login UI. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

Cypress.Commands.add('loginAs', (role: string) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = fakeJwt({ sub: `${role.toLowerCase()}@test.com`, roles: [role], exp });
  localStorage.setItem('sirh_access_token', token);
  localStorage.setItem('sirh_refresh_token', fakeJwt({ sub: `${role.toLowerCase()}@test.com`, type: 'refresh', exp }));
});

// Declare the custom command type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Injects a fake JWT session into localStorage for the given role,
       * bypassing the login form in tests that assume an authenticated user.
       */
      loginAs(role: 'EMPLOYEE' | 'MANAGER' | 'RH_ADMIN'): void;
    }
  }
}

export {};
