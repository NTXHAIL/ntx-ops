"use client";

import { BODY_MAPS, type BodyStyle } from "@/lib/body-styles";
import { cn } from "cn";

export function VehicleMap({
  bodyStyle,
  selected,
  filled,
  onSelect,
}: {
  bodyStyle: BodyStyle;
  selected: string | null;
  filled: Set<string>;
  onSelect: (code: string) => void;
}) {
  const spots = BODY_MAPS[bodyStyle];

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div
        className="relative mx-auto aspect-[240/250] w-full rounded-[28px] bg-[var(--nav)] p-1"
        data-vehicle-map={bodyStyle}
      >
        <div className="absolute inset-2 rounded-[24px] border border-white/15" />
        {spots.map((spot) => {
          const isSelected = selected === spot.code;
          const hasEntry = filled.has(spot.code);
          return (
            <button
              key={spot.code}
              type="button"
              data-panel={spot.code}
              onClick={() => onSelect(spot.code)}
              className={cn(
                "absolute flex items-center justify-center rounded-md text-[10px] leading-tight font-semibold tracking-wide uppercase",
                isSelected
                  ? "bg-white text-[var(--nav)] ring-2 ring-amber-300"
                  : hasEntry
                    ? "bg-emerald-400 text-[var(--nav)]"
                    : "bg-white/15 text-white",
              )}
              style={{
                left: `${(spot.x / 240) * 100}%`,
                top: `${(spot.y / 250) * 100}%`,
                width: `${(spot.w / 240) * 100}%`,
                height: `${(spot.h / 250) * 100}%`,
              }}
            >
              {spot.short}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Tap a panel. Green = damage entered.
      </p>
    </div>
  );
}
