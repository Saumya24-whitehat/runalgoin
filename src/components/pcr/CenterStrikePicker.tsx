import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type CenterStrikeValue = "auto" | string;

interface CenterStrikePickerProps {
  value: CenterStrikeValue;
  strikes: string[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (value: CenterStrikeValue) => void;
}

export function CenterStrikePicker({
  value,
  strikes,
  loading = false,
  disabled = false,
  onChange,
}: CenterStrikePickerProps) {
  const [open, setOpen] = React.useState(false);

  const label =
    value === "auto" ? "Auto (09:15 ATM ±7)" : value || "Select strike";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-secondary text-secondary-foreground",
            loading && "opacity-80",
          )}
        >
          <span className="truncate">
            {loading ? "Loading..." : label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-50 w-[--radix-popover-trigger-width] p-0 bg-popover border-border"
      >
        <Command>
          <CommandInput placeholder="Search strike..." />
          <CommandList>
            <CommandEmpty>No strikes found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="auto"
                onSelect={() => {
                  onChange("auto");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "auto" ? "opacity-100" : "opacity-0",
                  )}
                />
                Auto (09:15 ATM ±7)
              </CommandItem>
              {strikes.map((strike) => (
                <CommandItem
                  key={strike}
                  value={strike}
                  onSelect={() => {
                    onChange(strike);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === strike ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {strike}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
