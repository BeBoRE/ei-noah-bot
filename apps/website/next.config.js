/**
 * @type {import('next').NextConfig}
 */

const { IgnorePlugin } = require('webpack');

// Mark our dev dependencies as externals so they don't get included in the webpack bundle.
const { devDependencies } = require('./package.json');
const externals = {};

for (const devDependency of Object.keys(devDependencies)) {
  externals[devDependency] = `commonjs ${devDependency}`;
}

// And anything MikroORM's packaging can be ignored if it's not on disk.
// Later we check these dynamically and tell webpack to ignore the ones we don't have.
const optionalModules = new Set([
  ...Object.keys(require('knex/package.json').browser),
  ...Object.keys(require('@mikro-orm/core/package.json').peerDependencies),
  ...Object.keys(require('@mikro-orm/core/package.json').devDependencies || {})
]);

module.exports = {
  reactStrictMode: true,
  transpilePackages: ["@ei/trpc", "@ei/database"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@mikro-orm/better-sqlite',
      '@mikro-orm/migrations',
      '@mikro-orm/entity-generator',
      '@mikro-orm/mariadb',
      '@mikro-orm/mongodb',
      '@mikro-orm/mysql',
      '@mikro-orm/seeder',
      '@mikro-orm/sqlite',
      '@vscode/sqlite3',
      'sqlite3',
      'better-sqlite3',
      'mysql',
      'mysql2',
      'oracledb',
      'pg',
      'pg-native',
      'pg-query-stream',
      'tedious',
      '@ei/database',
    ]
  },
  webpack: (config, {isServer}) => {
    config.plugins.push(
      new IgnorePlugin({
        checkResource: resource => {
          const baseResource = resource.split('/', resource[0] === '@' ? 2 : 1).join('/');
  
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
      })
    )

    config.externals = [
      ...config.externals,
      externals,
      {"pg": "commonjs pg"},
    ]
    

    return config;
  }
};
