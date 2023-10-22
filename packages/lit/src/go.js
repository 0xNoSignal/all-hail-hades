const go = async (safeAddress, ownerAddress, timeInSeconds) => {
  // default to 1 hour
  const baseURL = `https://safe-transaction-goerli.safe.global/api/v1/safes/${safeAddress}/all-transactions/`;
  let nextURL = baseURL;
  let found = false;

  while (nextURL && !found) {
    try {
      const tIns =
        typeof timeInSeconds === "number"
          ? timeInSeconds
          : Number(timeInSeconds);
      const response = await fetch(nextURL, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      for (const transaction of data.results) {
        if (transaction.confirmations) {
          for (const confirmation of transaction.confirmations) {
            if (
              confirmation.owner.toLowerCase() === ownerAddress.toLowerCase()
            ) {
              found = true; // break the loop since we found a confirmation from the owner
              const submissionDate = new Date(confirmation.submissionDate);
              const timeDifference = (new Date() - submissionDate) / 1000;
              if (timeDifference > tIns) {
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
