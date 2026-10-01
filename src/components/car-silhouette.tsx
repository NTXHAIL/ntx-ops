"use client";

import {
  HS_KEYS,
  HS_PANEL_PATHS,
  panelHeatColor,
  type HsKey,
} from "@/lib/hailspec";
import type { HsPanelState } from "@/lib/hailspec-draft";
import { hsPanelHasEntry } from "@/lib/hailspec-draft";

export function CarSilhouette({
  panels,
  selected,
  maxByKey,
  counts,
  onSelect,
}: {
  panels: Record<HsKey, HsPanelState>;
  selected: HsKey | null;
  maxByKey: Record<HsKey, number>;
  counts: Record<HsKey, number>;
  onSelect: (key: HsKey) => void;
}) {
  return (
    <svg
      viewBox="60 0 300 490"
      className="hs-car-svg"
      data-vehicle-map="HAILSPEC"
    >
      <path
        d="M130,15 C160,5 260,5 290,15 L325,35 C340,60 340,80 335,110 L335,430 C335,455 320,475 290,480 L240,488 C225,490 195,490 180,488 L130,480 C100,475 85,455 85,430 L85,110 C80,80 80,60 95,35 Z"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="3.5"
      />
      <path
        d="M155,125 L265,125 L272,140 L272,150 L148,150 L148,140 Z"
        fill="rgba(219,234,254,0.6)"
        stroke="#bfdbfe"
        strokeWidth="1"
      />
      <path
        d="M155,375 L265,375 L268,390 L152,390 Z"
        fill="rgba(219,234,254,0.6)"
        stroke="#bfdbfe"
        strokeWidth="1"
      />
      {HS_KEYS.map((key) => {
        const { d, cx, cy } = HS_PANEL_PATHS[key];
        const panel = panels[key];
        const hasData = hsPanelHasEntry(panel);
        const isSelected = selected === key;
        const count = counts[key] || 0;
        const fill = panelHeatColor({
          count,
          max: maxByKey[key] || 50,
          rr: panel.rrEnabled,
          conv: panel.convEnabled,
        });
        return (
          <g
            key={key}
            data-panel={key}
            onClick={() => onSelect(key)}
            style={{ cursor: "pointer" }}
          >
            <path
              d={d}
              fill={fill}
              stroke={isSelected ? "#2563eb" : hasData ? "#1d4ed8" : "#e2e8f0"}
              strokeWidth={isSelected ? 2.5 : 1}
              style={{ transition: "all 0.2s" }}
            />
            {hasData ? (
              <>
                <circle cx={cx} cy={cy} r={14} fill="rgba(15,23,42,0.85)" />
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={
                    panel.rrEnabled ? "#ef4444" : panel.convEnabled ? "#f97316" : "#ffffff"
                  }
                  fontSize={panel.rrEnabled ? 8 : panel.convEnabled ? 7 : 11}
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                >
                  {panel.rrEnabled ? "R&R" : panel.convEnabled ? "CONV" : count || ""}
                </text>
              </>
            ) : (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(148,163,184,0.6)"
                fontSize="8"
                fontWeight="500"
                style={{ pointerEvents: "none" }}
              >
                {key}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
