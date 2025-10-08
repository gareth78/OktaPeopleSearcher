import { type User } from "../okta/normalize";

const HEADER = [
  "id",
  "displayName",
  "firstName",
  "lastName",
  "email",
  "secondEmail",
  "mobilePhone",
  "department",
  "title",
  "organization",
  "costCenter",
  "city",
  "state",
  "zipCode",
  "countryCode",
  "location",
  "status"
];

function escapeValue(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  const trimmed = value.toString();
  const needsQuotes = /[",\n]/.test(trimmed);
  const sanitized = trimmed.replace(/"/g, '""');
  return needsQuotes ? `"${sanitized}"` : sanitized;
}

export function usersToCsvStream(users: User[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`${HEADER.join(",")}\n`));
    },
    pull(controller) {
      if (index >= users.length) {
        controller.close();
        return;
      }
      const user = users[index++];
      const row = [
        user.id,
        user.displayName,
        user.firstName,
        user.lastName,
        user.email,
        user.secondEmail,
        user.mobilePhone,
        user.department,
        user.title,
        user.organization,
        user.costCenter,
        user.city,
        user.state,
        user.zipCode,
        user.countryCode,
        user.location,
        user.status
      ]
        .map((value) => escapeValue(value))
        .join(",");
      controller.enqueue(encoder.encode(`${row}\n`));
    },
  });
}
