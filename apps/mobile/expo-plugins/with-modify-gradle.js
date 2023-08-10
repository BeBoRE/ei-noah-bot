/* eslint-disable no-param-reassign */
// This plugin is required for fixing `.apk` build issue
// It appends Expo and RN versions into the `build.gradle` file
// References:
// https://github.com/t3-oss/create-t3-turbo/issues/120
// https://github.com/expo/expo/issues/18129

/** @type {import("@expo/config-plugins").ConfigPlugin} */
const defineConfig = (config) =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires, implicit-arrow-linebreak, import/no-extraneous-dependencies
  require('@expo/config-plugins').withProjectBuildGradle(
    config,
    (gradleConfig) => {
      if (!gradleConfig.modResults.contents.includes('ext.getPackageJsonVersion =')) {
        gradleConfig.modResults.contents = gradleConfig.modResults.contents.replace(
          'buildscript {',
          `buildscript {
    ext.getPackageJsonVersion = { packageName ->
        new File(['node', '--print', "JSON.parse(require('fs').readFileSync(require.resolve('\${packageName}/package.json'), 'utf-8')).version"].execute(null, rootDir).text.trim())
    }`,
        );
      }

      if (!gradleConfig.modResults.contents.includes('reactNativeVersion =')) {
        gradleConfig.modResults.contents = gradleConfig.modResults.contents.replace(
          'ext {',
          `ext {
        reactNativeVersion = "\${ext.getPackageJsonVersion('react-native')}"`,
        );
      }

      if (!gradleConfig.modResults.contents.includes('expoPackageVersion =')) {
        gradleConfig.modResults.contents = gradleConfig.modResults.contents.replace(
          'ext {',
          `ext {
        expoPackageVersion = "\${ext.getPackageJsonVersion('expo')}"`,
        );
      }

      return gradleConfig;
    },
  );
module.exports = defineConfig;
