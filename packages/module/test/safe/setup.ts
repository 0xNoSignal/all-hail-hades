import hre from "hardhat";

export async function setupFixturesWithFakeSafe() {
  const [owner, heir, otherAccount] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const fakeSafe = await hre.viem.deployContract("FakeSafe", [
    [owner.account.address],
    1n,
  ]);

  const allHailHades = await hre.viem.deployContract("AllHailHades");

  await fakeSafe.write.enableModule([allHailHades.address as `0x${string}`]);

  return {
    allHailHades,
    owner,
    heir,
    otherAccount,
    publicClient,
    safeAddress: fakeSafe.address,
    iSafe: fakeSafe,
  };
}
