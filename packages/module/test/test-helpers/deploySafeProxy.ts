import { ZeroAddress, ZeroHash } from "ethers";
import {
  ArtifactGnosisSafe,
  ArtifactGnosisSafeProxy,
  ArtifactGnosisSafeProxyFactory,
} from "./artifacts";

import {
  encodeAbiParameters,
  parseAbiParameters,
  encodeFunctionData,
  keccak256,
  concat,
  getContractAddress,
} from "viem";

export default async function deploySafeProxy(
  factory: `0x${string}`,
  mastercopy: `0x${string}`,
  owner: string,
  deployer: any
): Promise<string> {
  const initializer = calculateInitializer(owner);

  const data = encodeFunctionData({
    abi: ArtifactGnosisSafeProxyFactory.abi,
    functionName: "createProxyWithNonce",
    args: [mastercopy, initializer, ZeroHash],
  });

  await deployer.sendTransaction({
    to: factory,
    data,
  });

  return calculateProxyAddress(initializer, factory, mastercopy);
}

function calculateInitializer(owner: string): `0x${string}` {
  const initializer = encodeFunctionData({
    abi: ArtifactGnosisSafe.abi,
    functionName: "setup",
    args: [
      [owner], // owners
      1, // threshold
      ZeroAddress, // to - for setupModules
      "0x", // data - for setupModules
      ZeroAddress, // fallbackHandler
      ZeroAddress, // paymentToken
      0, // payment
      ZeroAddress, // paymentReceiver
    ],
  });

  return initializer;
}

function calculateProxyAddress(
  initializer: `0x${string}`,
  factory: `0x${string}`,
  mastercopy: `0x${string}`
): string {
  const salt = keccak256(
    concat([keccak256(initializer), ZeroHash as `0x${string}`])
  );

  const encode = encodeAbiParameters(parseAbiParameters("address"), [
    mastercopy,
  ]);

  const deploymentData = concat([
    ArtifactGnosisSafeProxy.bytecode as `0x${string}`,
    encode,
  ]);

  const address = getContractAddress({
    bytecode: deploymentData,
    from: factory,
    opcode: "CREATE2",
    salt: salt,
  });

  return address;
}
