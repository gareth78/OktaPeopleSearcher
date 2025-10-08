export async function GET() {
  const base = (process.env.OKTA_ORG_URL || "").replace(/\/+$/, "");
  const token = process.env.OKTA_API_TOKEN;
  if (!base || !token) return new Response("Missing env", { status: 500 });

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/api/v1/users?limit=1`, {
      headers: { Authorization: `SSWS ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    const ok = res.ok;
    const status = res.status;
    let sample: number | undefined;
    try {
      const body = await res.json();
      sample = Array.isArray(body) ? body.length : undefined;
    } catch {}
    return Response.json({ ok, status, sample });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError") {
      return Response.json({ ok: false, error: "timeout" }, { status: 504 });
    }
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, error: message },
      { status: 504 }
    );
  } finally {
    clearTimeout(t);
  }
}
