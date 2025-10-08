export type OktaUserProfile = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobilePhone?: string | null;
  secondEmail?: string | null;
  department?: string | null;
  title?: string | null;
  organization?: string | null;
  costCenter?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  countryCode?: string | null;
  managerId?: string | null;
  displayName?: string | null;
};

export type OktaUser = {
  id: string;
  status: string;
  profile: OktaUserProfile;
};

export type User = {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  secondEmail: string | null;
  mobilePhone: string | null;
  department: string | null;
  title: string | null;
  organization: string | null;
  costCenter: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  countryCode: string | null;
  managerId: string | null;
  location: string | null;
};

function normalizeName(value?: string | null) {
  return value?.trim() ?? "";
}

export function deriveLocation(profile: OktaUserProfile): string | null {
  const city = profile.city?.trim();
  const country = profile.countryCode?.trim();
  if (city && country) {
    return `${city}, ${country.toUpperCase()}`;
  }
  if (city) {
    return city;
  }
  if (country) {
    return country.toUpperCase();
  }
  return null;
}

export function normalizeUser(user: OktaUser): User {
  const profile = user.profile ?? {};
  const firstName = normalizeName(profile.firstName);
  const lastName = normalizeName(profile.lastName);
  const displayName = normalizeName(profile.displayName) || `${firstName} ${lastName}`.trim() || firstName || lastName || "Unknown";
  return {
    id: user.id,
    status: user.status,
    firstName,
    lastName,
    displayName,
    email: profile.email?.trim() ?? null,
    secondEmail: profile.secondEmail?.trim() ?? null,
    mobilePhone: profile.mobilePhone?.trim() ?? null,
    department: profile.department?.trim() ?? null,
    title: profile.title?.trim() ?? null,
    organization: profile.organization?.trim() ?? null,
    costCenter: profile.costCenter?.trim() ?? null,
    city: profile.city?.trim() ?? null,
    state: profile.state?.trim() ?? null,
    zipCode: profile.zipCode?.trim() ?? null,
    countryCode: profile.countryCode?.trim() ?? null,
    managerId: profile.managerId?.trim() ?? null,
    location: deriveLocation(profile),
  };
}
