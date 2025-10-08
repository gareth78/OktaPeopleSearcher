"use client";

import { useMemo } from "react";

import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type FiltersProps = {
  departments: string[];
  locations: string[];
  selectedDepartments: string[];
  selectedLocation: string | null;
  onDepartmentsChange: (values: string[]) => void;
  onLocationChange: (value: string | null) => void;
};

export function Filters({
  departments,
  locations,
  selectedDepartments,
  selectedLocation,
  onDepartmentsChange,
  onLocationChange,
}: FiltersProps) {
  const departmentCount = selectedDepartments.length;
  const departmentLabel = useMemo(() => {
    if (departmentCount === 0) return "Departments";
    if (departmentCount === 1) return selectedDepartments[0];
    return `${departmentCount} departments`;
  }, [departmentCount, selectedDepartments]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between">
            <span>{departmentLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-0" align="start">
          <div className="border-b px-3 py-2">
            <p className="text-sm font-medium">Departments</p>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-2 px-3 py-2">
              {departments.length === 0 && <p className="text-sm text-muted-foreground">No departments</p>}
              {departments.map((department) => {
                const checked = selectedDepartments.includes(department);
                return (
                  <label key={department} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(checkedValue) => {
                        if (checkedValue === true) {
                          const values = Array.from(
                            new Set([...selectedDepartments, department])
                          );
                          onDepartmentsChange(values);
                        } else {
                          onDepartmentsChange(selectedDepartments.filter((item) => item !== department));
                        }
                      }}
                    />
                    <span>{department}</span>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
          {departmentCount > 0 && (
            <div className="border-t px-3 py-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => onDepartmentsChange([])}
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor="location-select">Location</Label>
        <Select
          value={selectedLocation ?? ""}
          onValueChange={(value) => onLocationChange(value === "" ? null : value)}
        >
          <SelectTrigger id="location-select">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
