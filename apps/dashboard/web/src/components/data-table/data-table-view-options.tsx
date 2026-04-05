"use client";

import type { Table } from "@tanstack/react-table";
import { Check, Settings2 } from "lucide-react";
import * as React from "react";
import { Button } from "@notify/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@notify/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notify/ui/components/popover";
import { cn } from "@notify/ui/lib/utils";

interface DataTableViewOptionsProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
  disabled?: boolean;
}

export function DataTableViewOptions<TData>({
  table,
  disabled,
  ...props
}: DataTableViewOptionsProps<TData>) {
  const columns = React.useMemo(() => {
    return table.getAllLeafColumns().filter((column) => {
      if (!column.getCanHide()) return false;
      if (column.id === "isTest") return false;
      const def = column.columnDef;
      if (def.meta?.hideFromViewOptions) return false;
      const d = def as { accessorFn?: unknown; accessorKey?: unknown };
      const isDataColumn =
        typeof d.accessorFn === "function" ||
        (typeof d.accessorKey === "string" && d.accessorKey.length > 0);
      return isDataColumn;
    });
  }, [table]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="Toggle columns"
            role="combobox"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 font-normal"
            disabled={disabled}
          />
        }
      >
        <Settings2 className="text-muted-foreground" />
        Columns
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" {...props}>
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                >
                  <span className="truncate">
                    {column.columnDef.meta?.label ?? column.id}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      column.getIsVisible() ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
