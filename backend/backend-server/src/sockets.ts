import WebSocket, { WebSocketServer } from 'ws';

export const configSockets(app: Express) {
  return new WebSocketServer({ app })
}

