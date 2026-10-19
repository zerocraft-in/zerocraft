"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES, CurrencyConfig } from "@/lib/currency";

const currencyItems = Object.values(CURRENCIES);

export function CurrencySwitcherCombobox({
  className,
}: {
  className?: string;
}) {
  const { currency, setCurrency } = useCurrency();
  const activeItem = CURRENCIES[currency] || CURRENCIES.USD;

  return (
    <Field className={className}>
      <Combobox
        items={currencyItems}
        value={activeItem}
        onValueChange={(item: CurrencyConfig) => setCurrency(item.code)}
        itemToStringValue={(item: CurrencyConfig) =>
          `${item.name} ${item.code} ${item.symbol}`
        }
      >
        <ComboboxTrigger
          render={
            <Button
              variant="outline"
              className="justify-between font-normal h-10 px-3 text-xs rounded-xl border-border bg-background hover:bg-accent"
            />
          }
        >
          <ComboboxValue>
            {(item: CurrencyConfig) => (
              <span className="flex items-center gap-2">
                <Image
                  src={`https://flagcdn.com/${item.countryCode.toLowerCase()}.svg`}
                  alt={item.name}
                  width={18}
                  height={14}
                  unoptimized
                  className="rounded-xs shrink-0 object-cover"
                />
                <span className="font-bold text-foreground">
                  {item.code} ({item.symbol.trim()})
                </span>
              </span>
            )}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent className="w-56">
          <ComboboxList>
            {currencyItems.map((item) => (
              <ComboboxItem key={item.code} value={item}>
                <Image
                  src={`https://flagcdn.com/${item.countryCode.toLowerCase()}.svg`}
                  alt={item.name}
                  width={18}
                  height={13}
                  unoptimized
                  className="rounded-xs shrink-0 object-cover"
                />
                <div className="flex items-center justify-between w-full min-w-0 pr-1">
                  <span className="truncate">{item.name}</span>
                  <span className="font-mono text-[11px] opacity-70 ml-2">
                    {item.symbol}
                  </span>
                </div>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
