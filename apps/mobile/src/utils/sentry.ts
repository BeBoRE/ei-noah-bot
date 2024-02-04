import * as Sentry from '@sentry/react-native';

// Construct a new instrumentation instance. This is needed to communicate between the integration and React
export const routingInstrumentation =
  new Sentry.ReactNavigationInstrumentation();
