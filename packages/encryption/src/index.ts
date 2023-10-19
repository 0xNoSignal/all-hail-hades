import * as LitJsSdk from "@lit-protocol/lit-node-client";

async function encryptText(text: string) {
  // -- init litNodeClient
  // const litNodeClient = new LitJsSdk.LitNodeClient();

  // -- same thing, but without browser auth
  try {
    const client = new LitJsSdk.LitNodeClient([]);
    const chain = "ethereum";
    await client.connect();

    const messageToEncrypt = text;

    const accessControlConditions = [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "eth_getBalance",
        parameters: [":userAddress", "latest"],
        returnValueTest: {
          comparator: ">=",
          value: "1000000000000", // 0.000001 ETH
        },
      },
    ];

    const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain });
    const { encryptedString, symmetricKey } = await LitJsSdk.encryptString(
      messageToEncrypt
    );

    const encryptedSymmetricKey = await client.saveEncryptionKey({
      accessControlConditions,
      symmetricKey,
      authSig,
      chain,
    });

    console.log("encryptedSymmetricKey:", encryptedSymmetricKey);
    console.log("encryptedString:", encryptedString);

    // // 3. Decrypt it
    // // <String> toDecrypt
    // const toDecrypt = LitJsSdk.uint8arrayToString(
    //   encryptedSymmetricKey,
    //   "base16"
    // );

    // // <Uint8Array(32)> _symmetricKey
    // const _symmetricKey = await client.getEncryptionKey({
    //   accessControlConditions,
    //   toDecrypt,
    //   chain,
    //   authSig,
    // });

    // // <String> decryptedString
    // let decryptedString;

    // try {
    //   decryptedString = await LitJsSdk.decryptString(
    //     encryptedString,
    //     _symmetricKey
    //   );
    // } catch (e) {
    //   console.log(e);
    // }

    // console.warn("decryptedString:", decryptedString);
  } catch (e) {
    console.log(e);
  }
}

encryptText("hello world");
