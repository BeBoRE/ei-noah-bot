// next.config.js

const { devDependencies } = require('./package.json');

const externalList = ['pg'];

// Mark all devDependencies + externalList as external to the server runtime
const externals = [
  ...Object.keys(devDependencies),
  ...externalList,
];

// Optional modules (must be listed manually)
const optionalModules = new Set([]);

const nextConfig = {
  reactStrictMode: true,

  transpilePackages: ['@ei/trpc', '@ei/drizzle', '@ei/lucia'],

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    /**
     * Required to allow external packages when using the App Router,
     * same as in your Webpack version.
     */
    serverComponentsExternalPackages: externalList,

    /**
     * Turbopack only: define module behavior
     */
    turbopack: {
      /**
       * Mark selected packages as external.
       * This replaces Webpack `externals`.
       */
      moduleMap: Object.fromEntries(
        externals.map((pkg) => [
          pkg,
          { external: true },
        ])
      ),

      /**
       * Optional-package-style ignoring.
       * Turbopack does not support IgnorePlugin, but we can mark these
       * modules external so Turbopack does not attempt to bundle them.
       */
      resolveModuleFallbacks: Object.fromEntries(
        [...optionalModules].map((pkg) => [
          pkg,
          { external: true },
        ])
      ),
    },
  },

  images: {
    domains: ['cdn.discordapp.com'],
  },
};

module.exports = nextConfig;
