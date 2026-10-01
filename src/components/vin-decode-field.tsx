"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { decodeVinAction } from "@/app/actions/vin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { normalizeVin, type VinDecodeResult } from "@/lib/vin";
import { cn } from "cn";

export type VehicleFields = {
  vin: string;
  year: string;
  make: string;
  model: string;
  bodyClass: string;
};

export function VinDecodeFields({
  names,
  defaults,
  value,
  onChange,
  showBodyClass = true,
  compact = false,
}: {
  names?: {
    vin: string;
    year: string;
    make: string;
    model: string;
    bodyClass: string;
  };
  defaults?: Partial<VehicleFields>;
  value?: VehicleFields;
  onChange?: (fields: VehicleFields) => void;
  showBodyClass?: boolean;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const lastDecoded = useRef("");
  const [internal, setInternal] = useState<VehicleFields>({
    vin: defaults?.vin ?? "",
    year: defaults?.year ?? "",
    make: defaults?.make ?? "",
    model: defaults?.model ?? "",
    bodyClass: defaults?.bodyClass ?? "",
  });

  const fields = value ?? internal;
  const vinChars = normalizeVin(fields.vin).length;

  function setFields(next: VehicleFields) {
    if (!value) setInternal(next);
    onChange?.(next);
  }

  function patch(partial: Partial<VehicleFields>) {
    setFields({ ...fields, ...partial });
    setOk(false);
  }

  function handleDecode(nextVin = fields.vin) {
    setMessage(null);
    setOk(false);
    startTransition(async () => {
      const result = await decodeVinAction(nextVin);
      lastDecoded.current = normalizeVin(nextVin);
      if (!result.ok) {
        setMessage(result.error);
        setFields({ ...fields, vin: normalizeVin(nextVin) });
        return;
      }
      applyDecoded(result.data);
    });
  }

  function applyDecoded(data: VinDecodeResult) {
    setFields({
      vin: data.vin,
      year: data.year || fields.year,
      make: data.make || fields.make,
      model: data.model || fields.model,
      bodyClass: data.bodyClass || fields.bodyClass,
    });
    setOk(true);
    setMessage(
      compact
        ? "VIN decoded — year & make auto-filled"
        : [data.year, data.make, data.model].filter(Boolean).join(" ") || "VIN decoded.",
    );
  }

  useEffect(() => {
    const vin = normalizeVin(fields.vin);
    if (vin.length !== 17 || lastDecoded.current === vin) return;
    handleDecode(vin);
    // decode when a complete VIN is typed, HailSpec-style
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.vin]);

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
      <div className="col-span-2">
        <Label htmlFor={names?.vin ?? "vin"} className={cn("mb-1.5", compact && "text-[10px] font-bold tracking-widest text-slate-400 uppercase")}>
          VIN
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={names?.vin ?? "vin"}
              name={names?.vin}
              value={fields.vin}
              autoCapitalize="characters"
              maxLength={17}
              onChange={(event) =>
                patch({ vin: event.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17) })
              }
              placeholder="Enter 17-character VIN"
              className={cn(
                "font-mono tracking-[1.5px] uppercase",
                ok && "border-emerald-400 bg-emerald-50",
                compact && "h-10 border-[1.5px] bg-[#f8fafc] pr-12",
              )}
            />
            {compact ? (
              <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                {vinChars}/17
              </span>
            ) : null}
          </div>
          <button
            type="button"
            data-action="decode-vin"
            disabled={pending}
            className={cn(buttonVariants(), "h-9 shrink-0", compact && "h-10")}
            onClick={() => handleDecode()}
          >
            {pending ? "Decoding…" : "Decode"}
          </button>
        </div>
        {message ? (
          <p
            className={cn(
              "mt-1.5 text-xs",
              ok ? "text-emerald-600" : compact ? "text-amber-600" : "text-destructive",
            )}
          >
            {ok && compact ? "VIN decoded — year & make auto-filled" : message}
          </p>
        ) : compact ? (
          <p className="mt-1.5 text-xs text-slate-400">NHTSA first, local WMI fallback if decode fails.</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Uses NHTSA vPIC. Decode can fail — you can still save the VIN as text.
          </p>
        )}
      </div>
      <div>
        <Label htmlFor={names?.year ?? "year"} className={cn("mb-1.5", compact && "text-[10px] font-bold tracking-widest text-slate-400 uppercase")}>
          Year
        </Label>
        <Input
          id={names?.year ?? "year"}
          name={names?.year}
          value={fields.year}
          onChange={(event) => patch({ year: event.target.value })}
          className={compact ? "h-10" : undefined}
        />
      </div>
      <div>
        <Label htmlFor={names?.make ?? "make"} className={cn("mb-1.5", compact && "text-[10px] font-bold tracking-widest text-slate-400 uppercase")}>
          Make
        </Label>
        <Input
          id={names?.make ?? "make"}
          name={names?.make}
          value={fields.make}
          onChange={(event) => patch({ make: event.target.value })}
          className={compact ? "h-10" : undefined}
        />
      </div>
      <div className={compact ? "col-span-2" : undefined}>
        <Label htmlFor={names?.model ?? "model"} className={cn("mb-1.5", compact && "text-[10px] font-bold tracking-widest text-slate-400 uppercase")}>
          Model
        </Label>
        <Input
          id={names?.model ?? "model"}
          name={names?.model}
          value={fields.model}
          onChange={(event) => patch({ model: event.target.value })}
          className={compact ? "h-10" : undefined}
        />
      </div>
      {showBodyClass ? (
        <div className={compact ? "col-span-2" : undefined}>
          <Label htmlFor={names?.bodyClass ?? "bodyClass"} className={cn("mb-1.5", compact && "text-[10px] font-bold tracking-widest text-slate-400 uppercase")}>
            Body class
          </Label>
          <Input
            id={names?.bodyClass ?? "bodyClass"}
            name={names?.bodyClass}
            value={fields.bodyClass}
            onChange={(event) => patch({ bodyClass: event.target.value })}
            className={compact ? "h-10" : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}
