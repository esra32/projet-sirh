/// <reference types="cypress" />

describe('Login flow', () => {
  beforeEach(() => {
    localStorage.clear();
    cy.visit('/auth/login');
  });

  it('renders the login form', () => {
    cy.get('form').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.get('button[type="submit"]').should('exist');
  });

  it('submit button is disabled when form is empty', () => {
    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('submit button becomes enabled with valid credentials', () => {
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').should('not.be.disabled');
  });

  it('shows error message on failed login', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 401,
      body: { message: 'Identifiants incorrects' },
    }).as('loginFail');

    cy.get('input[type="email"]').type('wrong@test.com');
    cy.get('input[type="password"]').type('badpassword');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginFail');
    cy.get('.hint').should('contain', 'Identifiants incorrects');
  });

  it('redirects to /employee on successful login', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        accessToken: buildFakeToken({ sub: 'user@test.com', roles: ['EMPLOYEE'] }),
        refreshToken: buildFakeToken({ sub: 'user@test.com', type: 'refresh' }),
      },
    }).as('loginSuccess');

    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginSuccess');
    cy.url().should('include', '/employee');
  });

  it('preserves redirectTo and navigates there after login', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        accessToken: buildFakeToken({ sub: 'user@test.com', roles: ['EMPLOYEE'] }),
        refreshToken: buildFakeToken({ sub: 'user@test.com', type: 'refresh' }),
      },
    }).as('loginOk');

    cy.visit('/auth/login?redirectTo=/employee/profile');
    cy.get('input[type="email"]').type('user@test.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.wait('@loginOk');
    cy.url().should('include', '/employee/profile');
  });
});

function buildFakeToken(payload: Record<string, unknown>): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = btoa(JSON.stringify({ exp, ...payload }));
  return `eyJhbGciOiJIUzI1NiJ9.${body.replace(/=/g, '')}.fakesig`;
}
