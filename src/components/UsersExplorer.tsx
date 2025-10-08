"use client";

import { LayoutGrid, ListOrdered } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { normalizeUser, type OktaUser, type User } from "../lib/okta/normalize";

import { ExportCsvButton } from "./ExportCsvButton";
import { Filters } from "./Filters";
import { SearchBar } from "./SearchBar";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { UserCard } from "./UserCard";
import { UserList } from "./UserList";

const FETCH_LIMIT = 200;

type DirectionOption = "asc" | "desc";
type SortOption = "name" | "department" | "location";

type UsersResponse = {
  ok: boolean;
  data: unknown;
  error?: string;
};

function toComparable(value: string | null | undefined) {
  return value?.toLowerCase() ?? "";
}

function sortUsers(users: User[], sort: SortOption, direction: DirectionOption) {
  const modifier = direction === "asc" ? 1 : -1;
  const keySelector: Record<SortOption, (user: User) => string> = {
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

function matchesQuery(user: User, query: string | undefined) {
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

function matchesFilters(user: User, departmentSet?: Set<string>, location?: string | null) {
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

function normalizeUsers(payload: unknown): User[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  const result: User[] = [];
  for (const entry of payload) {
    try {
      result.push(normalizeUser(entry as OktaUser));
    } catch (error) {
      console.warn("Failed to normalize Okta user", error);
    }
  }
  return result;
}

export function UsersExplorer() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "OrgContact";
  const [query, setQuery] = useState("");
  const [pendingQuery, setPendingQuery] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("name");
  const [direction, setDirection] = useState<DirectionOption>("asc");
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"list" | "grid">("list");

  useEffect(() => {
    async function loadFilters() {
      try {
        const [departmentsResponse, locationsResponse] = await Promise.all([
          fetch("/api/departments", { cache: "no-store" }).then((res) => res.json()),
          fetch("/api/locations", { cache: "no-store" }).then((res) => res.json()),
        ]);
        const deptPayload = departmentsResponse as UsersResponse;
        const locPayload = locationsResponse as UsersResponse;
        setDepartments(Array.isArray(deptPayload.data) ? (deptPayload.data as string[]) : []);
        setLocations(Array.isArray(locPayload.data) ? (locPayload.data as string[]) : []);
      } catch (fetchError) {
        console.error("Failed to load filters", fetchError);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    setPendingQuery(query);
  }, [query]);

  useEffect(() => {
    let isCancelled = false;
    async function loadUsers() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/users?limit=${FETCH_LIMIT}`, { cache: "no-store" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as UsersResponse | null;
          throw new Error(payload?.error || "Unable to load people right now.");
        }
        const payload = (await response.json()) as UsersResponse;
        if (!payload.ok) {
          throw new Error(payload.error || "Unable to load people right now.");
        }
        const normalized = normalizeUsers(payload.data);
        if (!isCancelled) {
          setUsers(normalized);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load people");
          setUsers([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }
    loadUsers();
    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const departmentSet =
      selectedDepartments.length > 0
        ? new Set(selectedDepartments.map((value) => value.toLowerCase()))
        : undefined;
    const normalizedLocation = selectedLocation ? selectedLocation.toLowerCase() : null;
    return users.filter(
      (user) => matchesQuery(user, query) && matchesFilters(user, departmentSet, normalizedLocation)
    );
  }, [query, selectedDepartments, selectedLocation, users]);

  const sortedUsers = useMemo(() => sortUsers(filteredUsers, sort, direction), [
    filteredUsers,
    sort,
    direction,
  ]);

  function handleSearchSubmit() {
    startTransition(() => {
      setQuery(pendingQuery.trim());
    });
  }

  function handleApplyFilters(newDepartments: string[], newLocation: string | null) {
    setSelectedDepartments(newDepartments);
    setSelectedLocation(newLocation);
  }

  const total = sortedUsers.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">{appName}</h1>
        <p className="text-muted-foreground">
          Search and explore colleagues across the organisation.
        </p>
      </div>

      <SearchBar
        value={pendingQuery}
        onChange={setPendingQuery}
        onSubmit={handleSearchSubmit}
        isLoading={isPending || isLoading}
      />

      <Filters
        departments={departments}
        locations={locations}
        selectedDepartments={selectedDepartments}
        selectedLocation={selectedLocation}
        onDepartmentsChange={(values) => handleApplyFilters(values, selectedLocation)}
        onLocationChange={(value) => handleApplyFilters(selectedDepartments, value)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as SortOption);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="name">Name (A to Z)</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={direction}
            onValueChange={(value) => {
              setDirection(value as DirectionOption);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
            className="flex items-center gap-2"
          >
            <ListOrdered className="h-4 w-4" /> List view
          </Button>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            onClick={() => setView("grid")}
            className="flex items-center gap-2"
          >
            <LayoutGrid className="h-4 w-4" /> Grid view
          </Button>
          <ExportCsvButton users={sortedUsers} disabled={sortedUsers.length === 0} />
        </div>
      </div>

      {error && <p className="bg-destructive/10 text-destructive rounded-md p-3">{error}</p>}

      {!error && isLoading && <p className="text-muted-foreground">Loading people…</p>}

      {!error && !isLoading && total === 0 && (
        <p className="text-muted-foreground">No people matched your filters.</p>
      )}

      {!error && !isLoading && total > 0 && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">Showing {total} people.</p>
          {view === "list" ? (
            <UserList users={sortedUsers} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
