"use client";

import { useState } from "react";

import { Button } from "./ui/button";

type ExportCsvButtonProps = {
  query: string;
  departments: string[];
  location: string | null;
  sort: "name" | "department" | "location";
  direction: "asc" | "desc";
};

export function ExportCsvButton({ query, departments, location, sort, direction }: ExportCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query || undefined,
          departments: departments.length > 0 ? departments : undefined,
          location: location || undefined,
          sort,
          direction,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to export");
      }
      const blob = await response.blob();
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
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? "Preparing CSV…" : "Export CSV"}
    </Button>
  );
}
