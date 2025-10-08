"use client";

import { useState } from "react";

import { Button } from "./ui/button";

type CopyButtonProps = {
  value: string;
  label: string;
};

export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!value}>
      {copied ? "Copied" : label}
    </Button>
  );
}
