import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "../../../components/CopyButton";
import { fetchUserById } from "../../../lib/okta/client";
import { formatDisplay } from "../../../lib/utils";

export default async function UserDetailsPage({ params }: { params: { id: string } }) {
  const user = await fetchUserById(params.id);
  if (!user) {
    notFound();
  }

  const details: Array<{ label: string; value: string | null }> = [
    { label: "Title", value: user.title },
    { label: "Department", value: user.department },
    { label: "Organization", value: user.organization },
    { label: "Cost center", value: user.costCenter },
    { label: "Primary email", value: user.email },
    { label: "Secondary email", value: user.secondEmail },
    { label: "Mobile phone", value: user.mobilePhone },
    { label: "City", value: user.city },
    { label: "State", value: user.state },
    { label: "Postal code", value: user.zipCode },
    { label: "Country", value: user.countryCode },
    { label: "Manager ID", value: user.managerId },
    { label: "Status", value: user.status },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-blue-600">
        ← Back to directory
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-foreground">{formatDisplay(user.displayName)}</h1>
        <p className="text-muted-foreground">{formatDisplay(user.title)}</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {user.email && <CopyButton value={user.email} label="Copy email" />}
        {user.mobilePhone && <CopyButton value={user.mobilePhone} label="Copy phone" />}
      </div>
      <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-sm font-medium text-muted-foreground">{detail.label}</dt>
              <dd className="text-base text-foreground">{formatDisplay(detail.value)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
