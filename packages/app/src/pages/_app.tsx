import "@/styles/globals.css";
import "@/styles/rain.css";
import "@/styles/horror.css";

import type { AppProps } from "next/app";
import { createWeb3Modal, defaultWagmiConfig } from "@web3modal/wagmi/react";
import { WagmiConfig } from "wagmi";
import { goerli } from "wagmi/chains";
import { ChakraProvider } from "@chakra-ui/react";
import { extendTheme } from "@chakra-ui/react";
import "@fontsource/unifrakturcook";

const projectId = "31a1879c790c5a01028f8eb0571096df";

const metadata = {
  name: "All Hail Hades",
  description: "HADES HADES HADES",
  url: "https://web3modal.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

const chains = [goerli];
const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  themeVariables: {
    "--w3m-accent": "#912914",
    "--w3m-color-mix": "#912914",
    "--w3m-color-mix-strength": 25,
  },
  themeMode: "dark",
});

const theme = extendTheme({
  initialColorMode: "dark",
  useSystemColorMode: false,
  styles: {
    global: {
      html: { height: "100%" },
      body: {
        height: "100%",
        margin: 0,
        overflow: "hidden",
        bgGradient: "linear(to-b, #202020, #111119)",
      },
      // ... Add other global styles
    },
  },
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
