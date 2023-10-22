import Head from "next/head";
import { Inter } from "next/font/google";
import { readContracts } from "@wagmi/core";
import SafeApiKit from "@safe-global/api-kit";
import { EthersAdapter } from "@safe-global/protocol-kit";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import Safe from "@safe-global/protocol-kit";
import { useEthersSigner } from "@/hooks/ethers";
import { useEffect, useMemo, useRef, useState } from "react";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { IconButton } from "@chakra-ui/react";
import { GiSoundOff, GiSoundOn } from "react-icons/gi";
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
  useBreakpointValue,
  Modal,
  useDisclosure,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import SetInheritance from "../components/SetInheritance";
import { getAddress } from "viem";
import RainEffect from "../components/RainEffect";
import Image from "next/image";

export const MODULE_ADDRESS = "0x99d7a84d07aa0de0d53dda1caabff61bca81c802";

function shortenEthAddress(address: string) {
  if (!address || address.length !== 42) {
    return address;
  }

  const prefix = address.slice(0, 6); // Take the first 6 characters
  const suffix = address.slice(-4); // Take the last 4 characters
  return `${prefix}...${suffix}`;
}

export default function Home() {
  const toast = useToast();

  const signer = useEthersSigner();
  const { address, isConnected } = useAccount();

  const [mySafes, setMySafes] = useState<string[]>([]);

  const isSmall = useBreakpointValue({
    base: true,
    md: false,
  });
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
      console.log("daten", daten);

      const feedback = daten.map((safe, index) => ({
        address: safe.address,
        isEnabled: safe.modules
          .map((s) => s.toLowerCase())
          .includes(MODULE_ADDRESS.toLowerCase()),
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
  const audioRef = useRef(null) as any;
  const [isPlaying, setIsPlaying] = useState(false);

  const [isOpen, setIsOpen] = useState(true);
  const [withAudio, setWithAudio] = useState(false);

  const playAudio = () => {
    const audio = audioRef.current;
    console.log("audio", audio);
    if (audio && audio.readyState === 4) {
      setIsPlaying(true);
      audio.play();
    }
  };

  const stopAudio = () => {
    const audio = audioRef.current;
    if (audio && audio.readyState === 4) {
      setIsPlaying(false);
      audio.pause();
    }
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
        <Modal
          closeOnOverlayClick={false}
          isCentered
          isOpen={isOpen}
          onClose={playAudio}
        >
          <ModalOverlay />
          <ModalContent
            border="1px solid"
            borderColor={"whiteAlpha.300"}
            color="white"
            bg="blackAlpha.800"
          >
            <ModalHeader
              fontSize={48}
              fontFamily={"'UnifrakturCook', sans-serif;"}
            >
              hail hades
            </ModalHeader>

            <ModalFooter>
              <Button
                bg="#F82900"
                mr={3}
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                HAIL
              </Button>
              <Button
                bg="#F82900"
                onClick={() => {
                  playAudio();
                  setIsOpen(false);
                  setWithAudio(true);
                }}
              >
                HAIL, with sound
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
        <audio ref={audioRef} loop>
          <source src="/audio/background-music.mp3" type="audio/mpeg" />
        </audio>
        <div className="background-container">
          <Image
            src="/images/bg.dark.png"
            layout="fill"
            alt="HADES"
            objectFit="cover"
            quality={100}
            className="background-image"
          />
          <Heading
            className="horror-text"
            textAlign={"center"}
            color="white"
            fontFamily={"'UnifrakturCook', sans-serif;"}
            my={12}
            fontSize={{
              base: "4xl",
              md: "8xl",
            }}
          >
            All hail hades
            {withAudio &&
              (isPlaying ? (
                <IconButton
                  mx={4}
                  size="sm"
                  borderRadius={15}
                  opacity={0.8}
                  aria-label="Search database"
                  onClick={stopAudio}
                  icon={<GiSoundOff />}
                />
              ) : (
                <IconButton
                  mx={4}
                  size="sm"
                  borderRadius={15}
                  opacity={0.8}
                  aria-label="Search database"
                  onClick={playAudio}
                  icon={<GiSoundOn />}
                />
              ))}
          </Heading>
          <RainEffect />
          <Flex
            flexDir={"column"}
            alignItems={"center"}
            justifyContent={"center"}
            zIndex={10}
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
                  minW={{
                    base: 0,
                    md: "50%",
                  }}
                >
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
                        <Text px={2} borderRadius={6} bg="whiteAlpha.800">
                          threshold: {safe.threshold}
                        </Text>
                      </Tooltip>
                    </Box>
                  )}
                  <Flex
                    alignItems={"center"}
                    justifyContent={"center"}
                    flexWrap={"wrap"}
                    p={4}
                    overflowY={"scroll"}
                  >
                    <Flex
                      flex={1}
                      alignItems="center"
                      mb={4}
                      fontSize={{
                        base: "sm",
                        md: "md",
                      }}
                      overflowWrap={"initial"}
                      color="whiteAlpha.700"
                      minW={"50%"}
                      mx={{
                        base: 0,
                        md: 4,
                      }}
                    >
                      {typeof safe === "string"
                        ? safe
                        : isSmall
                        ? shortenEthAddress(safe.address)
                        : safe.address}
                    </Flex>

                    <Flex
                      flex={1}
                      alignItems="center"
                      justifyContent={"center"}
                      mx={{
                        base: 0,
                        md: 4,
                      }}
                    >
                      {typeof safe !== "string" && !safe.isEnabled && (
                        <Button
                          bg="#F82900"
                          size={"sm"}
                          onClick={() =>
                            deployModuleAction(safe.address, safe.threshold)
                          }
                        >
                          Enable Module
                        </Button>
                      )}
                    </Flex>
                    <Flex
                      flex={1}
                      alignItems="center"
                      justifyContent={"center"}
                      mx={{
                        base: 0,
                        md: 4,
                      }}
                    >
                      {typeof safe !== "string" && (
                        <SetInheritance
                          safe={safe.address}
                          walletAddress={address}
                          litNodeClient={litNodeClient}
                        />
                      )}
                    </Flex>
                  </Flex>
                </Box>
              ))}
          </Flex>
        </div>
      </main>
    </>
  );
}
