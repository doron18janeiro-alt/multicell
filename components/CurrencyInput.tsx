"use client";

import type { InputHTMLAttributes } from "react";
import { formatBRLCurrencyInput } from "@/lib/currency";

type CurrencyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "R$ 0,00",
  ...props
}: CurrencyInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(formatBRLCurrencyInput(event.target.value))}
      className={className}
    />
  );
}
