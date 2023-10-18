import { Signer, Wallet } from "ethers";
import { WalletClient } from "viem";

export const types = {
  Will: [
    { name: "heir", type: "address" },
    { name: "safe", type: "address" }, // Added safe
    { name: "nonce", type: "uint256" },
  ],
};

export const sign = async (
  walletClient: WalletClient,
  moduleAddress: `0x${string}`,
  accountAddress: `0x${string}`,
  safeAddress: `0x${string}`, // Added safe
  heir: `0x${string}`,
  nonce: bigint
) => {
  const domain = {
    name: "AllHailHades",
    version: "0.1.0",
    chainId: await walletClient.getChainId(), // Use the appropriate chainId; 1 for Ethereum Mainnet
    verifyingContract: moduleAddress, // Replace with your deployed contract's address
  } as const;

  const message = {
    heir: heir,
    safe: safeAddress, // Added safe
    nonce: nonce,
  } as const;

  console.log({
    domain,
    message,
    primaryType: "Will",
    types,
    account: accountAddress,
  });
  console.log(types);

  return walletClient.signTypedData({
    domain,
    message,
    primaryType: "Will",
    types,
    account: accountAddress,
  });
};

export const signEthers = async (
  walletClient: Signer,
  moduleAddress: `0x${string}`,
  accountAddress: `0x${string}`,
  safeAddress: `0x${string}`, // Added safe
  heir: `0x${string}`,
  nonce: bigint
) => {
  const domain = {
    name: "AllHailHades",
    version: "0.1.0",
    chainId: 31337, // Use the appropriate chainId; 1 for Ethereum Mainnet
    verifyingContract: moduleAddress, // Replace with your deployed contract's address
  };

  const message = {
    heir: heir,
    safe: safeAddress, // Added safe
    nonce: nonce.toString(),
  };

  return walletClient.signTypedData(domain, types, message);
};
