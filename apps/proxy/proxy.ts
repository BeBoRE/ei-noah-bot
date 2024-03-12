import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const port = 5100;


if (process.env.NODE_ENV !== 'production') {
  // Proxy requests to http://localhost:3000/_next/webpack-hmr
  app.use(
    createProxyMiddleware('/_next/webpack-hmr', {
      target: 'http://localhost:3000/',
      prependPath: true,
      changeOrigin: true,
      ws: true,
      onProxyReq: (proxyReq, req) => {
        proxyReq.setHeader('Upgrade', req.headers.upgrade || '');
        proxyReq.setHeader('Connection', req.headers.connection || '');
        proxyReq.setHeader('Host', req.headers.host || '');
      },
    }),
  );
}

// Proxy WebSocket requests to http://localhost:3001
app.use(
  createProxyMiddleware('/ws', {
    target: 'http://localhost:3001',
    changeOrigin: true,
    ws: true,
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('Upgrade', req.headers.upgrade || '');
      proxyReq.setHeader('Connection', req.headers.connection || '');
      proxyReq.setHeader('Host', req.headers.host || '');
    },
  }),
);

// Proxy requests to http://localhost:3000
app.use(
  createProxyMiddleware('/', {
    target: 'http://localhost:3000',
    changeOrigin: true,
  }),
);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
