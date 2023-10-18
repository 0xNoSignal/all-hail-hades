import hre from "hardhat";
import deploySingletons from "./deploySingeltons";
import deploySafeProxy from "./deploySafeProxy";

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
