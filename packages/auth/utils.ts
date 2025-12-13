import ip from 'ip';

// Get's the hosts ip when in development mode
export const getHost = () =>
  process.env.NODE_ENV === 'production'
    ? process.env.PUBLIC_VERCEL_URL || 'https://ei-noah.com'
    : `http://${ip.address(undefined, 'ipv4')}:5100`;

console.log('Redirect host is', getHost());
