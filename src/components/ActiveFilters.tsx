import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Filter {
  label: string;
  onClear: () => void;
}

export function ActiveFilters({ filters }: { filters: Filter[] }) {
  if (filters.length === 0) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((f, i) => (
        <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={f.onClear}>
          {f.label}
          <X className="h-3 w-3" />
        </Badge>
      ))}
    </div>
  );
}
