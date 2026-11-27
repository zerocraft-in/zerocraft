"use client";

import { cn } from "../cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type SelectFieldOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: readonly SelectFieldOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function SelectField({
  id,
  value,
    onValueChange,
    defaultValue,
  options,
  placeholder,
  className,
  disabled,
  "aria-label": ariaLabel,
}: SelectFieldProps) {
  return (
    <Select value={value ?? defaultValue} onValueChange={(next) => onValueChange?.(next ?? "")}>
      <SelectTrigger
        id={id}
        className={cn("w-full", className)}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder}>
          {(value: string | null) => {
            const selected = options.find((option) => option.value === value);
            return selected?.label ?? (value ? String(value) : placeholder);
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
