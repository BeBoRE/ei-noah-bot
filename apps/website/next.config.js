const { IgnorePlugin } = require('webpack');

// Mark our dev dependencies as externals so they don't get included in the webpack bundle.
const { devDependencies } = require('./package.json');
const externals = {};

const externalList = ['pg', '@discordjs/rest'];

for (const devDependency of Object.keys(devDependencies)) {
  externals[devDependency] = `commonjs ${devDependency}`;
}

externalList.forEach((external) => {
  externals[external] = `commonjs ${external}`;
});

// And anything MikroORM's packaging can be ignored if it's not on disk.
// Later we check these dynamically and tell webpack to ignore the ones we don't have.
const optionalModules = new Set([]);

/**
 * @type {import('next').NextConfig}
 */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@ei/trpc', '@ei/drizzle', '@ei/lucia'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: externalList,
  },
  images: {
    domains: ['cdn.discordapp.com'],
  },
  webpack: (config) => {
    config.plugins.push(
      new IgnorePlugin({
        checkResource: (resource) => {
          const baseResource = resource
            .split('/', resource[0] === '@' ? 2 : 1)
            .join('/');

          if (optionalModules.has(baseResource)) {
            try {
              require.resolve(resource);
              return false;
            } catch {
              return true;
            }
          }

          return false;
        },
      }),
    );

    config.externals = [...config.externals, externals];

    return config;
  },
};
