"use client";

import { FormEvent } from "react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
};

export function SearchBar({ value, onChange, onSubmit, isLoading }: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name, email, or phone"
        aria-label="Search people"
      />
      <Button type="submit" disabled={isLoading} className="sm:w-auto">
        {isLoading ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}
