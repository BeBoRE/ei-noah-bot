/* eslint-disable import/no-extraneous-dependencies */
/// <reference types="vitest" />
import { loadEnv } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';
import GithubActionsReporter from 'vitest-github-actions-reporter';
import 'dotenv';

export default defineConfig({
  test: {
    environment: 'node',
    env: Object.assign(process.env, loadEnv('test', './', '')),
    globals: true,
    exclude: [...configDefaults.exclude, '**/e2e/**'],
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', new GithubActionsReporter()]
      : ['default'],
  },
});
