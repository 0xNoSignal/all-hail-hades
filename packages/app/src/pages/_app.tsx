import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { WagmiConfig } from "wagmi";
import { goerli } from "wagmi/chains";
import { ChakraProvider } from "@chakra-ui/react";
import { extendTheme } from "@chakra-ui/react";

const projectId = "31a1879c790c5a01028f8eb0571096df";

const metadata = {
  name: "All Hail Hades",
  description: "HADES HADES HADES",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const chains = [goerli];
const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

createWeb3Modal({ wagmiConfig, projectId, chains });

const theme = extendTheme({
  initialColorMode: "dark",
  useSystemColorMode: false,
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <WagmiConfig config={wagmiConfig}>
        <Component {...pageProps} />
      </WagmiConfig>
    </ChakraProvider>
  );
}
