import React, { useState, useEffect } from "react";

/**
 * Formats raw string into Indian currency format.
 * - While typing: preserves up to 2 decimal places as typed (e.g., "1223" -> "1,223", "1223.5" -> "1,223.5")
 * - When `padDecimals` is true (e.g., on blur): formats integers/decimals to 2 decimal places (e.g., "1223" -> "1,223.00")
 */
const formatIndianPrice = (val: string, padDecimals = false): string => {
  if (!val) return "";

  const cleaned = val.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  const integerPart = parts[0];
  // Limit decimal digits to 2 places
  const decimalPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";

  if (padDecimals) {
    const baseInt = integerPart || "0";
    const paddedDec = decimalPart.padEnd(2, "0");
    const formattedInteger = Number(baseInt).toLocaleString("en-IN");
    return `${formattedInteger}.${paddedDec}`;
  }

  if (!integerPart && parts.length > 1) {
    return `0.${decimalPart}`;
  }
  if (!integerPart) return "";

  const formattedInteger = Number(integerPart).toLocaleString("en-IN");
  return parts.length > 1
    ? `${formattedInteger}.${decimalPart}`
    : formattedInteger;
};

export interface PriceInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  value?: string | number;
  /** Automatically appends `.00` when the input loses focus (default: true) */
  autoFormatDecimalsOnBlur?: boolean;
}

/** Rupee-prefixed auto-formatting number input compatible with React Hook Form register() */
export const PriceInput = React.forwardRef<HTMLInputElement, PriceInputProps>(
  (
    {
      className = "",
      value,
      onChange,
      onBlur,
      name,
      autoFormatDecimalsOnBlur = true,
      ...props
    },
    ref,
  ) => {
    const [displayValue, setDisplayValue] = useState<string>(() =>
      value !== undefined && value !== null && String(value) !== ""
        ? formatIndianPrice(String(value), autoFormatDecimalsOnBlur)
        : "",
    );

    useEffect(() => {
      if (value !== undefined && value !== null) {
        setDisplayValue(
          String(value) === ""
            ? ""
            : formatIndianPrice(String(value), autoFormatDecimalsOnBlur),
        );
      }
    }, [value, autoFormatDecimalsOnBlur]);

    const emitChange = (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.FocusEvent<HTMLInputElement>,
      rawValue: string,
    ) => {
      if (!onChange) return;

      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: name ?? e.target.name,
          value: rawValue,
        },
        currentTarget: {
          ...e.currentTarget,
          name: name ?? e.currentTarget.name,
          value: rawValue,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatIndianPrice(e.target.value, false);
      const raw = formatted.replace(/,/g, "");

      setDisplayValue(formatted);
      emitChange(e, raw);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (autoFormatDecimalsOnBlur && displayValue) {
        const formatted = formatIndianPrice(displayValue, true);
        const raw = formatted.replace(/,/g, "");
        setDisplayValue(formatted);
        emitChange(e, raw);
      }

      if (onBlur) {
        onBlur(e);
      }
    };

    return (
      <div
        className={`flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden max-w-[260px] focus-within:border-blue-500 focus-within:ring-0.5 focus-within:ring-blue-500 ${className}`}
      >
        <span className="pl-3 pr-1 text-sm text-gray-500 select-none">₹</span>
        <input
          ref={ref}
          type="text"
          name={name}
          autoComplete="off"
          maxLength={24}
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="flex-1 min-w-0 py-2 pr-3 text-sm outline-none bg-transparent"
          {...props}
        />
      </div>
    );
  },
);

PriceInput.displayName = "PriceInput";