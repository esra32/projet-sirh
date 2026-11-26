/// <reference types="cypress" />

describe('Employee Dashboard (authenticated)', () => {
  beforeEach(() => {
    cy.loginAs('EMPLOYEE');
    cy.visit('/employee/dashboard');
  });

  it('shows three dashboard cards', () => {
    cy.get('.card').should('have.length', 3);
  });

  it('shows Opportunites card', () => {
    cy.contains('Opportunites').should('be.visible');
  });

  it('shows Mes candidatures card', () => {
    cy.contains('candidatures').should('be.visible');
  });

  it('shows News card', () => {
    cy.contains('News').should('be.visible');
  });
});

describe('Auth guard redirect', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects unauthenticated user from /employee to /auth/login', () => {
    cy.visit('/employee/dashboard');
    cy.url().should('include', '/auth/login');
  });

  it('passes redirectTo query param when redirecting', () => {
    cy.visit('/employee/profile');
    cy.url().should('include', 'redirectTo=%2Femployee%2Fprofile');
  });
});
