import { SorobanRpc } from "@stellar/stellar-sdk";
import { env } from "./env";

export const rpcServer = new SorobanRpc.Server(env.SOROBAN_RPC_URL, { allowHttp: true });
export const NETWORK_PASSPHRASE = env.NETWORK_PASSPHRASE;
