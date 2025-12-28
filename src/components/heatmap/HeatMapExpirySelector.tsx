import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeatMapExpirySelectorProps {
  expiryDates: string[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function HeatMapExpirySelector({
  expiryDates,
  value,
  onChange,
  loading = false,
  disabled = false,
}: HeatMapExpirySelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || loading || expiryDates.length === 0}
    >
      <SelectTrigger className="w-full bg-secondary text-secondary-foreground">
        <SelectValue placeholder={loading ? "Loading..." : "Select expiry"} />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {expiryDates.map((date) => (
          <SelectItem key={date} value={date}>
            {date}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
