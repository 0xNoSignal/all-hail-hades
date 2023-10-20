import Head from "next/head";
import { Inter } from "next/font/google";
import { readContracts } from "@wagmi/core";
import SafeApiKit from "@safe-global/api-kit";
import { EthersAdapter } from "@safe-global/protocol-kit";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import Safe from "@safe-global/protocol-kit";
import { useEthersSigner } from "@/hooks/ethers";
import { useEffect, useMemo, useState } from "react";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import * as helpers from "../helpers";
import {
  Box,
  Text,
  Tooltip,
  Button,
  Tbody,
  Tr,
  Th,
  Table,
  Heading,
  Flex,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import SetInheritance from "../components/SetInheritance";
import { getAddress } from "viem";
import RainEffect from "../components/RainEffect";

export const MODULE_ADDRESS = "0xdfb72936feaca3255d4f2d967680930158d75c42";

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
      threshold: number;
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
    try {
      const daten = await Promise.all(
        safes.map((safeaddress) => safeService.getSafeInfo(safeaddress))
      );

      const feedback = daten.map((safe, index) => ({
        address: safe.address,
        isEnabled: safe.modules.includes(MODULE_ADDRESS),
        threshold: safe.threshold,
      }));

      setIsModuleEnabled(feedback);
    } catch (e) {
      console.log("error", e);
    }
  };

  useEffect(() => {
    if (address) {
      logSafes(address);
    } else {
      setMySafes([]);
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

  const deployModuleAction = async (firstSafe: string, threshold: number) => {
    if (threshold > 1) {
      toast({
        title: "Threshold is over 1.",
        description: "So we can only propose a transaction.",
        status: "info",
        isClosable: true,
      });
    }
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

    try {
      const safeTransaction = await safeSdk2.createEnableModuleTx(
        MODULE_ADDRESS
      );
      console.log("safeTransaction", safeTransaction);

      if (threshold > 1) {
        const safeTxHash = await safeSdk2.getTransactionHash(safeTransaction);
        const senderSignature = await safeSdk2.signTransactionHash(safeTxHash);
        await safeService.proposeTransaction({
          safeAddress: firstSafe,
          safeTransactionData: safeTransaction.data,
          safeTxHash,
          senderAddress: address as string,
          senderSignature: senderSignature.data,
        });
        toast({
          title: "Success",
          description: "Proposed transaction",
          status: "success",
          isClosable: true,
        });
      } else {
        const txResponse = await safeSdk2.executeTransaction(safeTransaction);
        const response = await txResponse.transactionResponse?.wait();
        console.log("response", response);
        console.log("txResponse", txResponse);
        toast({
          title: "Success",
          description: "Module Enabled",
          status: "success",
          isClosable: true,
        });
      }
    } catch (e: any) {
      console.log(e);
      toast({
        title: "Error",
        description: e.message,
        status: "error",
        isClosable: true,
      });
    }

    await readIfModulesAreEnabled(mySafes);
  };

  return (
    <>
      <Head>
        <title>ALL HAIL HADES</title>
        <meta name="description" content="Inhertiance for your SAFE" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <Heading
          className="horror-text"
          textAlign={"center"}
          color="white"
          fontFamily={"'UnifrakturCook', sans-serif;"}
          my={12}
          fontSize={"8xl"}
        >
          All hail hades
        </Heading>
        <RainEffect />
        <Flex
          flexDir={"column"}
          alignItems={"center"}
          justifyContent={"center"}
        >
          <w3m-button />
          {address &&
            listToUse.map((safe) => (
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
                        color="#F82900"
                        fontWeight={600}
                        pos="absolute"
                        top={-5}
                        left={9}
                        fontFamily={"'UnifrakturCook', sans-serif;"}
                        fontSize={24}
                      >
                        safe
                      </Text>
                      {typeof safe !== "string" && safe && (
                        <Box pos="absolute" top={-3} left={3}>
                          <Tooltip label="Is Hades Module Enabled?">
                            <Text>{safe.isEnabled ? "🟢" : "🔴"}</Text>
                          </Tooltip>
                        </Box>
                      )}
                      {typeof safe !== "string" && safe && (
                        <Box pos="absolute" top={-3} left={24}>
                          <Tooltip label="Safe Threshold">
                            <Text borderRadius={6} bg="whiteAlpha.600">
                              {safe.threshold}
                            </Text>
                          </Tooltip>
                        </Box>
                      )}
                      <Th border="0">
                        {typeof safe === "string" ? safe : safe.address}
                      </Th>
                      <Th border="0">
                        {typeof safe !== "string" && !safe.isEnabled && (
                          <Button
                            bg="#F82900"
                            mx={4}
                            size={"sm"}
                            onClick={() =>
                              deployModuleAction(safe.address, safe.threshold)
                            }
                          >
                            Enable Module
                          </Button>
                        )}
                      </Th>
                      <Th border="0">
                        {typeof safe !== "string" && (
                          <SetInheritance
                            safe={safe.address}
                            walletAddress={address}
                            litNodeClient={litNodeClient}
                          />
                        )}
                      </Th>
                    </Tr>
                  </Tbody>
                </Table>
              </Box>
            ))}
        </Flex>
      </main>
    </>
  );
}
