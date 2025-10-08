import "server-only";

import { memoizeWithTtl } from "../cache/memo";

import { normalizeUser, type OktaUser, type User } from "./normalize";

const OKTA_ORG_URL = process.env.OKTA_ORG_URL;
const OKTA_API_TOKEN = process.env.OKTA_API_TOKEN;

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 4;
const CACHE_TTL_MS = 10 * 60 * 1000;

if (!OKTA_ORG_URL) {
  console.warn("OKTA_ORG_URL is not configured. API routes will return empty results.");
}

if (!OKTA_API_TOKEN) {
  console.warn("OKTA_API_TOKEN is not configured. API routes will return empty results.");
}

type FetchOptions = RequestInit & { timeoutMs?: number };

type PaginatedResult = {
  users: User[];
  nextCursor?: string;
};

function buildUrl(path: string, searchParams?: URLSearchParams) {
  if (!OKTA_ORG_URL) {
    throw new Error("Missing Okta configuration");
  }
  const url = new URL(path, OKTA_ORG_URL);
  if (searchParams) {
    url.search = searchParams.toString();
  }
  return url.toString();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoff(attempt: number, retryAfterHeader?: string | null) {
  if (retryAfterHeader) {
    const parsed = Number(retryAfterHeader);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed * 1000;
    }
  }
  const base = 500 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(base + jitter, 5000);
}

async function oktaFetch(path: string, options: FetchOptions = {}, attempt = 0): Promise<Response> {
  if (!OKTA_ORG_URL || !OKTA_API_TOKEN) {
    throw new Error("Okta client not configured");
  }

  const controller = new AbortController();
  const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(buildUrl(path), {
      ...options,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `SSWS ${OKTA_API_TOKEN}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });

    if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS - 1) {
      const wait = computeBackoff(attempt, response.headers.get("retry-after"));
      await delay(wait);
      return oktaFetch(path, options, attempt + 1);
    }

    if (!response.ok) {
      const error = new Error(`Okta request failed with status ${response.status}`);
      throw error;
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError" && attempt < MAX_ATTEMPTS - 1) {
      const wait = computeBackoff(attempt);
      await delay(wait);
      return oktaFetch(path, options, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseNextCursorFromLinkHeader(header: string | null): string | undefined {
  if (!header) {
    return undefined;
  }
  const parts = header.split(",");
  for (const part of parts) {
    const section = part.trim();
    if (!section.includes("rel=\"next\"")) {
      continue;
    }
    const match = section.match(/<([^>]+)>/);
    if (!match) {
      continue;
    }
    const url = new URL(match[1]);
    const after = url.searchParams.get("after") ?? url.searchParams.get("cursor");
    if (after) {
      return after;
    }
  }
  return undefined;
}

async function fetchUsersPage(params: { limit?: number; cursor?: string }): Promise<PaginatedResult> {
  const limit = Math.max(1, Math.min(params.limit ?? 200, 200));
  const searchParams = new URLSearchParams({ limit: String(limit) });
  if (params.cursor) {
    searchParams.set("after", params.cursor);
  }
  const response = await oktaFetch(`/api/v1/users?${searchParams.toString()}`);
  const data = (await response.json()) as OktaUser[];
  const nextCursor = parseNextCursorFromLinkHeader(response.headers.get("link"));
  const users = data.map(normalizeUser);
  return { users, nextCursor };
}

export async function listUsers(params: { limit?: number; cursor?: string }): Promise<PaginatedResult> {
  return memoizeWithTtl(
    `users:${params.cursor ?? "start"}:${params.limit ?? "default"}`,
    CACHE_TTL_MS,
    () => fetchUsersPage(params)
  );
}

export async function fetchUserById(id: string): Promise<User | null> {
  return memoizeWithTtl(`user:${id}`, CACHE_TTL_MS, async () => {
    const response = await oktaFetch(`/api/v1/users/${id}`);
    const data = (await response.json()) as OktaUser;
    return normalizeUser(data);
  }).catch((error) => {
    if (error instanceof Error && /status 404/.test(error.message)) {
      return null;
    }
    throw error;
  });
}

async function fetchAllUsers(): Promise<User[]> {
  const results: User[] = [];
  let cursor: string | undefined;
  do {
    // Okta pagination uses the "after" cursor header to retrieve the next page.
    // We iterate until the API indicates there are no more records or we hit a reasonable cap.
    const { users, nextCursor } = await fetchUsersPage({ cursor, limit: 200 });
    results.push(...users);
    cursor = nextCursor;
  } while (cursor);
  return results;
}

export function listAllUsers(): Promise<User[]> {
  return memoizeWithTtl("users:all", CACHE_TTL_MS, fetchAllUsers);
}

export function getCacheTtlMs() {
  return CACHE_TTL_MS;
}
