const http = require('http');
const net = require('net');

const TARGET_PORT = 3000;
const LISTEN_PORT = 5173;

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${TARGET_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy connecting to Next.js on port 3000 failed: ' + err.message);
  });

  req.pipe(proxyReq, { end: true });
});

// Support WebSocket upgrades for Next.js HMR (Hot Module Reloading)
server.on('upgrade', (req, clientSocket, head) => {
  const srvSocket = net.connect(TARGET_PORT, '127.0.0.1', () => {
    clientSocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
      Object.entries(req.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    if (head && head.length) srvSocket.write(head);
    srvSocket.pipe(clientSocket);
    clientSocket.pipe(srvSocket);
  });

  srvSocket.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => srvSocket.destroy());
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`Port bridge active: http://localhost:${LISTEN_PORT} -> http://localhost:${TARGET_PORT}`);
});
