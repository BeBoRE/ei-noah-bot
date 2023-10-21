import ip from 'ip';

// Get's the hosts ip when in development mode
export const getHost = () =>
  process.env.NODE_ENV === 'production'
    ? 'https://ei.sweaties.net'
    : `http://${ip.address(undefined, 'ipv4')}:5000`;
