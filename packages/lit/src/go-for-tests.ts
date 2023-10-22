export const go = async (
  safeAddress: string,
  ownerAddress: string,
  timeInSeconds: number
) => {
  const baseURL = `https://safe-transaction-goerli.safe.global/api/v1/safes/${safeAddress}/all-transactions/`;
  let nextURL = baseURL;
  let found = false;

  while (nextURL && !found) {
    try {
      const response = await fetch(nextURL, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as Root;

      for (const transaction of data.results) {
        if (transaction.confirmations) {
          for (const confirmation of transaction.confirmations) {
            if (
              confirmation.owner.toLowerCase() === ownerAddress.toLowerCase()
            ) {
              found = true; // break the loop since we found a confirmation from the owner
              const submissionDate = new Date(confirmation.submissionDate);
              const timeDifference =
                (new Date().getTime() - submissionDate.getTime()) / 1000;

              if (timeDifference > timeInSeconds) {
                return true;
              } else {
                return false;
              }
            }
          }
        }
        if (found) break; // exit the loop early if we've already processed the owner's confirmation
      }

      if (!found) {
        nextURL = data.next;
      }
    } catch (error) {
      return false;
    }
  }

  return false;
};

export interface Root {
  count: number;
  next: any;
  previous: any;
  results: Result[];
}

export interface Result {
  executionDate: string;
  to: string;
  data: string;
  txHash?: string;
  blockNumber: number;
  transfers: Transfer[];
  txType: string;
  from?: string;
  safe?: string;
  value?: string;
  operation?: number;
  gasToken?: string;
  safeTxGas?: number;
  baseGas?: number;
  gasPrice?: string;
  refundReceiver?: string;
  nonce?: number;
  submissionDate?: string;
  modified?: string;
  transactionHash?: string;
  safeTxHash?: string;
  executor?: string;
  isExecuted?: boolean;
  isSuccessful?: boolean;
  ethGasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasUsed?: number;
  fee?: string;
  origin?: string;
  dataDecoded?: DataDecoded;
  confirmationsRequired?: number;
  confirmations?: Confirmation[];
  trusted?: boolean;
  signatures?: string;
}

export interface Transfer {
  type: string;
  executionDate: string;
  blockNumber: number;
  transactionHash: string;
  to: string;
  value: string;
  tokenId: any;
  tokenAddress: string;
  transferId: string;
  tokenInfo: TokenInfo;
  from: string;
}

export interface TokenInfo {
  type: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUri: string;
}

export interface DataDecoded {
  method: string;
  parameters: Parameter[];
}

export interface Parameter {
  name: string;
  type: string;
  value: string;
}

export interface Confirmation {
  owner: string;
  submissionDate: string;
  transactionHash: any;
  signature: string;
  signatureType: string;
}
