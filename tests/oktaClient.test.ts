import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearCache } from "../src/lib/cache/memo";

const originalFetch = globalThis.fetch;

vi.mock("server-only", () => ({}));

const okResponse = (data: unknown, headers?: Record<string, string>) => ({
  ok: true,
  status: 200,
  json: async () => data,
  headers: new Headers(headers),
});

const errorResponse = (status: number, headers?: Record<string, string>) => ({
  ok: false,
  status,
  json: async () => ({}),
  headers: new Headers(headers),
});

beforeEach(() => {
  vi.resetModules();
  process.env.OKTA_ORG_URL = "https://example.okta.com";
  process.env.OKTA_API_TOKEN = "token";
  clearCache();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

describe("Okta client", () => {
  it("parses pagination cursor from link header", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        okResponse(
          [
            {
              id: "1",
              status: "ACTIVE",
              profile: { firstName: "Ada", lastName: "Lovelace" },
            },
          ],
          { link: "<https://example.okta.com/api/v1/users?after=abc>; rel=\"next\"" }
        )
      );

    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;
    const { listUsers } = await import("../src/lib/okta/client");
    const result = await listUsers({ limit: 1 });

    expect(result.users[0].displayName).toBe("Ada Lovelace");
    expect(result.nextCursor).toBe("abc");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries when Okta responds with rate limiting", async () => {
    vi.useFakeTimers();
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(
        okResponse([
          {
            id: "1",
            status: "ACTIVE",
            profile: { firstName: "Ada", lastName: "Lovelace" },
          },
        ])
      );

    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;
    const { listUsers } = await import("../src/lib/okta/client");
    const promise = listUsers({ limit: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.users).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
