"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import { cn } from "../../lib/utils";

type CheckboxRootProps = React.ComponentProps<typeof CheckboxPrimitive.Root>;
type CheckboxOnCheckedChange = NonNullable<
  CheckboxRootProps["onCheckedChange"]
>;

interface CheckboxProps extends Omit<CheckboxRootProps, "onChange"> {
  onChange?: (checked?: boolean | "indeterminate") => void;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(
  (
    {
      className,
      checked,
      defaultChecked,
      onChange,
      onCheckedChange,
      disabled,
      indeterminate,
      ...props
    },
    ref,
  ) => {
    const handleCheckedChange: CheckboxOnCheckedChange = (
      nextChecked,
      eventDetails,
    ) => {
      onCheckedChange?.(nextChecked, eventDetails);
      onChange?.(nextChecked);
    };

    return (
      <CheckboxPrimitive.Root
        ref={ref}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={handleCheckedChange}
        disabled={disabled}
        indeterminate={indeterminate}
        className={cn(
          "grid place-content-center peer h-4 w-4 shrink-0 rounded border border-foreground shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-foreground data-checked:text-primary-foreground data-indeterminate:bg-primary data-indeterminate:text-primary-foreground",
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn("grid place-content-center text-current")}
        >
          <Check className="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };