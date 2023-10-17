import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress } from "viem";

describe("AllHailHades", function () {
  async function setupFixture() {
    const [owner, heir, otherAccount] = await hre.viem.getWalletClients();

    const allHailHades = await hre.viem.deployContract("AllHailHades");
    const publicClient = await hre.viem.getPublicClient();

    return { allHailHades, owner, heir, otherAccount, publicClient };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { allHailHades, owner } = await setupFixture();
      expect(await allHailHades.read.owner()).to.equal(
        getAddress(owner.account.address)
      );
    });
  });

  describe("Set Inheritance", function () {
    it("Should allow a user to set inheritance", async function () {
      const { allHailHades, owner, heir, publicClient } = await setupFixture();

      const txHash = await allHailHades.write.setInhertance(
        [heir.account.address, BigInt((await time.latest()) + 1000)],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const willSetEvents = await allHailHades.getEvents.WillSet();
      expect(willSetEvents).to.have.lengthOf(1);

      const event = willSetEvents[0];
      expect(event.args.heir).to.equal(getAddress(heir.account.address));
      expect(event?.args?.tip).to.equal(1000000000000000000n);

      const will = await allHailHades.read.inhertance([owner.account.address]);
      expect(will[0]).to.equal(getAddress(heir.account.address));
      expect(BigInt(will[1])).to.equal(1000000000000000000n); // 1 Ether
    });
  });

  describe("Abort Inheritance", function () {
    it("Should allow a user to abort inheritance by increasing nonce", async function () {
      const { allHailHades, owner } = await setupFixture();

      const initialNonce = await allHailHades.read.userNonce([
        owner.account.address,
      ]);
      await allHailHades.write.abortInhertiance();
      const newNonce = await allHailHades.read.userNonce([
        owner.account.address,
      ]);

      expect(BigInt(newNonce)).to.equal(BigInt(initialNonce) + 1n);
    });
  });

  describe("Get All Wills", function () {
    it("Should retrieve all wills", async function () {
      const { allHailHades, owner, heir, otherAccount } = await setupFixture();

      await allHailHades.write.setInhertance(
        [heir.account.address, BigInt((await time.latest()) + 1000)],
        {
          value: BigInt(1000000000000000000), // 1 Ether for heir
        }
      );

      await allHailHades.write.setInhertance(
        [otherAccount.account.address, BigInt((await time.latest()) + 1000)],
        {
          value: BigInt(2000000000000000000), // 2 Ether for otherAccount
          account: heir.account,
        }
      );

      const [heirs, tips, timestamps, nonces] =
        await allHailHades.read.getAllWills();

      expect(heirs).to.include(getAddress(heir.account.address));
      expect(heirs).to.include(getAddress(otherAccount.account.address));
      expect(tips).to.include(BigInt(1000000000000000000));
      expect(tips).to.include(BigInt(2000000000000000000));
    });
  });

  describe("Execute Will", function () {
    it("Should allow the heir to claim inheritance after 1 day with a valid signature", async function () {
      const { allHailHades, owner, heir, publicClient } = await setupFixture();

      await allHailHades.write.setInhertance(
        [heir.account.address, BigInt((await time.latest()) + 1000)],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );

      // Fast forward 1 day
      await time.increase(24 * 60 * 60 + 1 + 2000);

      // Create signature
      const nonce = await allHailHades.read.getNonce([owner.account.address]);
      const message = await hre.viem.utils.solidityKeccak256(
        ["address", "uint256"],
        [heir.account.address, nonce]
      );
      const signature = await owner.signMessage(
        hre.ethers.utils.arrayify(message)
      );

      // Execute will
      const txHash = await allHailHades.write.executeWill(
        signature,
        owner.account.address,
        { walletClient: heir }
      );
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Validate balances (optional)
      const heirBalance = await publicClient.getBalance({
        address: heir.account.address,
      });
      expect(heirBalance).to.be.gte(1000000000000000000n); // Ensure heir received at least 1 Ether
    });

    it("Should reject if the signature is invalid", async function () {
      const { allHailHades, owner, heir } = await setupFixture();

      await allHailHades.write.setInhertance(heir.account.address, {
        value: 1000000000000000000n, // 1 Ether
      });

      // Fast forward 1 day
      await time.increase(24 * 60 * 60 + 1);

      // Create an invalid signature
      const invalidSignature = "0x" + "a".repeat(130); // An example of an invalid signature

      // Attempt to execute will
      await expect(
        allHailHades.write.executeWill(
          invalidSignature,
          owner.account.address,
          { walletClient: heir }
        )
      ).to.be.rejectedWith("Invalid signature");
    });

    it("Should reject if it hasn't been 1 day yet", async function () {
      const { allHailHades, owner, heir } = await setupFixture();

      await allHailHades.write.setInhertance(heir.account.address, {
        value: 1000000000000000000n, // 1 Ether
      });

      // Create signature (without fast forwarding time)
      const nonce = await allHailHades.read.getNonce(owner.account.address);
      const message = await hre.ethers.utils.solidityKeccak256(
        ["address", "uint256"],
        [heir.account.address, nonce]
      );
      const signature = await owner.signMessage(
        hre.ethers.utils.arrayify(message)
      );

      // Attempt to execute will
      await expect(
        allHailHades.write.executeWill(signature, owner.account.address, {
          walletClient: heir,
        })
      ).to.be.rejectedWith("You must wait 1 day to claim");
    });
  });
});
