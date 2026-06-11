import { WebSocketServer } from 'ws';
import type { Express } from 'express';

export function configSockets(app: Express) {
  return new WebSocketServer({ server: (app as any).server, path: '/ws' });
}

