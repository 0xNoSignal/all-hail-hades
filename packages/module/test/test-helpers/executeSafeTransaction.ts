import { WalletClient } from "viem";
import { ISafe$Type } from "../../artifacts/contracts/test/ISafe.sol/ISafe";
import { ZeroAddress } from "ethers";

export default async function execSafeTransaction(
  safe: any,
  { to, data, value = 0 }: any,
  signer: WalletClient,
  accountAddress: `0x${string}`
) {
  const address = safe.address;
  const chainId = signer.chain?.id as number;
  const nonce = 0;

  const { domain, types, message, primaryType } = paramsToSign(
    address,
    chainId,
    { to, data, value },
    nonce
  );

  const signature = await signer.signTypedData({
    domain,
    types,
    message,
    primaryType,
    account: accountAddress,
  });

  return safe.write.execTransaction([
    to as string,
    value as number | bigint,
    data as string,
    0, // operation
    0,
    0,
    0,
    ZeroAddress,
    ZeroAddress,
    signature,
  ]);
}

function paramsToSign(
  address: `0x${string}`,
  chainId: number,
  { to, data, value }: any,
  nonce: bigint | number
) {
  const domain = { verifyingContract: address, chainId };
  const primaryType = "SafeTx" as const;
  const types = {
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  };
  const message = {
    to,
    value,
    data,
    operation: 0,
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: 0,
    gasToken: ZeroAddress,
    refundReceiver: ZeroAddress,
    nonce,
  };

  return { domain, primaryType, types, message };
}
