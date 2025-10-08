import { NextResponse } from "next/server";
import { z } from "zod";

import { usersToCsvStream } from "../../../lib/csv/export";
import { listAllUsers } from "../../../lib/okta/client";
import type { User } from "../../../lib/okta/normalize";

const querySchema = z.object({
  query: z.string().max(100).optional(),
  departments: z.array(z.string().min(1).max(100)).optional(),
  location: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(200).default(25),
  cursor: z.number().int().min(0).default(0),
  sort: z.enum(["name", "department", "location"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const bodySchema = z.object({
  query: z.string().max(100).optional(),
  departments: z.array(z.string().min(1).max(100)).optional(),
  location: z.string().max(100).optional(),
  sort: z.enum(["name", "department", "location"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

function sanitizeDepartments(raw: URLSearchParams): string[] | undefined {
  const values = raw.getAll("department").filter(Boolean);
  if (values.length === 0) {
    const single = raw.get("department");
    if (single) {
      return single.split(",").map((value) => value.trim()).filter(Boolean);
    }
    return undefined;
  }
  return values.map((value) => value.trim()).filter(Boolean);
}

function sanitizeCursor(value: string | null) {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error("Invalid cursor");
  }
  return parsed;
}

function sanitizeLimit(value: string | null) {
  if (!value) {
    return 25;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
    throw new Error("Invalid limit");
  }
  return parsed;
}

function toComparable(value: string | null | undefined) {
  return value?.toLowerCase() ?? "";
}

function sortUsers(users: User[], sort: "name" | "department" | "location", direction: "asc" | "desc") {
  const modifier = direction === "asc" ? 1 : -1;
  const keySelector: Record<typeof sort, (user: User) => string> = {
    name: (user) => toComparable(user.displayName || user.firstName || user.lastName),
    department: (user) => toComparable(user.department),
    location: (user) => toComparable(user.location),
  };
  const select = keySelector[sort];
  return [...users].sort((a, b) => {
    const aKey = select(a);
    const bKey = select(b);
    if (aKey === bKey) {
      return a.displayName.localeCompare(b.displayName) * modifier;
    }
    return aKey.localeCompare(bKey) * modifier;
  });
}

function matchesQuery(user: User, query?: string) {
  if (!query) {
    return true;
  }
  const term = query.toLowerCase();
  const fields = [
    user.displayName,
    `${user.firstName} ${user.lastName}`,
    user.email,
    user.secondEmail,
    user.mobilePhone,
  ];
  return fields.some((field) => field?.toLowerCase().includes(term));
}

function matchesFilters(user: User, departmentSet?: Set<string>, location?: string) {
  const normalizedLocation = location?.toLowerCase();
  if (departmentSet && departmentSet.size > 0) {
    if (!user.department) {
      return false;
    }
    const normalized = user.department.toLowerCase();
    if (!departmentSet.has(normalized)) {
      return false;
    }
  }

  if (normalizedLocation) {
    if (!user.location) {
      return false;
    }
    if (user.location.toLowerCase() !== normalizedLocation) {
      return false;
    }
  }

  return true;
}

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
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    let departments: string[] | undefined;
    try {
      departments = sanitizeDepartments(searchParams);
    } catch (error) {
      return NextResponse.json({ error: "Invalid department filter" }, { status: 400 });
    }

    let cursor: number;
    let limit: number;
    try {
      cursor = sanitizeCursor(searchParams.get("cursor"));
      limit = sanitizeLimit(searchParams.get("limit"));
    } catch (error) {
      return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
    }

    const parsed = querySchema.safeParse({
      query: searchParams.get("query") ?? undefined,
      departments,
      location: searchParams.get("location") ?? undefined,
      limit,
      cursor,
      sort: searchParams.get("sort") ?? undefined,
      direction: searchParams.get("direction") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const { query, departments: departmentFilters, location, sort, direction } = parsed.data;
    const limitValue = parsed.data.limit;
    const offset = parsed.data.cursor;

    const users = await listAllUsers();
    const departmentSet = departmentFilters
      ? new Set(departmentFilters.map((value) => value.toLowerCase()))
      : undefined;
    const filtered = users.filter(
      (user) => matchesQuery(user, query) && matchesFilters(user, departmentSet, location)
    );

    const sorted = sortUsers(filtered, sort, direction);
    const pageUsers = sorted.slice(offset, offset + limitValue);
    const nextCursor = offset + limitValue < sorted.length ? offset + limitValue : undefined;

    const response = NextResponse.json({
      total: sorted.length,
      users: pageUsers,
      nextCursor,
      limit: limitValue,
    });
    response.headers.set("Cache-Control", "no-store");

    logRequest(request, 200, startedAt);
    return response;
  } catch (error) {
    logRequest(request, 500, startedAt);
    return NextResponse.json({ error: "Unable to load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { query, departments, location, sort, direction } = parsed.data;
    const users = await listAllUsers();
    const departmentSet = departments ? new Set(departments.map((value) => value.toLowerCase())) : undefined;
    const filtered = users.filter(
      (user) => matchesQuery(user, query) && matchesFilters(user, departmentSet, location)
    );
    const sorted = sortUsers(filtered, sort, direction);

    const stream = usersToCsvStream(sorted);

    const response = new NextResponse(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=users.csv",
      },
    });
    response.headers.set("Cache-Control", "no-store");

    logRequest(request, 200, startedAt);
    return response;
  } catch (error) {
    logRequest(request, 500, startedAt);
    return NextResponse.json({ error: "Unable to export users" }, { status: 500 });
  }
}
