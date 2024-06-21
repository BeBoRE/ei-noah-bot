import "./global.css";

import 'expo-dev-client';
import 'expo-router/entry';

import { setStatusBarStyle } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { routingInstrumentation } from 'src/utils/sentry';

TimeAgo.addDefaultLocale(en);

setStatusBarStyle('light');

Sentry.init({
  dsn: 'https://a61be6134ba50fc932e77ea490f84295@o4505674660380672.ingest.sentry.io/4506689386840064',
  debug: process.env.NODE_ENV !== 'production',
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
    }),
  ],
});
