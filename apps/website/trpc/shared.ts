import superjson from 'superjson';

export const transformer = superjson;

export { type RouterInputs, type RouterOutputs } from '@ei/trpc';

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url

  return 'http://localhost:3000'; // dev SSR should use localhost
};

export const getApiUrl = () => `${getBaseUrl()}/api/trpc`;

export const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const { protocol, host } = window.location;
    const [hostname] = host.split(':');

    if (protocol === 'https:') {
      return `wss://ei.sweaties.net/ws`;
    }

    return `ws://${hostname}:5000/ws`;
  }

  return null; // When running in SSR, we aren't using subscriptions
};
