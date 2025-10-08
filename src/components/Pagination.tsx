"use client";

import { Button } from "./ui/button";

type PaginationProps = {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
};

export function Pagination({ total, limit, offset, onOffsetChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < pageCount;

  function updateOffset(nextOffset: number) {
    const clamped = Math.max(0, Math.min(nextOffset, (pageCount - 1) * limit));
    onOffsetChange(clamped);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} of {pageCount} • {total} people
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => hasPrev && updateOffset(offset - limit)}
          disabled={!hasPrev}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => hasNext && updateOffset(offset + limit)}
          disabled={!hasNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
