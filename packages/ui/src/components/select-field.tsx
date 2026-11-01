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
        className={cn("w-full", className)}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
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
