export const environment = {
  production: false,
  // Proxied to http://localhost:8080 by proxy.conf.json (see angular.json
  // serve.options.proxyConfig) so requests stay same-origin and avoid CORS.
  apiBaseUrl: '/api/v2',
};
