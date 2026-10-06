"use client";

import { formatMoney } from "@/lib/format";
import {
  HS_LABELS,
  PERCENT_ADDONS,
  RI_OPERATIONS,
  rangesForPanel,
  sizePrice,
  trunkLabel,
  type HsKey,
  type MatrixRow,
} from "@/lib/hailspec";
import type { HsPanelState } from "@/lib/hailspec-draft";
import { DENT_SIZE_LABELS, DENT_SIZES } from "@/lib/constants";
import type { BodyStyle } from "@/lib/body-styles";
import {
  calculateConventionalLine,
  calculateOversizedLine,
  calculatePanelLine,
  calculateReplaceLine,
} from "@/lib/estimate-calc";

type Markup = { code: string; name: string; percent: number };

export function PanelSheet({
  hsKey,
  shopCode,
  bodyStyle,
  panel,
  rows,
  markups,
  settings,
  onChange,
  onSave,
  onClose,
  onRemove,
  hasSaved,
  photoSection,
}: {
  hsKey: HsKey;
  shopCode: string;
  bodyStyle: BodyStyle;
  panel: HsPanelState;
  rows: MatrixRow[];
  markups: Markup[];
  settings: {
    maxCombinedMarkupPercent: number;
    oversizedOsCents: number;
    oversizedDosCents: number;
    defaultHourlyCents: number;
  };
  onChange: (patch: Partial<HsPanelState>) => void;
  onSave: () => void;
  onClose: () => void;
  onRemove: () => void;
  hasSaved: boolean;
  photoSection?: React.ReactNode;
}) {
  const ranges = rangesForPanel(rows, shopCode);
  const available = ranges.filter(
    (row) => row.DIME > 0 || row.NICKEL > 0 || row.QUARTER > 0 || row.HALF_DOLLAR > 0,
  );
  const selectedIdx = panel.selectedRange
    ? available.findIndex((row) => row.range === panel.selectedRange)
    : -1;
  const selectedRow = available[selectedIdx] ?? null;
  const nonPdr = panel.rrEnabled || panel.convEnabled;
  const baseLookup = calculatePanelLine(
    {
      panelCode: shopCode,
      dentCount: selectedRow?.max ?? 1,
      dentSize: panel.size,
      markupCodes: panel.markupCodes,
    },
    rows,
    markups,
    settings.maxCombinedMarkupPercent,
  );
  const osAmt = calculateOversizedLine({
    kind: "OS",
    quantity: panel.os,
    unitCents: settings.oversizedOsCents,
  }).amountCents;
  const os2Amt = calculateOversizedLine({
    kind: "OS_2X",
    quantity: panel.os2x,
    unitCents: settings.oversizedDosCents,
  }).amountCents;
  const rrAmt = calculateReplaceLine({
    panelCode: shopCode,
    hours: panel.rrHours,
    amountCents: 0,
    partsCents: 0,
    hourlyRateCents: panel.laborRateCents,
  }).amountCents;
  const convAmt = calculateConventionalLine({
    panelCode: shopCode,
    hours: panel.convHours,
    amountCents: 0,
    hourlyRateCents: panel.laborRateCents,
  }).amountCents;
  const riHours = panel.riEnabled
    ? RI_OPERATIONS[hsKey].reduce(
        (sum, op) => sum + (panel.riIncluded[op.id] ? panel.riTimes[op.id] || 0 : 0),
        0,
      )
    : 0;
  const riAmt = Math.round(riHours * panel.laborRateCents);
  const pdrAmt = nonPdr ? 0 : selectedRow ? baseLookup.amountCents : 0;
  const total = nonPdr
    ? rrAmt + convAmt + riAmt
    : pdrAmt + osAmt + os2Amt + riAmt;
  const sizeCents = sizePrice(selectedRow ?? undefined, panel.size);
  const title = hsKey === "TRUNK" ? trunkLabel(bodyStyle) : HS_LABELS[hsKey];
  const canSave = nonPdr || (Boolean(selectedRow) && sizeCents > 0) || panel.os > 0 || panel.os2x > 0 || riAmt > 0;

  function stepRange(delta: number) {
    if (!available.length) return;
    if (selectedIdx < 0) {
      onChange({ selectedRange: available[0].range });
      return;
    }
    const next = available[selectedIdx + delta];
    if (next) onChange({ selectedRange: next.range });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 backdrop-blur-[6px] xl:items-stretch xl:justify-end"
      onClick={onClose}
    >
      <div
        className="flex h-dvh max-h-dvh w-full max-w-[480px] flex-col overflow-hidden rounded-t-[20px] border-t-[3px] border-[#2563eb] bg-white shadow-[0_-4px_32px_rgba(0,0,0,0.12)] xl:max-w-[440px] xl:rounded-none xl:border-t-0 xl:border-l-[3px] xl:shadow-[-8px_0_32px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
        data-panel-sheet={hsKey}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-lg font-extrabold text-slate-900">{title}</div>
            <div className="mt-0.5 text-xs text-slate-400">
              {hsKey} · {available.length} damage ranges
            </div>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-5">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              data-chip="REPLACE"
              onClick={() =>
                onChange({
                  rrEnabled: !panel.rrEnabled,
                  convEnabled: panel.rrEnabled ? panel.convEnabled : false,
                })
              }
              className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] py-3 text-[13px] font-semibold ${
                panel.rrEnabled
                  ? "border-red-400/70 bg-[rgba(220,38,38,0.06)] text-[#dc2626]"
                  : "border-slate-200 bg-[#f8fafc] text-slate-500"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 014-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 01-4 4H3" />
              </svg>
              R&amp;R
            </button>
            <button
              type="button"
              data-chip="CONVENTIONAL"
              onClick={() =>
                onChange({
                  convEnabled: !panel.convEnabled,
                  rrEnabled: panel.convEnabled ? panel.rrEnabled : false,
                })
              }
              className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] border-[1.5px] py-3 text-[13px] font-semibold ${
                panel.convEnabled
                  ? "border-orange-400/70 bg-[rgba(249,115,22,0.06)] text-[#f97316]"
                  : "border-slate-200 bg-[#f8fafc] text-slate-500"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
              </svg>
              Conventional
            </button>
          </div>

          {!nonPdr ? (
            <>
              <label className="mb-2 block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Dent count range
              </label>
              <div className="mb-3 flex items-center gap-3">
                <button
                  type="button"
                  data-stepper="range"
                  data-step="down"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                  disabled={selectedIdx <= 0}
                  onClick={() => stepRange(-1)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <div
                  className={`flex min-h-[58px] flex-1 flex-col items-center justify-center rounded-[14px] border-[1.5px] px-4 py-3 ${
                    selectedRow && sizeCents === 0
                      ? "border-red-200 bg-red-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  {panel.selectedRange ? (
                    <>
                      <div
                        className={`text-2xl leading-none font-extrabold ${
                          sizeCents === 0 ? "text-red-600" : "text-blue-700"
                        }`}
                      >
                        {panel.selectedRange}
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold tracking-wide text-blue-500 uppercase">
                        dents
                      </div>
                    </>
                  ) : (
                    <div className="text-[15px] font-semibold text-slate-400">Select range</div>
                  )}
                </div>
                <button
                  type="button"
                  data-stepper="range"
                  data-step="up"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                  disabled={selectedIdx >= available.length - 1}
                  onClick={() => stepRange(1)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
              <div className="mb-1 flex overflow-x-auto pb-1">
                {available.map((row, index) => {
                  const active = panel.selectedRange === row.range;
                  const past = index < selectedIdx;
                  const invalid = sizePrice(row, panel.size) === 0;
                  return (
                    <button
                      key={row.range}
                      type="button"
                      onClick={() => onChange({ selectedRange: row.range })}
                      className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 px-0.5 py-1"
                    >
                      {index < available.length - 1 ? (
                        <span
                          className={`absolute top-[9px] left-[55%] right-[-45%] z-0 h-0.5 ${
                            past ? "bg-blue-400/40" : "bg-slate-200"
                          }`}
                        />
                      ) : null}
                      <span
                        className={`relative z-10 h-2.5 w-2.5 rounded-full border ${
                          active && invalid
                            ? "scale-130 border-red-500 bg-red-500"
                            : active
                              ? "scale-130 border-blue-600 bg-blue-600"
                              : past
                                ? "border-blue-300 bg-blue-300/70"
                                : invalid
                                  ? "border-red-300 bg-red-200"
                                  : "border-slate-300 bg-white"
                        }`}
                      />
                      <span
                        className={`text-[9px] leading-tight font-semibold ${
                          active && invalid
                            ? "text-red-500"
                            : active
                              ? "text-blue-500"
                              : "text-slate-400"
                        }`}
                      >
                        {row.range}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="mt-5 mb-2 block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Dent size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DENT_SIZES.map((size) => {
                  const price = sizePrice(selectedRow ?? undefined, size);
                  const hasAny = available.some((row) => sizePrice(row, size) > 0);
                  const selected = panel.size === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      data-chip={size}
                      disabled={!hasAny}
                      onClick={() => onChange({ size })}
                      className={`rounded-xl border-[1.5px] px-3 py-3 text-sm font-semibold ${
                        selected && price === 0
                          ? "border-red-400 bg-red-50 text-red-600"
                          : selected
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <div>{DENT_SIZE_LABELS[size]}</div>
                      {selectedRow && price > 0 ? (
                        <div className="mt-0.5 text-[11px] opacity-70">{formatMoney(price)}</div>
                      ) : null}
                      {selectedRow && price === 0 ? (
                        <div className="mt-0.5 text-[9px] font-bold text-red-500">R&amp;R</div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {selectedRow && sizeCents === 0 ? (
                <div className="mt-3.5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
                  <div>
                    <div className="text-[13px] font-bold text-red-600">
                      Conventional or R&amp;R recommended
                    </div>
                    <div className="text-xs text-red-500">
                      Exceeds PDR matrix for this panel at this size.
                    </div>
                  </div>
                </div>
              ) : null}
              {selectedRow && sizeCents > 0 ? (
                <div className="mt-2 text-[13px] font-semibold text-green-600">
                  Base: {formatMoney(baseLookup.baseCents)}
                </div>
              ) : null}

              <label className="mt-5 mb-2 block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Add-ons
              </label>
              <div className="space-y-1.5">
                <AddonQty
                  label="Oversized Dent"
                  unit={settings.oversizedOsCents}
                  qty={panel.os}
                  onToggle={() => onChange({ os: panel.os > 0 ? 0 : 1 })}
                  onQty={(os) => onChange({ os })}
                  name="os"
                />
                {PERCENT_ADDONS.map((addon) => {
                  const rule = markups.find((item) => item.code === addon.code);
                  if (!rule) return null;
                  const active = panel.markupCodes.includes(addon.code);
                  return (
                    <button
                      key={addon.code}
                      type="button"
                      data-chip={addon.code}
                      onClick={() =>
                        onChange({
                          markupCodes: active
                            ? panel.markupCodes.filter((code) => code !== addon.code)
                            : [...panel.markupCodes, addon.code],
                        })
                      }
                      className={`flex w-full items-center justify-between rounded-[10px] border-[1.5px] px-3.5 py-3 text-sm ${
                        active
                          ? "border-blue-400 bg-[#eff6ff] font-semibold text-[#2563eb]"
                          : "border-slate-200 bg-[#f8fafc] text-slate-500"
                      }`}
                    >
                      <span>{addon.name}</span>
                      <span className={active ? "text-[#2563eb]" : "text-slate-400"}>
                        +{rule.percent}%
                      </span>
                    </button>
                  );
                })}
                <AddonQty
                  label="Double OS Dents"
                  unit={settings.oversizedDosCents}
                  qty={panel.os2x}
                  onToggle={() => onChange({ os2x: panel.os2x > 0 ? 0 : 1 })}
                  onQty={(os2x) => onChange({ os2x })}
                  name="os2"
                />
              </div>
            </>
          ) : null}

          {panel.rrEnabled ? (
            <LaborBlock
              title="Remove & Replace"
              sub="Full panel replacement"
              accent="red"
              hours={panel.rrHours}
              rateCents={panel.laborRateCents}
              onHours={(rrHours) => onChange({ rrHours })}
              onRate={(laborRateCents) => onChange({ laborRateCents })}
              amount={rrAmt}
            />
          ) : null}
          {panel.convEnabled ? (
            <LaborBlock
              title="Conventional Repair"
              sub="Body work repair"
              accent="orange"
              hours={panel.convHours}
              rateCents={panel.laborRateCents}
              onHours={(convHours) => onChange({ convHours })}
              onRate={(laborRateCents) => onChange({ laborRateCents })}
              amount={convAmt}
            />
          ) : null}

          {RI_OPERATIONS[hsKey].length > 0 ? (
            <>
              <label className="mt-5 mb-2 block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                R&amp;I operations
              </label>
              <button
                type="button"
                onClick={() => onChange({ riEnabled: !panel.riEnabled })}
                className={`mb-2.5 flex w-full items-center justify-between rounded-[10px] border-[1.5px] px-3.5 py-3 text-sm font-semibold ${
                  panel.riEnabled
                    ? "border-blue-400 bg-[#eff6ff] text-[#2563eb]"
                    : "border-slate-200 bg-[#f8fafc] text-slate-500"
                }`}
              >
                <span>R&amp;I — Remove &amp; Install</span>
                <span>{panel.riEnabled ? "ON" : "OFF"}</span>
              </button>
              {panel.riEnabled ? (
                <div className="space-y-2 rounded-xl border border-sky-200 bg-[#f0f9ff] p-3.5">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex-1 text-[13px] font-semibold text-slate-700">Labor Rate</span>
                    <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <button
                        type="button"
                        data-stepper="ri-rate"
                        data-step="down"
                        className="h-10 w-10"
                        onClick={() =>
                          onChange({ laborRateCents: Math.max(0, panel.laborRateCents - 10) })
                        }
                      >
                        −
                      </button>
                      <span className="min-w-14 text-center text-sm font-extrabold">
                        ${(panel.laborRateCents / 100).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        data-stepper="ri-rate"
                        data-step="up"
                        className="h-10 w-10"
                        onClick={() => onChange({ laborRateCents: panel.laborRateCents + 10 })}
                      >
                        +
                      </button>
                    </div>
                    <span className="w-7 text-xs text-slate-400">/hr</span>
                  </div>
                  {RI_OPERATIONS[hsKey].map((op) => {
                    const included = Boolean(panel.riIncluded[op.id]);
                    const time = panel.riTimes[op.id] ?? op.time;
                    const isRr = Boolean(panel.riRr[op.id]);
                    return (
                      <div key={op.id} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                riIncluded: {
                                  ...panel.riIncluded,
                                  [op.id]: !included,
                                },
                              })
                            }
                            className="flex min-w-0 items-center gap-2 text-left text-sm font-medium"
                          >
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border ${
                                included
                                  ? isRr
                                    ? "border-red-500 bg-red-500 text-white"
                                    : "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300"
                              }`}
                            >
                              {included ? "✓" : ""}
                            </span>
                            <span className={included ? "text-slate-800" : "text-slate-400 line-through opacity-40"}>
                              {op.name}
                            </span>
                            {!included ? (
                              <span className="text-[10px] font-bold text-slate-400">EXCL</span>
                            ) : null}
                          </button>
                          {op.rrOption && included ? (
                            <button
                              type="button"
                              onClick={() =>
                                onChange({
                                  riRr: { ...panel.riRr, [op.id]: !isRr },
                                })
                              }
                              className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                                isRr ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {isRr ? "R&R ✓" : "R&R"}
                            </button>
                          ) : null}
                        </div>
                        {included ? (
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
                              <button
                                type="button"
                                className="h-9 w-9 bg-slate-50"
                                onClick={() =>
                                  onChange({
                                    riTimes: {
                                      ...panel.riTimes,
                                      [op.id]: Math.max(0, Number((time - 0.1).toFixed(1))),
                                    },
                                  })
                                }
                              >
                                −
                              </button>
                              <span className="min-w-16 text-center text-sm font-bold">
                                {time.toFixed(1)} hrs
                              </span>
                              <button
                                type="button"
                                className="h-9 w-9 bg-slate-50"
                                onClick={() =>
                                  onChange({
                                    riTimes: {
                                      ...panel.riTimes,
                                      [op.id]: Number((time + 0.1).toFixed(1)),
                                    },
                                  })
                                }
                              >
                                +
                              </button>
                            </div>
                            <span className={`text-sm font-bold ${isRr ? "text-red-600" : "text-slate-800"}`}>
                              {formatMoney(Math.round(time * panel.laborRateCents))}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-1 text-xs font-semibold text-slate-500">
                    <span>
                      R&amp;I Total ({riHours.toFixed(1)}h × {formatMoney(panel.laborRateCents)})
                    </span>
                    <span className="text-blue-600">{formatMoney(riAmt)}</span>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {photoSection}

          {total > 0 ? (
            <div className="mt-5 rounded-xl border border-blue-200 bg-[#eff6ff] p-4 text-sm">
              {!nonPdr && selectedRow && sizeCents > 0 ? (
                <Row
                  label={`Base (${panel.selectedRange} ${DENT_SIZE_LABELS[panel.size].toLowerCase()})`}
                  value={baseLookup.baseCents}
                />
              ) : null}
              {!nonPdr && baseLookup.markupAmountCents > 0 ? (
                <Row label="Add-ons / markups" value={baseLookup.markupAmountCents} />
              ) : null}
              {!nonPdr && osAmt > 0 ? <Row label="Oversized" value={osAmt} /> : null}
              {!nonPdr && os2Amt > 0 ? <Row label="2× oversized" value={os2Amt} /> : null}
              {rrAmt > 0 ? <Row label="R&R" value={rrAmt} /> : null}
              {convAmt > 0 ? <Row label="Conventional" value={convAmt} /> : null}
              {riAmt > 0 ? <Row label="R&I" value={riAmt} /> : null}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-extrabold">
                <span>Panel Total</span>
                <span className="text-blue-600">{formatMoney(total)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-slate-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {hasSaved ? (
            <button
              type="button"
              className="min-h-11 rounded-[10px] border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600"
              onClick={onRemove}
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            data-action="save-panel"
            disabled={!canSave}
            onClick={onSave}
            className="min-h-11 flex-1 rounded-xl bg-[#2563eb] text-sm font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)] disabled:opacity-40"
          >
            {!canSave
              ? selectedRow && sizeCents === 0
                ? "Select a valid size"
                : "Select a damage range"
              : panel.rrEnabled
                ? `Save R&R — ${formatMoney(total)}`
                : panel.convEnabled
                  ? `Save Conv. — ${formatMoney(total)}`
                  : `Save — ${formatMoney(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-0.5 text-slate-600">
      <span>{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
}

function AddonQty({
  label,
  unit,
  qty,
  onToggle,
  onQty,
  name,
}: {
  label: string;
  unit: number;
  qty: number;
  onToggle: () => void;
  onQty: (value: number) => void;
  name: string;
}) {
  const active = qty > 0;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-[10px] border-[1.5px] px-3.5 py-3 text-sm ${
          active ? "border-blue-400 bg-[#eff6ff] font-semibold text-[#2563eb]" : "border-slate-200 bg-[#f8fafc] text-slate-500"
        }`}
      >
        <span>{label}</span>
        <span>{formatMoney(unit)}/ea</span>
      </button>
      {active ? (
        <div className="mt-1 flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-500">Qty</span>
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
            <button
              type="button"
              data-stepper={name}
              data-step="down"
              className="h-10 w-10 bg-slate-50"
              onClick={() => onQty(Math.max(0, qty - 1))}
            >
              −
            </button>
            <span className="min-w-10 text-center font-extrabold">{qty}</span>
            <button
              type="button"
              data-stepper={name}
              data-step="up"
              className="h-10 w-10 bg-slate-50"
              onClick={() => onQty(qty + 1)}
            >
              +
            </button>
          </div>
          <span className="text-sm font-bold text-blue-600">{formatMoney(qty * unit)}</span>
        </div>
      ) : null}
    </div>
  );
}

function LaborBlock({
  title,
  sub,
  accent,
  hours,
  rateCents,
  onHours,
  onRate,
  amount,
}: {
  title: string;
  sub: string;
  accent: "red" | "orange";
  hours: number;
  rateCents: number;
  onHours: (hours: number) => void;
  onRate: (cents: number) => void;
  amount: number;
}) {
  const color = accent === "red" ? "text-red-600" : "text-orange-500";
  const box =
    accent === "red"
      ? "border-red-200 bg-red-50"
      : "border-orange-200 bg-orange-50";
  return (
    <div className={`mb-4 rounded-[14px] border p-4 ${box}`}>
      <div className={`mb-3 border-b pb-3 ${accent === "red" ? "border-red-200" : "border-orange-200"}`}>
        <div className={`text-sm font-bold ${color}`}>{title}</div>
        <div className="text-[11px] text-slate-400">{sub}</div>
      </div>
      <StepperRow
        label="Labor Rate"
        value={`$${(rateCents / 100).toFixed(2)}`}
        onDown={() => onRate(Math.max(0, rateCents - 100))}
        onUp={() => onRate(rateCents + 100)}
        unit="/hr"
      />
      <StepperRow
        label="Labor Hours"
        value={hours.toFixed(1)}
        onDown={() => onHours(Math.max(0, Number((hours - 1).toFixed(1))))}
        onUp={() => onHours(Number((hours + 1).toFixed(1)))}
        unit="hrs"
        name={accent === "red" ? "rr-hours" : "conv-hours"}
      />
      {amount > 0 ? (
        <div className="mt-2 flex justify-between border-t border-black/5 pt-2 text-sm font-semibold text-slate-500">
          <span>
            {hours.toFixed(1)} hrs × {formatMoney(rateCents)}
          </span>
          <span className={color}>{formatMoney(amount)}</span>
        </div>
      ) : null}
    </div>
  );
}

function StepperRow({
  label,
  value,
  onDown,
  onUp,
  unit,
  name,
}: {
  label: string;
  value: string;
  onDown: () => void;
  onUp: () => void;
  unit: string;
  name?: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="flex-1 text-[13px] font-semibold text-slate-700">{label}</span>
      <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
        <button type="button" data-stepper={name} data-step="down" className="h-10 w-10" onClick={onDown}>
          −
        </button>
        <span className="min-w-14 text-center text-sm font-extrabold">{value}</span>
        <button type="button" data-stepper={name} data-step="up" className="h-10 w-10" onClick={onUp}>
          +
        </button>
      </div>
      <span className="w-7 text-xs text-slate-400">{unit}</span>
    </div>
  );
}
