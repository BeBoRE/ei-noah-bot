import './global.css';
import 'expo-dev-client';
import 'expo-router/entry';

import { setStatusBarStyle } from 'expo-status-bar';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';

TimeAgo.addDefaultLocale(en);

setStatusBarStyle('light');
