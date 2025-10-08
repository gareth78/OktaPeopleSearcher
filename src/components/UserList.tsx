import Link from "next/link";

import type { User } from "../lib/okta/normalize";
import { formatDisplay } from "../lib/utils";

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

type UserListProps = {
  users: User[];
};

export function UserList({ users }: UserListProps) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-white">
      {users.map((user) => {
        const initials = getInitials(user.displayName || `${user.firstName} ${user.lastName}`);
        return (
          <li key={user.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                {initials || "?"}
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{formatDisplay(user.displayName)}</p>
                <p className="text-sm text-muted-foreground">{formatDisplay(user.title)}</p>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-6">
              <span>{formatDisplay(user.department)}</span>
              {user.email ? (
                <a href={`mailto:${user.email}`} className="break-all text-blue-600">
                  {user.email}
                </a>
              ) : (
                <span>{formatDisplay(user.email)}</span>
              )}
              {user.mobilePhone ? (
                <a href={`tel:${user.mobilePhone}`} className="text-blue-600">
                  {user.mobilePhone}
                </a>
              ) : (
                <span>{formatDisplay(user.mobilePhone)}</span>
              )}
            </div>
            <Link href={`/user/${user.id}`} className="text-sm font-medium text-blue-600">
              View details
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
