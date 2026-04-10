import { SorobanRpc, Networks } from "@stellar/stellar-sdk";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.SOROBAN_RPC_URL ?? "http://localhost:8000/soroban/rpc";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE ?? Networks.TESTNET;

export const rpcServer = new SorobanRpc.Server(RPC_URL, { allowHttp: true });
export { NETWORK_PASSPHRASE };
