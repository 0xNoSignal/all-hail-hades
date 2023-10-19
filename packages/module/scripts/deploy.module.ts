import hre from "hardhat";

async function main() {
  try {
    const allHailHades = await hre.viem.deployContract(
      "contracts/AllHailHades.sol:AllHailHades"
    );

    console.log(`Module deployed to ${allHailHades.address}`);
  } catch (e) {
    console.log(e);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
