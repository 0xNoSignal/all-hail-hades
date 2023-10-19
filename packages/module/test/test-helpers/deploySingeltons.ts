import { keccak256, getContractAddress } from "viem";
import {
  getSingletonFactoryInfo,
  SingletonFactoryInfo,
} from "@safe-global/safe-singleton-factory";
import { parseUnits } from "viem";

import {
  AllHailHades,
  ArtifactGnosisSafe,
  ArtifactGnosisSafeProxyFactory,
} from "./artifacts";
import { ZeroHash } from "ethers";

export default async function deploySingletons(deployer: any) {
  const factoryAddress = await deploySingletonFactory(deployer);

  const safeMastercopyAddress = await deploySingleton(
    factoryAddress,
    ArtifactGnosisSafe.bytecode as `0x${string}`,
    deployer
  );

  const safeProxyFactoryAddress = await deploySingleton(
    factoryAddress,
    ArtifactGnosisSafeProxyFactory.bytecode as `0x${string}`,
    deployer
  );

  const allHailHadesModule = await deploySingleton(
    factoryAddress,
    AllHailHades.bytecode as `0x${string}`,
    deployer
  );

  return {
    safeMastercopyAddress,
    safeProxyFactoryAddress,
    allHailHadesModule,
  };
}

async function deploySingletonFactory(signer: any) {
  if (!signer.account) {
    throw new Error("Signer must have an account");
  }
  const chainId = await signer.getChainId();
  const { address, signerAddress, transaction } = getSingletonFactoryInfo(
    Number(chainId)
  ) as SingletonFactoryInfo;

  // fund the presined transaction signer
  await signer.sendTransaction({
    value: parseUnits("1", 18),
    to: signerAddress,
  });

  return address as `0x${string}`;
}

async function deploySingleton(
  factory: `0x${string}`,
  bytecode: `0x${string}`,
  signer: any
) {
  const salt = ZeroHash as `0x${string}`;

  await signer.sendTransaction({
    to: factory,
    data: `${salt}${bytecode.slice(2)}`,
    value: 0,
  });

  const address = getContractAddress({
    bytecode: keccak256(bytecode),
    from: factory,
    opcode: "CREATE2",
    salt: salt,
  });

  return address;
}
