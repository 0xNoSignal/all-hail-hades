import React, { useMemo, useState } from "react";
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
} from "@chakra-ui/react";
import { useDisclosure } from "@chakra-ui/react";
import { isAddress } from "viem";

export default function SetInheritance({ safe }: { safe: string }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = React.useRef<any>();
  const [heir, setHeir] = useState<string>();
  const [timeframe, setTimeframe] = useState<number>();

  const isDisabled = useMemo(() => {
    if (heir && isAddress(heir) && timeframe) {
      return false;
    }
    return true;
  }, []);

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
              {safe}
            </Text>
          </DrawerHeader>

          <DrawerBody>
            <Box>
              <Text>Heir</Text>
              <Input
                onChange={(e) => {
                  setHeir(e?.target?.value);
                }}
                pattern="^0x[a-fA-F0-9]{40}$"
                placeholder="0x..."
              />
            </Box>
            <Box>
              <Tooltip label="Timeframe after considered dead (in seconds)">
                <Text>Timeframe</Text>
              </Tooltip>
              <Input
                min="0"
                onChange={(e) => {
                  setTimeframe(Number(e?.target?.value));
                }}
                type="number"
                placeholder="Seconds"
              />
            </Box>
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button bg="#12ff80" isDisabled={isDisabled}>
              LFG
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
