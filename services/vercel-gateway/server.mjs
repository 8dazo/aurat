import { createServer } from 'node:http';
import gateway from './index.mjs';

const port = Number(process.env.PORT ?? 3000);
createServer(gateway).listen(port, '127.0.0.1', () => {
  console.log(`Aurat gateway listening on http://127.0.0.1:${port}`);
});
