/**
 * Freighter wallet integration helpers.
 */
import freighter from "@stellar/freighter-api";

export async function isFreighterInstalled(): Promise<boolean> {
  return freighter.isConnected();
}

export async function connectWallet(): Promise<string> {
  const connected = await freighter.isConnected();
  if (!connected) throw new Error("Freighter extension not installed");
  const { publicKey, error } = await freighter.getPublicKey();
  if (error) throw new Error(error);
  return publicKey;
}

export async function getPublicKey(): Promise<string | null> {
  try {
    const { publicKey, error } = await freighter.getPublicKey();
    if (error) return null;
    return publicKey;
  } catch {
    return null;
  }
}

export async function signTransaction(
  xdr: string,
  networkPassphrase: string
): Promise<string> {
  const { signedTxXdr, error } = await freighter.signTransaction(xdr, {
    networkPassphrase,
  });
  if (error) throw new Error(error);
  return signedTxXdr;
}
