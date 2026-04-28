import express from "express";
import { createServer, Server } from "http";
import { AddressInfo } from "net";

const SHUTDOWN_TIMEOUT_MS = 10_000;

describe("graceful shutdown logic", () => {
  let server: Server;
  let port: number;

  beforeAll((done) => {
    const app = express();
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", uptime: 1 });
    });
    app.get("/slow", async (_req, res) => {
      await new Promise((r) => setTimeout(r, 2000));
      res.json({ ok: true });
    });

    server = createServer(app).listen(0, () => {
      port = (server.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    server.close(() => done());
  });

  it("serves /health", async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    await res.json();
  });

  it("shuts down within the 10s timeout after server.close()", async () => {
    let closeEmitted = false;

    server.on("close", () => {
      closeEmitted = true;
    });

    const serverClosePromise = new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
    }, SHUTDOWN_TIMEOUT_MS);

    await serverClosePromise;
    clearTimeout(timeout);

    server.closeAllConnections();

    expect(timedOut).toBe(false);
    expect(closeEmitted).toBe(true);
  });
});
