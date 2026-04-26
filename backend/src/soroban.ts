import { SorobanRpc, Networks } from "@stellar/stellar-sdk";
import dotenv from "dotenv";
import { getCorrelationId } from "./correlation";

dotenv.config();

const RPC_URL = process.env.SOROBAN_RPC_URL ?? "http://localhost:8000/soroban/rpc";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;

const _rpcServer = new SorobanRpc.Server(RPC_URL, { allowHttp: true });

/**
 * Proxy that injects X-Request-ID into every RPC call's fetch options
 * by wrapping each method to set the header via the server's fetch override.
 */
export const rpcServer: SorobanRpc.Server = new Proxy(_rpcServer, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value !== "function") return value;
    return function (...args: unknown[]) {
      const id = getCorrelationId();
      if (id) {
        // SorobanRpc.Server uses a custom fetch; inject header via global fetch override scoped to this call
        const origFetch = (target as any)._fetch ?? globalThis.fetch;
        (target as any)._fetch = (url: string, init: RequestInit = {}) => {
          const headers = new Headers(init.headers);
          headers.set("x-request-id", id);
          return origFetch(url, { ...init, headers });
        };
      }
      return (value as Function).apply(target, args);
    };
  },
});

export { NETWORK_PASSPHRASE };
