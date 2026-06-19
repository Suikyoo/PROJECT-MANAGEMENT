import express from "express"
import { configRoutes } from "./routes.ts"
import { port } from "./lib/env/index.ts";
import { WebSocketServer } from 'ws';
import http from "http";
import { startDailyScheduler, stopDailyScheduler } from "./lib/notifications/scheduler.ts";
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

  // Start daily 7am task breakdown email scheduler
  startDailyScheduler();

  // Graceful shutdown
  const shutdown = () => {
    console.log("[server] Shutting down...");
    stopDailyScheduler();
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
