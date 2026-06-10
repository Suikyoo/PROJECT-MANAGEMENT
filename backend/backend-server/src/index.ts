import express from "express"
import { configRoutes } from "./routes.ts"
import { port } from "./lib/env/index.ts";
import { WebSocketServer } from 'ws';
import http from "http";
const app = express()

function main() {

  configRoutes(app);
  const server = http.createServer(app);
  const wss = new WebSocketServer({server, path: "/ws"})

  wss.on('connection', (ws) => {
    ws.on('message', msg => {
      console.log("someone reloaded");
      for (const client of wss.clients) {
        client.send(msg);
      }
    })
  });

  server.listen(port, () => {
    console.log(`server listening on port ${port}`)
  })
}

main();
