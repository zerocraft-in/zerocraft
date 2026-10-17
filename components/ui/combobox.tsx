"use client";

import * as React from "react";
import { IconCheck, IconChevronDown, IconSearch } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ComboboxContextValue {
  selectedItem: any;
  setSelectedItem: (item: any) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  itemToStringValue?: (item: any) => string;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext() {
  const ctx = React.useContext(ComboboxContext);
  if (!ctx) {
    throw new Error("Combobox components must be used within a Combobox root");
  }
  return ctx;
}

export interface ComboboxProps<T = any> {
  items: T[];
  defaultValue?: T;
  value?: T;
  onValueChange?: (item: T) => void;
  itemToStringValue?: (item: T) => string;
  children: React.ReactNode;
  className?: string;
}

export function Combobox<T = any>({
  items,
  defaultValue,
  value,
  onValueChange,
  itemToStringValue,
  children,
  className,
}: ComboboxProps<T>) {
  const [selectedItem, setSelectedItemState] = React.useState<T | undefined>(
    value !== undefined ? value : defaultValue
  );
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (value !== undefined) {
      // Synchronize the internal selection with the controlled value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedItemState(value);
    }
  }, [value]);

  const setSelectedItem = (item: T) => {
    setSelectedItemState(item);
    if (onValueChange) onValueChange(item);
    setOpen(false);
  };

  return (
    <ComboboxContext.Provider
      value={{
        selectedItem,
        setSelectedItem,
        open,
        setOpen,
        searchQuery,
        setSearchQuery,
        itemToStringValue,
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </ComboboxContext.Provider>
  );
}

export function ComboboxTrigger({
  render,
  children,
  className,
  ...props
}: {
  render?: React.ReactElement<any>;
  children?: React.ReactNode;
  className?: string;
} & React.ComponentPropsWithoutRef<typeof PopoverTrigger>) {
  const { open } = useComboboxContext();

  if (render) {
    return (
      <PopoverTrigger
        render={React.cloneElement(render, {
          className: cn("w-full flex items-center justify-between", render.props.className, className),
          children: (
            <>
              {children || render.props.children}
              <IconChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 opacity-60 transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </>
          ),
        })}
        {...props}
      />
    );
  }

  return (
    <PopoverTrigger
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
      <IconChevronDown
        className={cn(
          "h-4 w-4 shrink-0 opacity-60 transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </PopoverTrigger>
  );
}

export function ComboboxValue({
  children,
}: {
  children?: (item: any) => React.ReactNode;
}) {
  const { selectedItem } = useComboboxContext();

  if (!selectedItem) {
    return <span className="text-muted-foreground">Select option...</span>;
  }

  if (typeof children === "function") {
    return <>{children(selectedItem)}</>;
  }

  return <span>{String(selectedItem)}</span>;
}

export function ComboboxContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverContent>) {
  return (
    <PopoverContent
      align="start"
      sideOffset={6}
      className={cn(
        "w-64 p-1.5 rounded-2xl bg-muted border border-border shadow-2xl space-y-1 z-50",
        className
      )}
      {...props}
    >
      {children}
    </PopoverContent>
  );
}

export function ComboboxInput({
  showTrigger = false,
  placeholder = "Search...",
  className,
  ...props
}: {
  showTrigger?: boolean;
  placeholder?: string;
  className?: string;
} & React.ComponentPropsWithoutRef<"input">) {
  const { searchQuery, setSearchQuery } = useComboboxContext();

  return (
    <div className="relative flex items-center px-1 py-1">
      <IconSearch className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-8 pl-8 pr-2 text-xs rounded-xl bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#22C55E]",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function ComboboxEmpty({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { searchQuery } = useComboboxContext();
  const listContext = React.useContext(ComboboxListContext);

  if (listContext && listContext.itemCount > 0) {
    return null;
  }

  return (
    <div className="py-4 text-center text-xs text-muted-foreground font-medium">
      {children || "No items found."}
    </div>
  );
}

const ComboboxListContext = React.createContext<{ itemCount: number } | null>(null);

export function ComboboxList({
  children,
  className,
}: {
  children?: React.ReactNode | ((item: any) => React.ReactNode);
  className?: string;
}) {
  return (
    <div className={cn("max-h-60 overflow-y-auto space-y-0.5 pt-1", className)}>
      {typeof children === "function" ? null : children}
    </div>
  );
}

export function ComboboxItem({
  value,
  children,
  className,
  ...props
}: {
  value: any;
  children: React.ReactNode;
  className?: string;
} & React.ComponentPropsWithoutRef<"div">) {
  const { selectedItem, setSelectedItem, searchQuery, itemToStringValue } = useComboboxContext();

  // Filter check
  const label = itemToStringValue ? itemToStringValue(value) : value.label || value.name || value.code || String(value);
  if (searchQuery && !label.toLowerCase().includes(searchQuery.toLowerCase())) {
    return null;
  }

  const isSelected = JSON.stringify(selectedItem) === JSON.stringify(value);

  return (
    <div
      onClick={() => setSelectedItem(value)}
      className={cn(
        "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors hover:bg-accent",
        isSelected && "bg-[#22C55E]/15 text-[#22C55E] font-bold",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">
        {children}
      </div>
      {isSelected && <IconCheck className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />}
    </div>
  );
}
