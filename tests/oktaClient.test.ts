import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;

vi.mock("server-only", () => ({}));

const okResponse = (data: unknown, headers?: Record<string, string>) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => data,
  text: async () => JSON.stringify(data),
  headers: new Headers(headers),
});

const errorResponse = (status: number, headers?: Record<string, string>) => ({
  ok: false,
  status,
  statusText: "Error",
  json: async () => ({}),
  text: async () => "",
  headers: new Headers(headers),
});

beforeEach(() => {
  vi.resetModules();
  process.env.OKTA_ORG_URL = "https://example.okta.com";
  process.env.OKTA_API_TOKEN = "token";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

describe("Okta client", () => {
  it("attaches next cursor metadata when available", async () => {
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
    const { fetchUsers } = await import("../src/lib/okta/client");
    const result = await fetchUsers({ limit: 1 });

    expect(Array.isArray(result)).toBe(true);
    expect((result as any).nextCursor).toBe("abc");
    expect((result as any)[0].profile.firstName).toBe("Ada");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries once when Okta responds with rate limiting", async () => {
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
    const { fetchUsers } = await import("../src/lib/okta/client");
    const promise = fetchUsers({ limit: 1 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(Array.isArray(result)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns null when a user is not found", async () => {
    const mockFetch = vi.fn().mockResolvedValue(errorResponse(404));
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

    const { fetchUserById } = await import("../src/lib/okta/client");
    const user = await fetchUserById("missing");

    expect(user).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
