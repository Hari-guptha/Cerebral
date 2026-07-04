"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { isValidCssColor, toPickerHex } from "@/lib/css-color";
import { cn } from "@/lib/utils";

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ColorInput({ value, onChange, onFocus, disabled, className }: ColorInputProps) {
  const [text, setText] = useState(value);
  const pickerHex = toPickerHex(value);
  const previewColor = pickerHex ?? (isValidCssColor(value) ? value : "transparent");

  useEffect(() => {
    setText(value);
  }, [value]);

  const commit = (next: string) => {
    const trimmed = next.trim();
    if (!trimmed || !isValidCssColor(trimmed)) return;
    onChange(trimmed);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-8 w-8 shrink-0 rounded-sm border border-neutral-800"
        style={{ background: previewColor }}
        aria-hidden
      />
      <input
        type="color"
        value={pickerHex ?? "#000000"}
        disabled={disabled || !pickerHex}
        title={pickerHex ? "Pick color" : "Picker unavailable for this value"}
        className="h-8 w-8 shrink-0 cursor-pointer rounded-sm border border-neutral-800 bg-neutral-950 p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
      />
      <Input
        value={text}
        disabled={disabled}
        placeholder="#hex, rgb(), hsl(), name…"
        spellCheck={false}
        className="min-w-0 flex-1 font-mono text-xs"
        onFocus={onFocus}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (isValidCssColor(next)) commit(next);
        }}
        onBlur={() => {
          if (isValidCssColor(text)) commit(text);
          else setText(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
