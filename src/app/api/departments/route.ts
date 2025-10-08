import { fetchDepartments } from "../../../lib/okta/client";

export async function GET() {
  const t0 = Date.now();
  try {
    const data = await fetchDepartments();
    return Response.json({ ok: true, data, tookMs: Date.now() - t0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("departments API error:", message);
    return Response.json(
      { ok: false, error: message, tookMs: Date.now() - t0 },
      { status: 502 }
    );
  }
}
