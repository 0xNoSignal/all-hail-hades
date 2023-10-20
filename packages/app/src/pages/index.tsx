import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import {
  WalletClient,
  getAccount,
  getWalletClient,
  prepareWriteContract,
  readContract,
  signTypedData,
  writeContract,
} from "@wagmi/core";
import { domain, message, types } from "@/utils";
import SafeApiKit from "@safe-global/api-kit";
import { EthersAdapter } from "@safe-global/protocol-kit";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import Safe from "@safe-global/protocol-kit";
import { useEthersSigner } from "@/hooks/ethers";
import { useEffect, useMemo, useState } from "react";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import * as helpers from "../helpers";
import { parseEther } from "viem";

const inter = Inter({ subsets: ["latin"] });

const ENCRYPTED_MESSAGE = "Hello World";
const SAFE_ADDRESS = "0x6617a5D85F6960f72a78A89Edce080184360D54F";
const MODULE_ADDRESS = "0xdfb72936feaca3255d4f2d967680930158d75c42";
const RANDOM_HEIR = "0xC3a2580b2eeA35d1e56B655F176c1Eb10CDae51a";

export default function Home() {
  const signer = useEthersSigner();
  const { address, isConnected } = useAccount();
  const [heir, setHeir] = useState<string>();
  const [timeframe, setTimeframe] = useState<number>();

  const litNodeClient = useMemo(
    () =>
      new LitJsSdk.LitNodeClient({
        litNetwork: "cayenne",
      }),
    []
  );

  litNodeClient.connect();

  const provider = new ethers.providers.InfuraProvider(
    "goerli",
    process.env.INFURA_API_KEY
  );

  const ethAdapter = new EthersAdapter({
    signerOrProvider: provider,
    ethers,
  });

  const safeService = new SafeApiKit({
    txServiceUrl: "https://safe-transaction-goerli.safe.global",
    ethAdapter,
  });

  if (address) {
    const test = safeService.getSafesByOwner(address).then((res) => {
      console.log(res, "safe results");
    });
  }

  const setInhertiance = async () => {
    const nonce = (await readContract({
      address: MODULE_ADDRESS,
      abi: helpers.ALL_HAIL_HADES_ABI,
      functionName: "getNonce",
      args: [address, SAFE_ADDRESS],
    })) as bigint;

    console.log("nonce", nonce);

    if (!address) {
      throw new Error("No address");
    }

    if (!heir) {
      throw new Error("No heir");
    }
    const walletClient = (await getWalletClient()) as WalletClient;

    const signature = await helpers.sign(
      walletClient, // This should be your WalletClient
      MODULE_ADDRESS, // Assuming `allHailHades` is the deployed contract instance
      address, // The address of the owner, assuming `owner` is a Signer
      SAFE_ADDRESS,
      heir as `0x${string}`, // The heir's address
      nonce
    );

    console.log("signature", signature);

    const chain = "ethereum";
    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain,
    });

    const accessControlConditions = [
      {
        contractAddress:
          "ipfs://QmTctzQiRG3wdzs9e5Proq2zKtC8ShrrsAYrQqRSJNsUrZ",
        standardContractType: "LitAction",
        chain: "ethereum",
        method: "go",
        parameters: ["40"],
        returnValueTest: {
          comparator: "=",
          value: "true",
        },
      },
    ];
    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        accessControlConditions,
        authSig,
        chain,
        dataToEncrypt: signature,
      },
      litNodeClient
    );

    console.log("ciphertext", ciphertext);
    console.log("dataToEncryptHash", dataToEncryptHash);

    if (!timeframe) {
      throw new Error("No timeframe");
    }

    const { request } = await prepareWriteContract({
      address: MODULE_ADDRESS,
      abi: helpers.ALL_HAIL_HADES_ABI,
      functionName: "setInhertance",
      args: [SAFE_ADDRESS, heir, timeframe, ciphertext, dataToEncryptHash],
      value: parseEther("0.0001"),
    });
    const { hash } = await writeContract(request);

    console.log("hash", hash);
  };

  const deployModuleAction = async () => {
    if (address && signer) {
      safeService.getSafesByOwner(address).then(async (res) => {
        const [firstSafe] = res.safes;

        if (!firstSafe) {
          return;
        }

        const safeSdk: Safe = await Safe.create({
          ethAdapter: ethAdapter,
          safeAddress: firstSafe,
        });

        const ethAdapterOwner2 = new EthersAdapter({
          ethers,
          signerOrProvider: signer,
        });

        const safeSdk2 = await safeSdk.connect({
          ethAdapter: ethAdapterOwner2,
          safeAddress: firstSafe,
        });

        const safeTransaction = await safeSdk2.createEnableModuleTx(
          "0xdfb72936fEACa3255D4F2d967680930158D75c42"
        );
        const txResponse = await safeSdk2.executeTransaction(safeTransaction);
        const response = await txResponse.transactionResponse?.wait();

        // console.log(safeTransaction, "safeTransaction");
        console.log(txResponse, "txResponse");
        console.log(response, "res");
      });
    }
  };

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main} ${inter.className}`}>
        <w3m-button />
        {isConnected && (
          <div className={styles.grid}>
            <div>
              <h3>Set Inhertiance</h3>
              <label>HEIR:</label>
              <input
                placeholder="heir"
                onChange={(e) => {
                  setHeir(e?.target?.value);
                }}
              ></input>
            </div>
            <div>
              <label>Timeframe after considered dead:</label>
              <i>in seconds</i>
              <input
                placeholder="Timeframe"
                type="number"
                onChange={(e) => {
                  setTimeframe(Number(e?.target?.value));
                }}
              ></input>
            </div>
            <button onClick={setInhertiance}>Set Inhertiance</button>
          </div>
        )}
      </main>
    </>
  );
}
