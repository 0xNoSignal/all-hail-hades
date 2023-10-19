import hre from "hardhat";
import deploySingletons from "./deploySingeltons";
import deploySafeProxy from "./deploySafeProxy";
import execSafeTransaction from "./executeSafeTransaction";
import { encodeFunctionData } from "viem";

export async function setupFixture() {
  const [owner, heir, otherAccount] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const { safeProxyFactoryAddress, safeMastercopyAddress, allHailHadesModule } =
    await deploySingletons(owner);

  const safeAddress = await deploySafeProxy(
    safeProxyFactoryAddress,
    safeMastercopyAddress,
    owner.account.address,
    owner
  );

  const iSafe = await hre.viem.getContractAt(
    "ISafe",
    safeAddress as `0x${string}`
  );

  const allHailHades = await hre.viem.deployContract("AllHailHades");

  await iSafe.write.enableModule([allHailHades.address as `0x${string}`]);

  const data = encodeFunctionData({
    abi: iSafe.abi,
    functionName: "enableModule",
    args: [allHailHades.address as `0x${string}`],
  });

  await execSafeTransaction(
    iSafe,
    {
      to: iSafe.address,
      data,
      value: 0,
    },
    owner,
    owner.account.address
  );

  return {
    allHailHades,
    owner,
    heir,
    otherAccount,
    publicClient,
    safeAddress,
    iSafe,
  };
}
