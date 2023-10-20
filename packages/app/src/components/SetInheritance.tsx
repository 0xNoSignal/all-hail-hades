import React, { use, useMemo, useState } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Button,
  Input,
  Text,
  Box,
  Tooltip,
  Heading,
  useToast,
} from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";
import { formatEther, isAddress, parseEther } from "viem";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { MODULE_ADDRESS } from "../pages";
import * as helpers from "../helpers";
import {
  WalletClient,
  getWalletClient,
  prepareWriteContract,
  readContract,
  writeContract,
} from "@wagmi/core";
import { time } from "console";

export default function SetInheritance({
  safe,
  walletAddress,
  litNodeClient,
}: {
  safe: string;
  walletAddress: `0x${string}`;
  litNodeClient: LitJsSdk.LitNodeClient;
}) {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = React.useRef<any>();
  const [heir, setHeir] = useState<string>();
  const [timeframe, setTimeframe] = useState<number>();
  const [value, setValue] = useState<string>();

  const isDisabled = useMemo(() => {
    if (heir && isAddress(heir) && timeframe && timeframe > 0) {
      return false;
    }
    return true;
  }, [heir, timeframe]);

  const setInhertiance = async () => {
    Array(3)
      .fill(0)
      .forEach(async () => {
        toast({
          title: "LFG",
          status: "success",
          duration: 500,
        });
      });

    if (!walletAddress) {
      toast({
        title: "No wallet address",
        description: "Please connect your wallet",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      return;
    }
    const nonce = (await readContract({
      address: MODULE_ADDRESS,
      abi: helpers.ALL_HAIL_HADES_ABI,
      functionName: "getNonce",
      args: [walletAddress, safe],
    })) as bigint;

    console.log("nonce", nonce);

    if (!heir) {
      toast({
        title: "No heir",
        description: "Please enter an heir",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      return;
    }
    const walletClient = (await getWalletClient()) as WalletClient;

    const signature = await helpers.sign(
      walletClient, // This should be your WalletClient
      MODULE_ADDRESS, // Assuming `allHailHades` is the deployed contract instance
      walletAddress as `0x${string}`, // The address of the owner, assuming `owner` is a Signer
      safe as `0x${string}`, // The address of the safe
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
    if (!value || typeof value !== "string") {
      toast({
        title: "No value",
        description: "Please enter a value",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      return;
    }
    let val = parseEther(value) || BigInt(0);

    try {
      const { request } = await prepareWriteContract({
        address: MODULE_ADDRESS,
        abi: helpers.ALL_HAIL_HADES_ABI,
        functionName: "setInhertance",
        args: [safe, heir, timeframe, ciphertext, dataToEncryptHash],
        value: val,
      });

      const { hash } = await writeContract(request);

      toast({
        title: "Success",
        description: (
          <p>
            Transaction hash:{" "}
            <a href={`https://goerli.etherscan.io/tx/${hash}`}>{hash}</a>
          </p>
        ),
        status: "success",
        duration: 9000,
        isClosable: true,
      });
    } catch (e: any) {
      console.log(e);
      toast({
        title: "Error",
        description: e?.message || "Something went wrong",
        status: "error",
        duration: 9000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  };

  return (
    <>
      <Button ref={btnRef} size="sm" onClick={onOpen}>
        Set Heir
      </Button>
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            <Heading>Set Inhertiance</Heading>
            <Text fontWeight={300} fontStyle={"italic"} fontSize={"sm"}>
              safe:{safe}
            </Text>
          </DrawerHeader>

          <DrawerBody>
            <Box mb={2}>
              <Text>Heir</Text>
              <Input
                onChange={(e) => {
                  setHeir(e?.target?.value);
                }}
                value={heir}
                pattern="^0x[a-fA-F0-9]{40}$"
                placeholder="0x..."
              />
            </Box>
            <Box mb={2}>
              <Text>Timeframe</Text>
              <Input
                min="0"
                value={timeframe}
                onChange={(e) => {
                  setTimeframe(Number(e?.target?.value));
                }}
                type="number"
                placeholder="Seconds"
              />
            </Box>
            <Box mb={2}>
              <Text>Tip</Text>
              <Input
                value={value}
                onChange={(e) => {
                  setValue(e?.target?.value);
                }}
                placeholder="Tip"
                min="0"
                type="number"
              />
            </Box>
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={setInhertiance}
              bg="#12ff80"
              isDisabled={isDisabled}
            >
              LFG
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
