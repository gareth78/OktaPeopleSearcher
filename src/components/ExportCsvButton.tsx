"use client";

import { useState } from "react";

import type { User } from "../lib/okta/normalize";

import { Button } from "./ui/button";

type ExportCsvButtonProps = {
  users: User[];
  disabled?: boolean;
};

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
  "status",
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

function buildCsv(users: User[]) {
  const rows = [HEADER.join(",")];
  for (const user of users) {
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
      user.status,
    ]
      .map((value) => escapeValue(value))
      .join(",");
    rows.push(row);
  }
  return rows.join("\n");
}

export function ExportCsvButton({ users, disabled }: ExportCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!users.length) {
      return;
    }
    setIsExporting(true);
    try {
      const csv = buildCsv(users);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "users.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      alert("Unable to export right now. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={disabled || isExporting}>
      {isExporting ? "Preparing CSV…" : "Export CSV"}
    </Button>
  );
}
