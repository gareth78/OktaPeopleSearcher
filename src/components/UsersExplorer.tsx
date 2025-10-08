"use client";

import { LayoutGrid, ListOrdered } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import type { User } from "../lib/okta/normalize";

import { ExportCsvButton } from "./ExportCsvButton";
import { Filters } from "./Filters";
import { Pagination } from "./Pagination";
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

const PAGE_SIZE = 25;

type SortOption = "name" | "department" | "location";
type DirectionOption = "asc" | "desc";

type UsersResponse = {
  total: number;
  users: User[];
  nextCursor?: number;
  limit: number;
};

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
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"list" | "grid">("list");
  const prefetchedPages = useRef(new Map<number, UsersResponse>());

  useEffect(() => {
    async function loadFilters() {
      try {
        const [departmentsResponse, locationsResponse] = await Promise.all([
          fetch("/api/departments").then((res) => res.json()),
          fetch("/api/locations").then((res) => res.json()),
        ]);
        setDepartments(departmentsResponse.departments ?? []);
        setLocations(locationsResponse.locations ?? []);
      } catch (fetchError) {
        console.error("Failed to load filters", fetchError);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    setPendingQuery(query);
  }, [query]);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    selectedDepartments.forEach((department) => params.append("department", department));
    if (selectedLocation) params.set("location", selectedLocation);
    params.set("limit", String(PAGE_SIZE));
    params.set("cursor", String(offset));
    params.set("sort", sort);
    params.set("direction", direction);
    return params;
  }, [query, selectedDepartments, selectedLocation, offset, sort, direction]);

  async function fetchUsers(params: URLSearchParams) {
    const response = await fetch(`/api/users?${params.toString()}`);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("OrgContact is busy. Please try again shortly.");
      }
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Unable to load people right now.");
    }
    return (await response.json()) as UsersResponse;
  }

  useEffect(() => {
    let isCancelled = false;
    async function loadUsers() {
      try {
        setError(null);
        setIsLoading(true);
        const result = prefetchedPages.current.get(offset) ?? (await fetchUsers(searchParams));
        if (isCancelled) return;
        prefetchedPages.current.delete(offset);
        setData(result);
        const { nextCursor } = result;
        if (typeof nextCursor === "number") {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("cursor", String(nextCursor));
          fetchUsers(nextParams)
            .then((nextPage) => {
              prefetchedPages.current.set(nextCursor, nextPage);
            })
            .catch(() => {
              /* ignore prefetch errors */
            });
        }
      } catch (loadError) {
        if (isCancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load people");
        setData(null);
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
  }, [searchParams, offset]);

  function handleSearchSubmit() {
    startTransition(() => {
      setQuery(pendingQuery.trim());
      setOffset(0);
      prefetchedPages.current.clear();
    });
  }

  function handleApplyFilters(newDepartments: string[], newLocation: string | null) {
    setSelectedDepartments(newDepartments);
    setSelectedLocation(newLocation);
    setOffset(0);
    prefetchedPages.current.clear();
  }

  const total = data?.total ?? 0;
  const users = data?.users ?? [];

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
              setOffset(0);
              prefetchedPages.current.clear();
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
              setOffset(0);
              prefetchedPages.current.clear();
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
          <ExportCsvButton
            query={query}
            departments={selectedDepartments}
            location={selectedLocation}
            sort={sort}
            direction={direction}
          />
          <div className="flex items-center gap-1 rounded-md border border-border bg-white p-1">
            <Button
              type="button"
              variant={view === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={view === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setView("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && !error && !data && (
        <div className="rounded-md border border-border bg-white p-4 text-sm text-muted-foreground">
          Loading people…
        </div>
      )}

      {!error && !isLoading && users.length === 0 && (
        <div className="rounded-md border border-border bg-white p-6 text-center text-muted-foreground">
          {query || selectedDepartments.length > 0 || selectedLocation
            ? "No results match your filters yet."
            : "No people yet."}
        </div>
      )}

      {!error && users.length > 0 && (
        <div>
          {view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          ) : (
            <UserList users={users} />
          )}
        </div>
      )}

      {!error && data && (
        <Pagination
          total={total}
          limit={PAGE_SIZE}
          offset={offset}
          onOffsetChange={(newOffset) => {
            setOffset(newOffset);
          }}
        />
      )}
    </div>
  );
}
