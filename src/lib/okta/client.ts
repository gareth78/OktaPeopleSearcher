import "server-only";

import { normalizeUser, type User } from "./normalize";

type OktaConfig = { base: string; token: string };

let cachedConfig: OktaConfig | null = null;

function getOktaConfig(): OktaConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  const base = (process.env.OKTA_ORG_URL || "").replace(/\/+$/, "");
  const token = process.env.OKTA_API_TOKEN;
  if (!base || !token) {
    throw new Error("Missing OKTA_ORG_URL / OKTA_API_TOKEN");
  }
  cachedConfig = { base, token };
  return cachedConfig;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

function shouldRetry(status: number) {
  return status === 429 || (status >= 500 && status < 600);
}

type RetryOpts = { maxRetries?: number; initialDelayMs?: number; timeoutMs?: number };

type AugmentedError = Error & { __oktaDontRetry?: boolean };

async function rawOktaRequest(path: string, opts: RetryOpts = {}) {
  const { maxRetries = 1, initialDelayMs = 400, timeoutMs = 8000 } = opts;
  let attempt = 0,
    delay = initialDelayMs,
    lastErr: unknown = null;

  while (attempt <= maxRetries) {
    try {
      const { base, token } = getOktaConfig();
      const res = await fetchWithTimeout(
        `${base}${path}`,
        {
          headers: { Authorization: `SSWS ${token}` },
        },
        timeoutMs
      );

      if (!res.ok) {
        if (shouldRetry(res.status) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delay + Math.floor(Math.random() * 200)));
          attempt += 1;
          delay *= 2;
          continue;
        }
        const txt = await res.text().catch(() => "");
        const error: AugmentedError = new Error(
          `Okta ${res.status} ${res.statusText} ${txt.slice(0, 200)}`
        );
        error.__oktaDontRetry = true;
        throw error;
      }
      return res;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delay));
          attempt += 1;
          delay *= 2;
          continue;
        }
        lastErr = new Error("Okta request timed out");
        break;
      }
      if (err instanceof Error && (err as AugmentedError).__oktaDontRetry) {
        lastErr = err;
        break;
      }
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
        attempt += 1;
        delay *= 2;
        continue;
      }
      break;
    }
  }
  if (lastErr instanceof Error) {
    throw lastErr;
  }
  throw new Error(lastErr ? String(lastErr) : "Unknown Okta error");
}

async function oktaRequest(path: string, opts: RetryOpts = {}) {
  const res = await rawOktaRequest(path, opts);
  return res.json();
}

function parseNextCursor(linkHeader: string | null) {
  if (!linkHeader) return undefined;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const section = part.trim();
    if (!section.includes('rel="next"')) continue;
    const match = section.match(/<([^>]+)>/);
    if (!match) continue;
    try {
      const url = new URL(match[1]);
      const after = url.searchParams.get("after") ?? url.searchParams.get("cursor");
      if (after) return after;
    } catch (error) {
      console.warn("Failed to parse Okta link header", error);
    }
  }
  return undefined;
}

export async function fetchUsers({ limit = 25, cursor = "" } = {}) {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  if (cursor) qs.set("after", cursor);
  const res = await rawOktaRequest(`/api/v1/users?${qs.toString()}`);
  const data = (await res.json()) as unknown;
  const list = Array.isArray(data) ? data : [];
  const withCursor = list as (typeof list & { nextCursor?: string });
  withCursor.nextCursor = parseNextCursor(res.headers.get("link"));
  return withCursor;
}

export async function fetchDepartments() {
  const page = await oktaRequest(`/api/v1/users?limit=200`);
  const set = new Set<string>();
  for (const u of Array.isArray(page) ? page : []) {
    const d = u?.profile?.department;
    if (d) set.add(String(d));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function fetchLocations() {
  const page = await oktaRequest(`/api/v1/users?limit=200`);
  const set = new Set<string>();
  for (const u of Array.isArray(page) ? page : []) {
    const city = u?.profile?.city?.trim();
    const cc = u?.profile?.countryCode?.trim();
    const loc = city && cc ? `${city}, ${cc}` : city || cc;
    if (loc) set.add(loc);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function fetchUserById(id: string): Promise<User | null> {
  try {
    const data = await oktaRequest(`/api/v1/users/${encodeURIComponent(id)}`);
    return normalizeUser(data);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

// * TASK should be pulled from the exported env var
// * Task description should be 'Your actual task description'
