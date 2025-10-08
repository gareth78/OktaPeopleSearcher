import { NextRequest } from "next/server";

import { fetchUsers } from "../../../lib/okta/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 25);
  const cursor = searchParams.get("cursor") || "";
  const t0 = Date.now();

  try {
    const data = await fetchUsers({ limit, cursor });
    return Response.json({ ok: true, data, tookMs: Date.now() - t0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("users API error:", message);
    return Response.json(
      { ok: false, error: message, tookMs: Date.now() - t0 },
      { status: 502 }
    );
  }
}
