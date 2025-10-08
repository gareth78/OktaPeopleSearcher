import { NextResponse } from "next/server";

import { listAllUsers } from "../../../lib/okta/client";

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

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    const users = await listAllUsers();
    const departments = Array.from(
      new Set(users.map((user) => user.department).filter((value): value is string => Boolean(value)))
    ).sort((a, b) => a.localeCompare(b));
    logRequest(request, 200, startedAt);
    const response = NextResponse.json({ departments });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logRequest(request, 500, startedAt);
    return NextResponse.json({ error: "Unable to load departments" }, { status: 500 });
  }
}
