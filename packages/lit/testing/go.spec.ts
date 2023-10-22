import { go } from "../src/go-for-tests";

describe("go function", () => {
  it("should return true if the confirmation time is greater than the given time", async () => {
    const mockFetch: any = (url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                confirmations: [
                  {
                    owner: "0xbaa88DF4D6b62b4791a39882D00e84c18572cDD7",
                    submissionDate: new Date(
                      Date.now() - 1000000
                    ).toISOString(),
                  },
                ],
              },
            ],
            next: null,
          }),
      });
    };

    global.fetch = mockFetch;

    const result = await go(
      "0xB20B9c42e560D4649AE419E34729157fA0a32CEb",
      "0xbaa88DF4D6b62b4791a39882D00e84c18572cDD7",
      500
    );
    expect(result).toBe(true);
  });

  it("should return false if the confirmation time is greater than the given time", async () => {
    const mockFetch: any = (url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                confirmations: [
                  {
                    owner: "0xbaa88DF4D6b62b4791a39882D00e84c18572cDD7",
                    submissionDate: new Date(
                      Date.now() - 100000000
                    ).toISOString(),
                  },
                ],
              },
            ],
            next: null,
          }),
      });
    };

    global.fetch = mockFetch;

    const result = await go(
      "0xB20B9c42e560D4649AE419E34729157fA0a32CEb",
      "0xbaa88DF4D6b62b4791a39882D00e84c18572cDD7",
      100000000 + 1
    );
    expect(result).toBe(false);
  });

  // ... other test cases

  afterAll(() => {
    global.fetch = originalFetch; // Restore the original fetch function
  });
});

const originalFetch = global.fetch; // Store the original fetch function
