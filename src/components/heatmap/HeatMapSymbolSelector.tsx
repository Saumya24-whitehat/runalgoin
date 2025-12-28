import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GroupedSymbols } from "@/types/optionChain";

interface HeatMapSymbolSelectorProps {
  symbols: GroupedSymbols;
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function HeatMapSymbolSelector({
  symbols,
  value,
  onChange,
  loading = false,
  disabled = false,
}: HeatMapSymbolSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIndexSymbols = useMemo(() => {
    if (!symbols.indexSymbols) return [];
    if (!search) return symbols.indexSymbols;
    return symbols.indexSymbols.filter((symbol) =>
      symbol.toLowerCase().includes(search.toLowerCase())
    );
  }, [symbols.indexSymbols, search]);

  const filteredStockSymbols = useMemo(() => {
    if (!symbols.stockSymbols) return [];
    if (!search) return symbols.stockSymbols.slice(0, 50);
    return symbols.stockSymbols
      .filter((symbol) =>
        symbol.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 50);
  }, [symbols.stockSymbols, search]);

  const hasResults = filteredIndexSymbols.length > 0 || filteredStockSymbols.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full justify-between bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          {loading ? (
            "Loading..."
          ) : value ? (
            value
          ) : (
            "Select symbol..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-popover border-border" align="start">
        <Command>
          <CommandInput
            placeholder="Search symbol..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            {!hasResults && <CommandEmpty>No symbol found.</CommandEmpty>}

            {filteredIndexSymbols.length > 0 && (
              <CommandGroup heading="📊 Index">
                {filteredIndexSymbols.map((symbol) => (
                  <CommandItem
                    key={symbol}
                    value={symbol}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === symbol ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {symbol}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredStockSymbols.length > 0 && (
              <CommandGroup heading="📈 Stocks">
                {filteredStockSymbols.map((symbol) => (
                  <CommandItem
                    key={symbol}
                    value={symbol}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === symbol ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {symbol}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
