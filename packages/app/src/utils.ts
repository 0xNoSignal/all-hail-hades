export const domain = {
    name: 'AllHailHades',
    version: '0.1.0',
    chainId: 1,  // Use the appropriate chainId; 1 for Ethereum Mainnet
    verifyingContract: '0xYourContractAddressHere',  // Replace with your deployed contract's address
} as const;

export const types = {
    Inheritance: [
        { name: 'heir', type: 'address' },
        { name: 'nonce', type: 'string' },
    ],
} as const;

export const message = {
    heir: '0x000',
    nonce: '0x000'
} as const;