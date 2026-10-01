"use client";

import { cn } from "cn";

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  suffix,
  name,
}: {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  name?: string;
}) {
  const decimals = step < 1 ? 1 : 0;

  function apply(next: number) {
    const clamped = Math.max(min, max == null ? next : Math.min(max, next));
    const rounded = Number(clamped.toFixed(decimals));
    onChange(rounded);
  }

  return (
    <div>
      {label ? <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p> : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-stepper={name}
          data-step="down"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl font-medium leading-none"
          onClick={() => apply(value - step)}
          aria-label={label ? `Decrease ${label}` : "Decrease"}
        >
          −
        </button>
        <div className="min-w-12 text-center">
          <p className="text-xl font-semibold tabular-nums">
            {decimals ? value.toFixed(decimals) : value}
          </p>
          {suffix ? <p className="text-[11px] text-muted-foreground">{suffix}</p> : null}
        </div>
        <button
          type="button"
          data-stepper={name}
          data-step="up"
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-medium leading-none text-primary-foreground"
          onClick={() => apply(value + step)}
          aria-label={label ? `Increase ${label}` : "Increase"}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function MoneyField({
  label,
  valueCents,
  onChange,
  placeholder,
}: {
  label: string;
  valueCents: number;
  onChange: (cents: number) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center rounded-xl bg-muted px-3">
        <span className="text-muted-foreground">$</span>
        <input
          inputMode="decimal"
          className="h-12 w-full bg-transparent px-2 text-lg font-semibold outline-none"
          placeholder={placeholder ?? "0.00"}
          value={valueCents ? (valueCents / 100).toFixed(2) : ""}
          onChange={(event) => {
            const cleaned = event.target.value.replace(/[$,\s]/g, "");
            if (!cleaned) {
              onChange(0);
              return;
            }
            const n = Number(cleaned);
            onChange(Number.isNaN(n) ? 0 : Math.round(n * 100));
          }}
        />
      </div>
    </label>
  );
}

export function ChipButton({
  active,
  children,
  onClick,
  name,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  name?: string;
}) {
  return (
    <button
      type="button"
      data-chip={name}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl px-3 text-sm font-medium ring-1",
        active
          ? "bg-primary text-primary-foreground ring-primary"
          : "bg-card text-foreground ring-foreground/15",
      )}
    >
      {children}
    </button>
  );
}
