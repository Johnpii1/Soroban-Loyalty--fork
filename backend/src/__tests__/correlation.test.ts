import { createServer } from "http";
import { correlationMiddleware, correlationStorage, getCorrelationId } from "../correlation";
import { Request, Response, NextFunction } from "express";

function makeReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as Request;
  const responseHeaders: Record<string, string> = {};
  const res = {
    setHeader: (k: string, v: string) => { responseHeaders[k] = v; },
    _headers: responseHeaders,
  } as unknown as Response & { _headers: Record<string, string> };
  return { req, res };
}

describe("correlationMiddleware", () => {
  it("generates a UUID when x-request-id is absent", (done) => {
    const { req, res } = makeReqRes();
    correlationMiddleware(req, res, () => {
      const id = getCorrelationId();
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect((res as any)._headers["x-request-id"]).toBe(id);
      done();
    });
  });

  it("propagates existing x-request-id from request", (done) => {
    const { req, res } = makeReqRes({ "x-request-id": "my-trace-id" });
    correlationMiddleware(req, res, () => {
      expect(getCorrelationId()).toBe("my-trace-id");
      expect((res as any)._headers["x-request-id"]).toBe("my-trace-id");
      done();
    });
  });

  it("sets x-request-id response header", (done) => {
    const { req, res } = makeReqRes();
    correlationMiddleware(req, res, () => {
      expect((res as any)._headers["x-request-id"]).toBeDefined();
      done();
    });
  });

  it("isolates correlation IDs across concurrent requests", async () => {
    const ids: string[] = [];
    await Promise.all(
      ["id-A", "id-B"].map(
        (id) =>
          new Promise<void>((resolve) => {
            const { req, res } = makeReqRes({ "x-request-id": id });
            correlationMiddleware(req, res, () => {
              ids.push(getCorrelationId()!);
              resolve();
            });
          })
      )
    );
    expect(ids).toContain("id-A");
    expect(ids).toContain("id-B");
  });

  it("getCorrelationId returns undefined outside request context", () => {
    expect(getCorrelationId()).toBeUndefined();
  });
});
