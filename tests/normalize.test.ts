import { describe, expect, it } from "vitest";

import { deriveLocation, normalizeUser, type OktaUser } from "../src/lib/okta/normalize";

describe("deriveLocation", () => {
  it("combines city and country", () => {
    expect(deriveLocation({ city: "London", countryCode: "gb" })).toBe("London, GB");
  });

  it("handles missing city", () => {
    expect(deriveLocation({ city: null, countryCode: "us" })).toBe("US");
  });

  it("returns null when no data", () => {
    expect(deriveLocation({})).toBeNull();
  });
});

describe("normalizeUser", () => {
  it("normalizes fields and derives display name", () => {
    const user: OktaUser = {
      id: "123",
      status: "ACTIVE",
      profile: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        department: "Engineering",
      },
    };

    const normalized = normalizeUser(user);
    expect(normalized.displayName).toBe("Ada Lovelace");
    expect(normalized.email).toBe("ada@example.com");
    expect(normalized.department).toBe("Engineering");
  });

  it("falls back to Unknown when data is missing", () => {
    const user: OktaUser = {
      id: "123",
      status: "STAGED",
      profile: {},
    };

    const normalized = normalizeUser(user);
    expect(normalized.displayName).toBe("Unknown");
  });
});
