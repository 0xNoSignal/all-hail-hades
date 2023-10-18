import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, WalletClient } from "viem";
import { sign, signEthers } from "./utils";
import { setupFixture } from "./test-helpers/setup";
import { BrowserProvider, JsonRpcSigner } from "ethers";

function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain?.id,
    name: chain?.name,
    ensAddress: chain?.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account?.address as string);
  return signer;
}

describe("AllHailHades", function () {
  // async function setupFixture() {
  //   const [owner, heir, otherAccount] = await hre.viem.getWalletClients();

  //   const allHailHades = await hre.viem.deployContract("AllHailHades");
  //   const publicClient = await hre.viem.getPublicClient();

  //   return { allHailHades, owner, heir, otherAccount, publicClient };
  // }

  describe("Set Inheritance", function () {
    it("Should allow a user to set inheritance", async function () {
      const { allHailHades, owner, heir, publicClient, iSafe } =
        await loadFixture(setupFixture);

      const timeframe = BigInt((await time.latest()) + 1000);
      const txHash = await allHailHades.write.setInhertance(
        [iSafe.address, heir.account.address, timeframe],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );

      await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      const willSetEvents = await allHailHades.getEvents.WillSet();
      expect(willSetEvents).to.have.lengthOf(1);

      const event = willSetEvents[0];
      expect(event.args.heir).to.equal(getAddress(heir.account.address));
      expect(event?.args?.tip).to.equal(1000000000000000000n);
      expect(event?.args?.safe).to.equal(iSafe.address);
      expect(event?.args?.nonce).to.equal(1n);
      expect(event?.args?.timeframe).to.equal(timeframe);
      expect(event?.args?.owner).to.equal(getAddress(owner.account.address));
    });
  });

  describe("Abort Inheritance", () => {
    it("Should allow a user to abort inheritance by increasing nonce", async () => {
      const { allHailHades, owner, heir, publicClient, iSafe } =
        await loadFixture(setupFixture);

      const timeframe = BigInt((await time.latest()) + 1000);
      await allHailHades.write.setInhertance(
        [iSafe.address, heir.account.address, timeframe],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );

      const initialNonce = await allHailHades.read.userNonce([
        owner.account.address,
        iSafe.address,
      ]);

      const txHash = await allHailHades.write.abortInhertiance([iSafe.address]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      const newNonce = await allHailHades.read.userNonce([
        owner.account.address,
        iSafe.address,
      ]);

      expect(BigInt(newNonce)).to.equal(BigInt(initialNonce) + 1n);
    });
  });

  describe("Execute Will", function () {
    it("Should allow the heir to claim inheritance after 1 day with a valid signature", async function () {
      const { allHailHades, owner, heir, publicClient, iSafe, otherAccount } =
        await loadFixture(setupFixture);

      await allHailHades.write.setInhertance(
        [iSafe.address, heir.account.address, BigInt(10 * 1000)],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );

      // Fast forward 1 day
      await time.increase(24 * 60 * 60 + 1 + 2000);

      // Create signature
      const nonce = await allHailHades.read.getNonce([
        owner.account.address,
        iSafe.address,
      ]);

      const signature = await sign(
        owner, // This should be your WalletClient
        allHailHades.address, // Assuming `allHailHades` is the deployed contract instance
        owner.account.address, // The address of the owner, assuming `owner` is a Signer
        iSafe.address,
        heir.account.address, // The heir's address
        nonce
      );

      console.log("viem signature", signature);

      const ethersOwner = await hre.viem.getWalletClient(owner.account.address);
      const signer = walletClientToSigner(ethersOwner);

      const ethersSignature = await signEthers(
        signer, // This should be your WalletClient
        allHailHades.address, // Assuming `allHailHades` is the deployed contract instance
        owner.account.address, // The address of the owner, assuming `owner` is a Signer
        iSafe.address,
        heir.account.address, // The heir's address
        nonce
      );

      console.log("ethers signature", ethersSignature);

      // Execute will
      const txHash = await allHailHades.write.executeWill(
        [signature, owner.account.address, iSafe.address],
        { account: otherAccount.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // // Validate balances (optional)
      // const otherAccountBalance = await publicClient.getBalance({
      //   address: otherAccount.account.address,
      // });
      // expect(otherAccountBalance).to.be.gte(1000000000000000000); // Ensure heir received at least 1 Ether
    });

    // it("Should reject if the signature is invalid", async function () {
    //   const { allHailHades, owner, heir } = await setupFixture();

    //   await allHailHades.write.setInhertance(heir.account.address, {
    //     value: 1000000000000000000n, // 1 Ether
    //   });

    //   // Fast forward 1 day
    //   await time.increase(24 * 60 * 60 + 1);

    //   // Create an invalid signature
    //   const invalidSignature = "0x" + "a".repeat(130); // An example of an invalid signature

    //   // Attempt to execute will
    //   await expect(
    //     allHailHades.write.executeWill(
    //       invalidSignature,
    //       owner.account.address,
    //       { walletClient: heir }
    //     )
    //   ).to.be.rejectedWith("Invalid signature");
    // });

    // it("Should reject if it hasn't been 1 day yet", async function () {
    //   const { allHailHades, owner, heir } = await setupFixture();

    //   await allHailHades.write.setInhertance(heir.account.address, {
    //     value: 1000000000000000000n, // 1 Ether
    //   });

    //   // Create signature (without fast forwarding time)
    //   const nonce = await allHailHades.read.getNonce(owner.account.address);
    //   const message = await hre.ethers.utils.solidityKeccak256(
    //     ["address", "uint256"],
    //     [heir.account.address, nonce]
    //   );
    //   const signature = await owner.signMessage(
    //     hre.ethers.utils.arrayify(message)
    //   );

    //   // Attempt to execute will
    //   await expect(
    //     allHailHades.write.executeWill(signature, owner.account.address, {
    //       walletClient: heir,
    //     })
    //   ).to.be.rejectedWith("You must wait 1 day to claim");
    // });
  });
});
