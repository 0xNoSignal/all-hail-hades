import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { getAddress } from "viem";
import { sign } from "./utils";
import { setupFixturesWithFakeSafe } from "./safe/setup";

describe("AllHailHades", function () {
  describe("Set Inheritance", function () {
    it("Should allow a user to set inheritance", async function () {
      const { allHailHades, owner, heir, publicClient, iSafe } =
        await loadFixture(setupFixturesWithFakeSafe);

      const timeframe = BigInt((await time.latest()) + 1000);
      const txHash = await allHailHades.write.setInheritance(
        [iSafe.address, heir.account.address, timeframe, "a", "b"],
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
      expect(getAddress(event?.args?.safe as string)).to.equal(
        getAddress(iSafe.address as string)
      );
      expect(event?.args?.nonce).to.equal(1n);
      expect(event?.args?.timeframe).to.equal(timeframe);
      expect(event?.args?.owner).to.equal(getAddress(owner.account.address));
    });
  });

  describe("Abort Inheritance", () => {
    it("Should allow a user to abort inheritance", async () => {
      const { allHailHades, owner, heir, publicClient, iSafe } =
        await loadFixture(setupFixturesWithFakeSafe);

      const timeframe = BigInt((await time.latest()) + 1000);
      await allHailHades.write.setInheritance(
        [iSafe.address, heir.account.address, timeframe, "a", "b"],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );

      let doesExcistBefore = (await allHailHades.read.doesWillExcist([
        owner.account.address,
        iSafe.address,
      ])) as any;

      expect(doesExcistBefore).to.be.true;

      const txHash = await allHailHades.write.abortInheritance([iSafe.address]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const doesExcistAfter = await allHailHades.read.doesWillExcist([
        owner.account.address,
        iSafe.address,
      ]);

      expect(doesExcistAfter).to.be.false;
    });
  });

  describe("Execute Will", function () {
    it("Should allow the heir to claim inheritance after 1 day with a valid signature", async function () {
      const { allHailHades, owner, heir, publicClient, iSafe, otherAccount } =
        await loadFixture(setupFixturesWithFakeSafe);
      const timenow = await time.latest();
      await allHailHades.write.setInheritance(
        [iSafe.address, heir.account.address, 1000n, "a", "b"],
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
      expect(await iSafe.read.isOwner([owner.account.address])).to.be.true;
      const wills = await allHailHades.read.wills([
        owner.account.address,
        iSafe.address,
      ]);

      expect(getAddress(wills[0])).to.be.include(
        getAddress(heir.account.address)
      );
      expect(Number(wills[1])).to.be.gte(1000000000000000000); // Test tip
      expect(Number(wills[2])).to.be.gte(1000); // Test timeframe
      expect(wills[3]).to.be.equal(nonce); // Test nonce
      expect(Number(wills[4])).to.be.equal(timenow + 1); // Test block timestamp

      // Execute will
      const txHash = await allHailHades.write.executeWill(
        [signature, owner.account.address, iSafe.address],
        { account: otherAccount.account }
      );
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Validate balances (optional)
      const otherAccountBalance = await publicClient.getBalance({
        address: otherAccount.account.address,
      });
      expect(Number(otherAccountBalance)).to.be.gte(1000000000000000000); // Ensure heir received at least 1 Ether
      expect(await iSafe.read.isOwner([owner.account.address])).to.be.false;
      expect(await iSafe.read.isOwner([heir.account.address])).to.be.true;
      // expect(
      //   await allHailHades.read.wills([owner.account.address, iSafe.address])
      // ).to.be.false;
    });

    it("Should reject if the signature is invalid", async function () {
      const { allHailHades, owner, heir, iSafe } = await loadFixture(
        setupFixturesWithFakeSafe
      );

      await allHailHades.write.setInheritance(
        [iSafe.address, heir.account.address, 10000n, "a", "b"],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );

      // Fast forward 1 day
      await time.increase(24 * 60 * 60 + 1);

      const nonce = await allHailHades.read.getNonce([
        owner.account.address,
        iSafe.address,
      ]);
      // Create an invalid signature
      const signature = await sign(
        owner, // This should be your WalletClient
        allHailHades.address, // Assuming `allHailHades` is the deployed contract instance
        owner.account.address, // The address of the owner, assuming `owner` is a Signer
        iSafe.address,
        heir.account.address, // The heir's address
        nonce
      );

      const invalidSignature = (signature.slice(0, -2) + "00") as `0x${string}`;

      // Attempt to execute will
      await expect(
        allHailHades.write.executeWill(
          [invalidSignature, owner.account.address, iSafe.address],
          { account: heir.account }
        )
      ).to.be.rejected;
    });

    it("Should reject if it hasn't been 1 day yet", async function () {
      const { allHailHades, owner, heir, iSafe } = await loadFixture(
        setupFixturesWithFakeSafe
      );

      await allHailHades.write.setInheritance(
        [iSafe.address, heir.account.address, 10000n, "a", "b"],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );
      // Create signature (without fast forwarding time)

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

      // Attempt to execute will
      await expect(
        allHailHades.write.executeWill(
          [signature, owner.account.address, iSafe.address],
          { account: heir.account }
        )
      ).to.be.rejected;
    });

    it("Should reject if module is disabled", async function () {
      const { allHailHades, owner, heir, iSafe } = await loadFixture(
        setupFixturesWithFakeSafe
      );

      await allHailHades.write.setInheritance(
        [iSafe.address, heir.account.address, 10000n, "a", "b"],
        {
          value: 1000000000000000000n, // 1 Ether
        }
      );

      // Fast forward 1 day
      await time.increase(24 * 60 * 60 + 1);

      // Disable module
      await iSafe.write.disableModule([allHailHades.address]);

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

      // Attempt to execute will
      await expect(
        allHailHades.write.executeWill(
          [signature, owner.account.address, iSafe.address],
          { account: heir.account }
        )
      ).to.be.rejected;
    });
  });
});
