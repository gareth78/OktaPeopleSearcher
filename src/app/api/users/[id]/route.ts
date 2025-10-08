import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchUserById } from "../../../../lib/okta/client";

const paramsSchema = z.object({
  id: z.string().min(1).max(200),
});

function logRequest(request: Request, status: number, startedAt: number) {
  const duration = Date.now() - startedAt;
  const url = new URL(request.url);
  console.info(
    JSON.stringify({
      method: request.method,
      path: url.pathname,
      status,
      durationMs: duration,
    })
  );
}

export async function GET(request: Request, context: { params: { id: string } }) {
  const startedAt = Date.now();
  try {
    const parsed = paramsSchema.safeParse(context.params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }
    const user = await fetchUserById(parsed.data.id);
    if (!user) {
      logRequest(request, 404, startedAt);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    logRequest(request, 200, startedAt);
    const response = NextResponse.json(user);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logRequest(request, 500, startedAt);
    return NextResponse.json({ error: "Unable to load user" }, { status: 500 });
  }
}
