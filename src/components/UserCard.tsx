import Link from "next/link";

import type { User } from "../lib/okta/normalize";
import { formatDisplay } from "../lib/utils";

function getInitials(displayName: string) {
  const [first = "", second = ""] = displayName.split(" ");
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

type UserCardProps = {
  user: User;
};

export function UserCard({ user }: UserCardProps) {
  const initials = getInitials(user.displayName || `${user.firstName} ${user.lastName}`);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">
          {initials || "?"}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">{formatDisplay(user.displayName)}</p>
          <p className="text-sm text-muted-foreground">{formatDisplay(user.title)}</p>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
        <div>
          <dt className="font-medium text-foreground">Department</dt>
          <dd>{formatDisplay(user.department)}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Email</dt>
          <dd>
            {user.email ? (
              <a href={`mailto:${user.email}`} className="break-all">
                {user.email}
              </a>
            ) : (
              formatDisplay(user.email)
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Phone</dt>
          <dd>
            {user.mobilePhone ? (
              <a href={`tel:${user.mobilePhone}`} className="break-all">
                {user.mobilePhone}
              </a>
            ) : (
              formatDisplay(user.mobilePhone)
            )}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Location</dt>
          <dd>{formatDisplay(user.location)}</dd>
        </div>
      </dl>
      <Link href={`/user/${user.id}`} className="text-sm font-medium text-blue-600">
        View details
      </Link>
    </div>
  );
}
