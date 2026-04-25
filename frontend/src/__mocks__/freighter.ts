const freighter = {
  isConnected: jest.fn().mockResolvedValue(true),
  getPublicKey: jest.fn().mockResolvedValue({ publicKey: "GABC1234", error: null }),
  signTransaction: jest.fn().mockResolvedValue({ signedTxXdr: "xdr", error: null }),
};
export default freighter;
