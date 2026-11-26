export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api',
  supersetDashboardUrl: 'http://localhost:8088/superset/dashboard/2/',
  dbtDocsUrl: 'http://localhost:8086',
  airflowUrl: 'http://localhost:8085',
  keycloak: {
    enabled: true,
    url: 'http://localhost:8084',
    realm: 'myrealm',
    clientId: 'frontend-app',
  },
  geminiApiKey: '' // Removed secret from source. Use backend proxy or environment-specific variable.
};
