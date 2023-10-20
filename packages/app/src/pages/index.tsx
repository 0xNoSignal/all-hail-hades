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
  readContracts,
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
import {
  Box,
  Text,
  Tooltip,
  Button,
  Tbody,
  Tr,
  Th,
  Table,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import SetInheritance from "../components/SetInheritance";

const inter = Inter({ subsets: ["latin"] });

const ENCRYPTED_MESSAGE = "Hello World";
const SAFE_ADDRESS = "0x6617a5D85F6960f72a78A89Edce080184360D54F";
const MODULE_ADDRESS = "0xdfb72936feaca3255d4f2d967680930158d75c42";
const RANDOM_HEIR = "0xC3a2580b2eeA35d1e56B655F176c1Eb10CDae51a";

export default function Home() {
  const toast = useToast();

  const signer = useEthersSigner();
  const { address, isConnected } = useAccount();
  const [heir, setHeir] = useState<string>();
  const [timeframe, setTimeframe] = useState<number>();
  const [mySafes, setMySafes] = useState<string[]>([]);
  const [isModuleEnabled, setIsModuleEnabled] = useState<
    {
      address: string;
      isEnabled: boolean | any[];
      status: "failure" | "success";
    }[]
  >([]);

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

  const logSafes = async (address: string) => {
    const safes = await safeService.getSafesByOwner(address);
    setMySafes(safes.safes || []);
  };

  const readIfModulesAreEnabled = async (safes: string[]) => {
    const list = safes.map((address) => ({
      address: address as `0x${string}`,
      abi: helpers.SAFE_ABI_LIGHT as any,
      functionName: "isModuleEnabled",
      args: [MODULE_ADDRESS],
    }));
    const data = await readContracts({
      contracts: list,
    });
    const feedback = safes.map((safe, index) => ({
      address: safe,
      isEnabled: data[index].result || false,
      status: data[index].status,
    }));
    setIsModuleEnabled(feedback);
  };

  useEffect(() => {
    if (address) {
      logSafes(address);
    }
  }, [address]);

  useEffect(() => {
    if (mySafes.length > 0) {
      readIfModulesAreEnabled(mySafes);
    }
  }, [mySafes]);

  const listToUse = useMemo(() => {
    if (mySafes.length === isModuleEnabled.length) {
      return isModuleEnabled;
    }
    return mySafes;
  }, [mySafes, isModuleEnabled]);

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

  const deployModuleAction = async (firstSafe: string) => {
    if (!signer) {
      toast({
        title: "No signer found",
        description: "Please connect your wallet",
        status: "error",
        isClosable: true,
      });
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

    const safeTransaction = await safeSdk2.createEnableModuleTx(MODULE_ADDRESS);
    const txResponse = await safeSdk2.executeTransaction(safeTransaction);
    const response = await txResponse.transactionResponse?.wait();

    console.log("response", response);
    console.log("txResponse", txResponse);
    console.log("safeTransaction", safeTransaction);
    await readIfModulesAreEnabled(mySafes);
  };

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <w3m-button />
        {listToUse.map((safe) => (
          <Box
            key={typeof safe === "string" ? safe : safe.address}
            pos="relative"
            borderRadius={15}
            mx={3}
            my={4}
            border="1px solid"
            borderColor={"whiteAlpha.300"}
          >
            <Table border="0">
              <Tbody border="0">
                <Tr border="0">
                  <Text
                    color="#12ff80"
                    fontWeight={600}
                    pos="absolute"
                    top={-3}
                    left={9}
                  >
                    SAFE
                  </Text>
                  {typeof safe !== "string" && safe && (
                    <Box pos="absolute" top={-3} left={3}>
                      <Tooltip label="Is Hades Module Enabled?">
                        <Text>{safe.isEnabled ? "🟢" : "🔴"}</Text>
                      </Tooltip>
                    </Box>
                  )}
                  <Th border="0">
                    {typeof safe === "string" ? safe : safe.address}
                  </Th>
                  <Th border="0">
                    {typeof safe !== "string" && !safe.isEnabled && (
                      <Button
                        bg="#12ff80"
                        mx={4}
                        size={"sm"}
                        onClick={() => deployModuleAction(safe.address)}
                      >
                        Enable Module
                      </Button>
                    )}
                  </Th>
                  <Th border="0">
                    {typeof safe !== "string" && (
                      <SetInheritance safe={safe.address} />
                    )}
                  </Th>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        ))}
      </main>
    </>
  );
}
