"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import {
  deleteEstimateAction,
  listSavedEstimatesAction,
  saveEstimateAction,
} from "@/app/actions/estimates";
import { decodeVinAction } from "@/app/actions/vin";
import { CarSilhouette } from "@/components/car-silhouette";
import { PanelSheet } from "@/components/panel-sheet";
import { SearchSelect } from "@/components/search-select";
import { BODY_STYLES, bodyStyleFromClass, type BodyStyle } from "@/lib/body-styles";
import { DENT_SIZE_LABELS } from "@/lib/constants";
import {
  calculateConventionalLine,
  calculateEstimateTotals,
  calculateLaborLine,
  calculateOversizedLine,
  calculatePanelLine,
  calculateReplaceLine,
  type CalculatedLine,
} from "@/lib/estimate-calc";
import type { EstimateDraftLine, EstimateDraftPayload } from "@/lib/estimate-types";
import { formatMoney, formatVehicle } from "@/lib/format";
import {
  DEFAULT_LABOR_RATE_CENTS,
  DOUBLE_OS_CENTS,
  HS_CARRIERS,
  HS_KEYS,
  HS_LABELS,
  OS_DENT_CENTS,
  dentCountForRange,
  rangesForPanel,
  trunkLabel,
  type HsKey,
  type MatrixRow,
} from "@/lib/hailspec";
import { calculateHsPanel } from "@/lib/hailspec-price";
import { buildReportSections, generateReportHTML } from "@/lib/hailspec-report";
import { VEHICLE_DATA, VEHICLE_MAKES, VEHICLE_YEARS } from "@/lib/vehicle-catalog";
import {
  emptyHsPanel,
  flattenHsPanels,
  hsPanelHasEntry,
  inflateHsPanels,
  type HsPanelState,
} from "@/lib/hailspec-draft";
import { decodeVinLocalWmi, normalizeVin } from "@/lib/vin";

type CustomerOption = {
  id: string;
  name: string;
  vehicles: {
    id: string;
    year: string | null;
    make: string | null;
    model: string | null;
    vin: string | null;
    bodyClass: string | null;
  }[];
  claims: {
    id: string;
    claimNumber: string;
    insuranceCarrier: string | null;
    vehicleId: string | null;
  }[];
};

type LaborRateOption = {
  id: string;
  name: string;
  type: "HOURLY" | "FLAT";
  amountCents: number;
  isDefault: boolean;
};

type MarkupOption = { code: string; name: string; percent: number };

type LaborTimeOption = {
  id: string;
  name: string;
  category: string | null;
  hours: number;
  defaultRateId: string | null;
  defaultRate: LaborRateOption | null;
};

type EditorSettings = {
  maxCombinedMarkupPercent: number;
  oversizedOsCents: number;
  oversizedDosCents: number;
  oversizedTripleCents: number;
  defaultHourlyCents: number;
};

type Photo = { url: string; name: string; path?: string; dataUrl?: string };

type CarrierMatrix = { carrierId: string; name: string; isStub: boolean; rows: MatrixRow[] };

type SavedRow = {
  id: string;
  estimateNumber: string;
  totalCents: number;
  carrierId: string;
  updatedAt: Date | string;
  customer: { name: string };
  vehicle: { year: string | null; make: string | null; model: string | null } | null;
  claim: { claimNumber: string } | null;
  lineItems?: { panelCode: string | null }[];
};

export function EstimateEditor({
  customers,
  matrixRows,
  carrierMatrices = [],
  markups,
  laborRates,
  laborTimes,
  settings,
  initial,
  initialPhotos = [],
  initialOwner = "",
  initialClaimNumber = "",
}: {
  customers: CustomerOption[];
  matrixRows: MatrixRow[];
  carrierMatrices?: CarrierMatrix[];
  markups: MarkupOption[];
  laborRates: LaborRateOption[];
  laborTimes: LaborTimeOption[];
  settings: EditorSettings;
  initial?: EstimateDraftPayload;
  initialPhotos?: Photo[];
  initialOwner?: string;
  initialClaimNumber?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [estimateId, setEstimateId] = useState(initial?.id);
  const [view, setView] = useState<"estimate" | "review">("estimate");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [vehicleId, setVehicleId] = useState(initial?.vehicleId ?? "");
  const [claimId, setClaimId] = useState(initial?.claimId ?? "");
  const [ownerName, setOwnerName] = useState(initialOwner);
  const [claimNumber, setClaimNumber] = useState(initialClaimNumber);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [bodyStyle, setBodyStyle] = useState<BodyStyle>(initial?.bodyStyle ?? "CAR");
  const [carrierId, setCarrierId] = useState(initial?.carrierId ?? "state_farm");
  const [showVehicle, setShowVehicle] = useState(!initialOwner && !initial?.customerId);
  const [showSaved, setShowSaved] = useState(false);
  const [savedRows, setSavedRows] = useState<SavedRow[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<HsKey | null>(null);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [emailTo, setEmailTo] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [vinMessage, setVinMessage] = useState<string | null>(null);
  const [vinOk, setVinOk] = useState(false);
  const skipAutosave = useRef(true);
  const defaultRate = DEFAULT_LABOR_RATE_CENTS;
  const [panels, setPanels] = useState<Record<HsKey, HsPanelState>>(() =>
    inflateHsPanels(initial?.lines ?? [], initial?.bodyStyle ?? "CAR", matrixRows, defaultRate),
  );

  const activeRows = useMemo(() => {
    const match = carrierMatrices.find((item) => item.carrierId === carrierId);
    if (match && !match.isStub && match.rows.length) return match.rows;
    return carrierMatrices.find((item) => item.carrierId === "state_farm")?.rows ?? matrixRows;
  }, [carrierId, carrierMatrices, matrixRows]);
  const carrierMeta = carrierMatrices.find((item) => item.carrierId === carrierId);
  const usingStateFarmFallback = Boolean(
    carrierId !== "state_farm" && (carrierMeta?.isStub || !carrierMeta?.rows.length),
  );

  const customer = customers.find((item) => item.id === customerId);
  const [vehicleFields, setVehicleFields] = useState({
    vin: "",
    year: "",
    make: "",
    model: "",
    bodyClass: "",
  });
  const [vehicleTouched, setVehicleTouched] = useState(false);

  useEffect(() => {
    const selected = customer?.vehicles.find((item) => item.id === vehicleId);
    if (!selected || vehicleTouched) return;
    setVehicleFields({
      vin: selected.vin ?? "",
      year: selected.year ?? "",
      make: selected.make ?? "",
      model: selected.model ?? "",
      bodyClass: selected.bodyClass ?? "",
    });
  }, [customer, vehicleId, vehicleTouched]);

  useEffect(() => {
    document.documentElement.dataset.editorReady = "true";
    return () => {
      delete document.documentElement.dataset.editorReady;
    };
  }, []);

  function onCustomerChange(nextId: string) {
    setCustomerId(nextId);
    const next = customers.find((item) => item.id === nextId);
    if (next) setOwnerName(next.name);
    const nextVehicle = next?.vehicles[0];
    setVehicleId(nextVehicle?.id ?? "");
    setVehicleTouched(false);
    setVehicleFields({
      vin: nextVehicle?.vin ?? "",
      year: nextVehicle?.year ?? "",
      make: nextVehicle?.make ?? "",
      model: nextVehicle?.model ?? "",
      bodyClass: nextVehicle?.bodyClass ?? "",
    });
    const matchingClaim = next?.claims.find((claim) => claim.vehicleId === nextVehicle?.id);
    setClaimId(matchingClaim?.id ?? next?.claims[0]?.id ?? "");
    if (matchingClaim || next?.claims[0]) {
      setClaimNumber((matchingClaim ?? next?.claims[0])?.claimNumber ?? "");
    }
  }

  const draftLines = useMemo(
    () => flattenHsPanels(bodyStyle, panels, activeRows),
    [bodyStyle, panels, activeRows],
  );

  const totals = useMemo(() => {
    const calculated = draftLines.map((line) =>
      computeLine(line, activeRows, markups, laborRates, laborTimes, {
        ...settings,
        defaultHourlyCents: defaultRate,
        oversizedOsCents: OS_DENT_CENTS,
        oversizedDosCents: DOUBLE_OS_CENTS,
      }),
    );
    return calculateEstimateTotals(calculated);
  }, [draftLines, activeRows, markups, laborRates, laborTimes, settings, defaultRate]);

  const activeKeys = HS_KEYS.filter((key) => hsPanelHasEntry(panels[key]));
  const maxByKey = Object.fromEntries(
    HS_KEYS.map((key) => {
      const ranges = rangesForPanel(activeRows, key);
      return [key, ranges[ranges.length - 1]?.max ?? 50];
    }),
  ) as Record<HsKey, number>;
  const countsByKey = Object.fromEntries(
    HS_KEYS.map((key) => {
      const panel = panels[key];
      const ranges = rangesForPanel(activeRows, key);
      const count =
        panel.rrEnabled || panel.convEnabled
          ? 0
          : dentCountForRange(panel.selectedRange, ranges);
      return [key, count];
    }),
  ) as Record<HsKey, number>;
  const totalDents = activeKeys.reduce((sum, key) => sum + (countsByKey[key] || 0), 0);
  const carrier = HS_CARRIERS.find((item) => item.id === carrierId) ?? HS_CARRIERS[6];
  const vehicleLabel = [vehicleFields.year, vehicleFields.make, vehicleFields.model]
    .filter(Boolean)
    .join(" ");

  function priced(key: HsKey) {
    return calculateHsPanel(key, panels[key], activeRows, markups);
  }

  function patchPanel(key: HsKey, patch: Partial<HsPanelState>) {
    setPanels((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }

  function requestCarrierChange(nextId: string) {
    if (nextId === carrierId) return;
    if (activeKeys.length > 0) {
      const ok = window.confirm(
        "Switch carrier? Entered panels stay on the estimate. Prices will recalculate against the new matrix.",
      );
      if (!ok) return;
    }
    setCarrierId(nextId);
  }

  const persist = useCallback(
    async (isAuto: boolean) => {
      if (!ownerName.trim() && !customerId) {
        if (!isAuto) setError("Enter an owner name before saving.");
        return;
      }
      setError(null);
      setSaveState("saving");
      const result = await saveEstimateAction({
        id: estimateId,
        customerId,
        vehicleId: vehicleId || null,
        claimId: claimId || null,
        notes,
        bodyStyle,
        carrierId,
        ownerName,
        claimNumber,
        lines: flattenHsPanels(bodyStyle, panels, activeRows),
        vehiclePatch:
          vehicleFields.year || vehicleFields.make || vehicleFields.vin || vehicleFields.model
            ? vehicleFields
            : null,
        photos: photos.map((photo) => ({
          path: photo.path,
          name: photo.name,
          dataUrl: photo.dataUrl || (photo.url.startsWith("data:") ? photo.url : undefined),
        })),
      });
      if ("error" in result && result.error) {
        setSaveState("error");
        if (!isAuto) setError(result.error);
        return;
      }
      if ("id" in result) {
        setEstimateId(result.id);
        setSaveState("saved");
        if (!initial?.id && result.id !== estimateId) {
          router.replace(`/estimates/${result.id}/edit`);
        }
      }
    },
    [
      activeRows,
      bodyStyle,
      carrierId,
      claimId,
      claimNumber,
      customerId,
      estimateId,
      initial?.id,
      notes,
      ownerName,
      panels,
      photos,
      router,
      vehicleFields,
      vehicleId,
    ],
  );

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (!ownerName.trim() && !customerId) return;
    const timer = window.setTimeout(() => {
      void persist(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [panels, ownerName, claimNumber, carrierId, vehicleFields, bodyStyle, notes, photos, customerId, persist]);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = String(event.target?.result || "");
        if (url) setPhotos((current) => [...current, { url, name: file.name, dataUrl: url }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function onVinChange(raw: string) {
    const vin = normalizeVin(raw).replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
    setVehicleTouched(true);
    setVehicleFields((current) => ({ ...current, vin }));
    if (vin.length !== 17) {
      setVinMessage(null);
      setVinOk(false);
      return;
    }
    const local = decodeVinLocalWmi(vin);
    if (local) {
      setVehicleFields((current) => ({
        ...current,
        vin,
        year: local.year || current.year,
        make: local.make || current.make,
      }));
      setVinOk(Boolean(local.make));
      setVinMessage(
        local.make
          ? "VIN decoded — year & make auto-filled"
          : "VIN recognized but make not in database — fill manually",
      );
    }
    void decodeVinAction(vin).then((result) => {
      if (!result.ok) {
        if (!local) {
          setVinOk(false);
          setVinMessage(result.error);
        }
        return;
      }
      setVehicleFields((current) => ({
        ...current,
        vin: result.data.vin,
        year: result.data.year || current.year,
        make: result.data.make || current.make,
        model: result.data.model || current.model,
        bodyClass: result.data.bodyClass || current.bodyClass,
      }));
      const suggested = bodyStyleFromClass(result.data.bodyClass);
      if (suggested) setBodyStyle(suggested);
      setVinOk(true);
      setVinMessage("VIN decoded — year & make auto-filled");
    });
  }

  async function openSaved() {
    setShowSaved(true);
    setSavedLoading(true);
    const rows = await listSavedEstimatesAction();
    setSavedRows(rows as SavedRow[]);
    setSavedLoading(false);
  }

  function resetNew() {
    if (activeKeys.length || ownerName || photos.length) {
      const ok = window.confirm("Start a new estimate? Unsaved changes on this screen will be lost.");
      if (!ok) return;
    }
    router.push("/estimates/new");
    if (!estimateId) {
      skipAutosave.current = true;
      setEstimateId(undefined);
      setOwnerName("");
      setClaimNumber("");
      setCustomerId("");
      setVehicleId("");
      setClaimId("");
      setNotes("");
      setCarrierId("state_farm");
      setBodyStyle("CAR");
      setPhotos([]);
      setPanels(inflateHsPanels([], "CAR", activeRows, defaultRate));
      setVehicleFields({ vin: "", year: "", make: "", model: "", bodyClass: "" });
      setShowVehicle(true);
      setView("estimate");
      setSaveState("idle");
    }
  }

  function reportHtml() {
    const report = buildReportSections(panels, markups, activeKeys, activeRows);
    return generateReportHTML({
      owner: ownerName || customer?.name || "",
      vehicle: vehicleLabel,
      vin: vehicleFields.vin,
      claim: claimNumber,
      carrierLabel: carrier.label,
      photos,
      sections: report.sections,
      totalPriceCents: report.totalPriceCents,
      totalLaborCents: report.totalLaborCents,
    });
  }

  function downloadReport() {
    const slug = [vehicleFields.year, vehicleFields.make, vehicleFields.model]
      .filter(Boolean)
      .join("_")
      .replace(/[^A-Za-z0-9_]+/g, "_") || "Estimate";
    const blob = new Blob([reportHtml()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NTXHail_Estimate_${slug}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    const html = reportHtml();
    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-report-frame", "true");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      const blob = new Blob([html], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  }

  async function downloadZip() {
    const zip = new JSZip();
    const slug = [vehicleFields.year, vehicleFields.make, vehicleFields.model]
      .filter(Boolean)
      .join("_")
      .replace(/[^A-Za-z0-9_]+/g, "_") || "Photos";
    const folder = zip.folder(`NTXHail_Photos_${slug}`) ?? zip;
    for (const [index, photo] of photos.entries()) {
      const name = photo.name || `photo-${index + 1}.jpg`;
      if (photo.dataUrl?.includes(",")) {
        folder.file(name, photo.dataUrl.split(",")[1], { base64: true });
      } else {
        const response = await fetch(photo.url);
        folder.file(name, await response.blob());
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NTXHail_Photos_${slug}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const mailtoHref = emailTo
    ? `mailto:${emailTo}?subject=${encodeURIComponent(
        `Hail Damage Estimate — ${vehicleLabel || "Vehicle"} — ${formatMoney(totals.totalCents)}`,
      )}&body=${encodeURIComponent(emailBody(ownerName, vehicleLabel, vehicleFields.vin, claimNumber, carrier.label, activeKeys, panels, bodyStyle, totals.totalCents, activeRows, markups))}`
    : undefined;

  const selectedState = selectedPanel ? panels[selectedPanel] : null;
  const hasCustomerBar = Boolean(ownerName || vehicleFields.year || vehicleFields.make);

  return (
    <div className="hs-app min-h-dvh w-full overflow-x-clip bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-50 bg-[#0a1628] px-3 py-3 shadow-[0_2px_12px_rgba(10,22,40,0.18)] lg:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <rect width="28" height="28" rx="5" fill="#0a1628" />
            <text x="4" y="19" fontFamily="sans-serif" fontWeight="900" fontSize="13" fill="white">
              NTX
            </text>
            <polygon points="20,6 24,14 20,22 16,14" fill="#dc2626" />
          </svg>
          <div>
            <div className="text-[17px] leading-none font-black tracking-[1.5px] text-white">
              HAILSPEC
            </div>
            <div className="text-[9px] font-bold tracking-widest text-blue-300 uppercase">
              by NTX Hail
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SavePill state={saveState} />
          <button
            type="button"
            onClick={() => void openSaved()}
            className="min-h-11 rounded-[10px] border border-white/20 bg-white/10 px-3 text-[12px] font-semibold text-white"
          >
            Saved
          </button>
          <button
            type="button"
            onClick={resetNew}
            className="min-h-11 rounded-[10px] border border-white/20 bg-white/10 px-3 text-[12px] font-semibold text-white"
          >
            + New
          </button>
          <Link
            href="/estimates"
            className="inline-flex min-h-11 items-center rounded-[10px] border border-white/20 bg-white/10 px-3 text-[12px] font-semibold text-white"
          >
            Jobs
          </Link>
        </div>
        </div>
      </header>
      <div
        className="h-[3px]"
        style={{ background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #dc2626 100%)" }}
      />

      {error ? (
        <p className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {hasCustomerBar && !showVehicle ? (
        <button
          type="button"
          onClick={() => setShowVehicle(true)}
          className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-left lg:px-6"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold">{ownerName || "No owner"}</div>
              <div className="truncate text-[11px] text-slate-500">
                {vehicleLabel || "Vehicle not set"}
                {claimNumber ? ` · #${claimNumber}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-bold"
              style={{
                color: carrier.color,
                background: `${carrier.color}18`,
                border: `1px solid ${carrier.color}33`,
              }}
            >
              {carrier.label}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>
      ) : null}

      {showVehicle ? (
        <section className="mx-auto w-full max-w-6xl space-y-3 border-b border-slate-200 bg-white p-5 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3 lg:space-y-0">
          <div className="text-[15px] font-bold lg:col-span-2">Vehicle / Claim Info</div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:col-span-2">
            <label className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Owner Name
              </span>
              <input
                list="hs-owners"
                data-field="owner"
                value={ownerName}
                onChange={(event) => {
                  const name = event.target.value;
                  setOwnerName(name);
                  const match = customers.find(
                    (item) => item.name.toLowerCase() === name.trim().toLowerCase(),
                  );
                  if (match) onCustomerChange(match.id);
                  else setCustomerId("");
                }}
                placeholder="Owner Name"
                className="h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-3 text-base"
              />
              <datalist id="hs-owners">
                {customers.map((item) => (
                  <option key={item.id} value={item.name} />
                ))}
              </datalist>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Claim #
              </span>
              <input
                data-field="claim"
                value={claimNumber}
                onChange={(event) => {
                  setClaimNumber(event.target.value);
                  setClaimId("");
                }}
                placeholder="Claim #"
                className="h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-3 text-base"
              />
            </label>
          </div>
          <label className="block space-y-1 lg:col-span-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              VIN
            </span>
            <input
              data-field="vin"
              value={vehicleFields.vin}
              onChange={(event) => onVinChange(event.target.value)}
              placeholder="17-character VIN"
              className="h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-3 font-mono text-base tracking-wide uppercase"
            />
            <div className="flex justify-between text-[11px]">
              <span className={vinOk ? "font-semibold text-emerald-600" : "text-amber-600"}>
                {vinMessage}
              </span>
              <span className="text-slate-400">{vehicleFields.vin.length}/17</span>
            </div>
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:col-span-2">
            <SearchSelect
              label="Year"
              value={vehicleFields.year}
              options={VEHICLE_YEARS}
              placeholder="Year"
              onChange={(year) => {
                setVehicleTouched(true);
                setVehicleFields((current) => ({ ...current, year }));
              }}
            />
            <SearchSelect
              label="Make"
              value={vehicleFields.make}
              options={VEHICLE_MAKES}
              placeholder="Make"
              onChange={(make) => {
                setVehicleTouched(true);
                setVehicleFields((current) => ({
                  ...current,
                  make,
                  model: VEHICLE_DATA[make]?.includes(current.model) ? current.model : "",
                }));
              }}
            />
            <SearchSelect
              label="Model"
              value={vehicleFields.model}
              options={VEHICLE_DATA[vehicleFields.make] ?? []}
              disabled={!vehicleFields.make}
              placeholder="Model"
              onChange={(model) => {
                setVehicleTouched(true);
                setVehicleFields((current) => ({ ...current, model }));
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:col-span-2">
            {BODY_STYLES.map((style) => (
              <button
                key={style.code}
                type="button"
                data-body-style={style.code}
                onClick={() => setBodyStyle(style.code)}
                className={`min-h-11 rounded-lg text-xs font-bold ${
                  bodyStyle === style.code
                    ? "bg-[#2563eb] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
          <textarea
            className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-base lg:col-span-2"
            rows={2}
            placeholder="Estimate notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <button
            type="button"
            className="min-h-11 w-full rounded-lg bg-[#2563eb] py-2.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)] lg:col-span-2"
            onClick={() => setShowVehicle(false)}
          >
            Done
          </button>
        </section>
      ) : null}

      <div className="flex items-center gap-2.5 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2.5 lg:px-6">
        <span className="shrink-0 text-[10px] font-bold tracking-wider text-slate-400">
          CARRIER
        </span>
        {HS_CARRIERS.map((item) => {
          const meta = carrierMatrices.find((row) => row.carrierId === item.id);
          const stub = item.id !== "state_farm" && (meta?.isStub ?? true);
          return (
            <button
              key={item.id}
              type="button"
              data-carrier={item.id}
              onClick={() => requestCarrierChange(item.id)}
              className="min-h-11 shrink-0 rounded-full border-[1.5px] px-3 text-xs font-semibold"
              style={
                carrierId === item.id
                  ? {
                      background: item.color,
                      color: "#fff",
                      borderColor: item.color,
                      boxShadow: `0 2px 8px ${item.color}40`,
                    }
                  : {
                      background: "#f8fafc",
                      color: stub ? "#94a3b8" : "#64748b",
                      borderColor: "#e2e8f0",
                    }
              }
            >
              {item.label}
              {stub ? " ▸fill" : ""}
            </button>
          );
        })}
      </div>

      {usingStateFarmFallback ? (
        <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 lg:mx-auto lg:max-w-6xl">
          {carrier.label} matrix is not populated yet — estimates use State Farm prices until that
          carrier’s table is filled in.
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-6xl border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setView("estimate")}
          className={`min-h-11 flex-1 py-3.5 text-sm font-semibold ${
            view === "estimate" ? "border-b-2 border-[#2563eb] text-[#2563eb]" : "text-slate-500"
          }`}
        >
          Estimate
        </button>
        <button
          type="button"
          data-action="review-all"
          onClick={() => setView("review")}
          className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 py-3.5 text-sm font-semibold ${
            view === "review" ? "border-b-2 border-[#2563eb] text-[#2563eb]" : "text-slate-500"
          }`}
        >
          Review &amp; Export
          {activeKeys.length > 0 ? (
            <span className="rounded-full bg-[#2563eb] px-1.5 text-[11px] font-extrabold text-white">
              {activeKeys.length}
            </span>
          ) : null}
        </button>
      </div>

      {view === "estimate" ? (
        <div className="hs-page-pad mx-auto w-full max-w-6xl px-4 pt-4 md:grid md:grid-cols-2 md:items-start md:gap-6">
          <div>
          <div className="mb-4 flex gap-2">
            <Stat label="Panels" value={String(activeKeys.length)} />
            <Stat label="Dents" value={String(totalDents)} />
            <Stat label="Total" value={formatMoney(totals.totalCents)} accent />
          </div>
          <section className="mb-4 rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Tap a panel to add damage
              </div>
              <button
                type="button"
                onClick={() => setShowVehicle((value) => !value)}
                className="min-h-11 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-[11px] font-bold text-[#2563eb]"
              >
                + Customer
              </button>
            </div>
            <CarSilhouette
              panels={panels}
              selected={selectedPanel}
              maxByKey={maxByKey}
              counts={countsByKey}
              onSelect={setSelectedPanel}
            />
            <div className="mt-2 flex justify-center gap-3 text-[10px] text-slate-400">
              {[
                ["None", "#f1f5f9"],
                ["Low", "rgba(37,99,235,0.35)"],
                ["Med", "rgba(59,130,246,0.5)"],
                ["High", "rgba(249,115,22,0.55)"],
                ["Severe", "rgba(220,38,38,0.65)"],
              ].map(([label, color]) => (
                <span key={label} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm border border-slate-200" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </section>
          </div>

          <div>
          <section className="mb-5">
            <div className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Photos
            </div>
            <div className="flex gap-2">
              <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-slate-300 bg-white py-4 text-[15px] font-semibold text-slate-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => addPhotos(event.target.files)}
                />
              </label>
              <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-slate-300 bg-white py-4 text-[15px] font-semibold text-slate-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Gallery
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => addPhotos(event.target.files)}
                />
              </label>
            </div>
            {photos.length > 0 ? (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {photos.map((photo, index) => (
                  <div key={`${photo.name}-${index}`} className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="hs-icon-xs absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-[11px] text-white"
                      onClick={() => setPhotos((current) => current.filter((_, item) => item !== index))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {activeKeys.length > 0 ? (
            <section>
              <div className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Damage log
              </div>
              {activeKeys.map((key) => {
                const panel = panels[key];
                const meta = panel.rrEnabled
                  ? "R&R — Remove & Replace"
                  : panel.convEnabled
                    ? "Conventional Repair"
                    : `${panel.selectedRange || ""} ${DENT_SIZE_LABELS[panel.size].toLowerCase()} dents`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPanel(key)}
                    className="mb-2 flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm"
                  >
                    <div>
                      <div className="text-sm font-bold">
                        {key === "TRUNK" ? trunkLabel(bodyStyle) : HS_LABELS[key]}
                      </div>
                      <div className="text-xs text-slate-500">
                        {meta}
                        {panel.markupCodes.length ? " · add-on" : ""}
                        {panel.riEnabled ? " · R&I" : ""}
                      </div>
                    </div>
                    <div className="text-base font-extrabold text-[#2563eb]">
                      {formatMoney(priced(key).totalCents)}
                    </div>
                  </button>
                );
              })}
            </section>
          ) : null}
          </div>
        </div>
      ) : (
        <div className="hs-page-pad mx-auto w-full max-w-4xl px-4 pt-4">
          {activeKeys.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mb-2 text-sm font-semibold">No panels estimated yet</div>
              <div className="text-sm text-slate-400">Tap panels on the car diagram to begin.</div>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="font-extrabold">Estimate Summary</div>
                    <div className="text-xs text-slate-500">
                      {vehicleLabel || "Vehicle not set"}
                      {claimNumber ? ` · #${claimNumber}` : ""}
                    </div>
                    <div
                      className="mt-1.5 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        color: carrier.color,
                        background: `${carrier.color}15`,
                        border: `1px solid ${carrier.color}30`,
                      }}
                    >
                      {carrier.label}
                    </div>
                  </div>
                  <div className="text-xl font-black text-[#2563eb]">
                    {formatMoney(totals.totalCents)}
                  </div>
                </div>
                <div className="space-y-2 md:hidden">
                  {activeKeys.map((key) => {
                    const panel = panels[key];
                    const pricedPanel = priced(key);
                    const nonPdr = panel.rrEnabled || panel.convEnabled;
                    const mode = panel.rrEnabled ? "R&R" : panel.convEnabled ? "Conv." : null;
                    const hours = panel.rrEnabled ? panel.rrHours : panel.convEnabled ? panel.convHours : 0;
                    const detail = nonPdr
                      ? `${mode} · ${hours.toFixed(1)} hrs`
                      : `${panel.selectedRange} · ${DENT_SIZE_LABELS[panel.size]}`;
                    return (
                      <div key={key} className="border-t border-slate-100 py-3 text-[13px] text-slate-800 first:border-t-0 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold">
                              {key === "TRUNK" ? trunkLabel(bodyStyle) : HS_LABELS[key]}
                              {nonPdr ? " ✱" : ""}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-500">
                              {detail}
                              {panel.riEnabled ? ` · R&I ${formatMoney(pricedPanel.riCents)}` : ""}
                            </div>
                          </div>
                          <div className="shrink-0 text-sm font-bold text-[#2563eb]">
                            {formatMoney(pricedPanel.totalCents)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[13px] font-bold text-slate-800">
                    <span>Grand Total · {totalDents} dents</span>
                    <span className="text-[#2563eb]">{formatMoney(totals.totalCents)}</span>
                  </div>
                </div>
                <div className="table-scroll hidden text-[13px] font-semibold text-slate-400 md:block">
                  <div className="mb-1 flex min-w-[560px] gap-1 xl:min-w-0">
                    <span className="flex-[2]">Panel</span>
                    <span className="flex-1 text-center">Dents</span>
                    <span className="flex-1 text-center">Size</span>
                    <span className="flex-1 text-center">R&amp;I</span>
                    <span className="flex-1 text-right">Cost</span>
                  </div>
                  {activeKeys.map((key) => {
                    const panel = panels[key];
                    const pricedPanel = priced(key);
                    const nonPdr = panel.rrEnabled || panel.convEnabled;
                    const mode = panel.rrEnabled ? "R&R" : panel.convEnabled ? "Conv." : null;
                    const hours = panel.rrEnabled ? panel.rrHours : panel.convEnabled ? panel.convHours : 0;
                    return (
                      <div key={key} className="flex min-w-[560px] gap-1 border-t border-slate-100 py-2.5 text-[13px] text-slate-800 xl:min-w-0">
                        <span className="flex-[2] font-medium">
                          {key === "TRUNK" ? trunkLabel(bodyStyle) : HS_LABELS[key]}
                          {nonPdr ? " ✱" : ""}
                        </span>
                        <span
                          className="flex-1 text-center"
                          style={{ color: panel.rrEnabled ? "#ef4444" : panel.convEnabled ? "#f97316" : undefined }}
                        >
                          {mode || panel.selectedRange}
                        </span>
                        <span className="flex-1 text-center">
                          {nonPdr ? `${hours.toFixed(1)}hrs` : DENT_SIZE_LABELS[panel.size]}
                        </span>
                        <span className={`flex-1 text-center ${panel.riEnabled ? "text-[#2563eb]" : "text-slate-400"}`}>
                          {panel.riEnabled ? formatMoney(pricedPanel.riCents) : "—"}
                        </span>
                        <span className="flex-1 text-right font-semibold">
                          {formatMoney(pricedPanel.totalCents)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-1 flex min-w-[560px] gap-1 border-t border-slate-200 pt-2 text-sm font-bold text-slate-800 xl:min-w-0">
                    <span className="flex-[2]">Grand Total</span>
                    <span className="flex-1 text-center">{totalDents}</span>
                    <span className="flex-1" />
                    <span className="flex-1" />
                    <span className="flex-1 text-right">{formatMoney(totals.totalCents)}</span>
                  </div>
                </div>
              </div>
              <div className="mb-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Export
              </div>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={printReport}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-200 bg-white py-4 text-[15px] font-semibold text-slate-700 shadow-sm"
                >
                  Print
                </button>
                <button
                  type="button"
                  data-action="download-report"
                  onClick={downloadReport}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-200 bg-white py-4 text-[15px] font-semibold text-slate-700 shadow-sm"
                >
                  Download
                </button>
              </div>
              <div className="mb-3 flex gap-2">
                <input
                  type="email"
                  value={emailTo}
                  onChange={(event) => setEmailTo(event.target.value)}
                  placeholder="recipient@email.com"
                  className="h-12 flex-1 rounded-[10px] border-[1.5px] border-slate-200 bg-[#f8fafc] px-3.5 text-base"
                />
                <a
                  href={mailtoHref}
                  onClick={(event) => {
                    if (!emailTo) {
                      event.preventDefault();
                      return;
                    }
                    setEmailDone(true);
                    window.setTimeout(() => setEmailDone(false), 3000);
                  }}
                  className={`flex h-12 items-center rounded-xl bg-[#2563eb] px-4 text-sm font-bold text-white ${
                    emailTo ? "" : "pointer-events-none opacity-40"
                  }`}
                >
                  Email
                </a>
              </div>
              {emailDone ? (
                <p className="mb-2 text-xs font-semibold text-emerald-600">
                  Your mail app opened — review and hit Send
                </p>
              ) : null}
              <p className="mb-4 text-[11px] leading-5 text-slate-400">
                Opens your default mail app with the estimate pre-filled. You review and send from there.
              </p>
              {photos.length > 0 ? (
                <section className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      Attached photos ({photos.length})
                    </div>
                    <button
                      type="button"
                      onClick={() => void downloadZip()}
                      className="text-[12px] font-bold text-[#2563eb]"
                    >
                      Download ZIP
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${photo.name}-${index}`}
                        src={photo.url}
                        alt={photo.name}
                        className="h-24 w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      )}

      <div
        data-save-bar
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] lg:left-64"
      >
        <div className="mx-auto flex min-h-[var(--hs-savebar)] w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total</p>
            <p className="text-xl font-black text-[#2563eb]">{formatMoney(totals.totalCents)}</p>
          </div>
          <button
            type="button"
            data-action="save-estimate"
            disabled={saveState === "saving"}
            onClick={() => void persist(false)}
            className="min-h-11 min-w-36 rounded-xl bg-[#2563eb] px-5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
          >
            {saveState === "saving" ? "Saving…" : estimateId ? "Save draft" : "Save estimate"}
          </button>
        </div>
      </div>

      {selectedPanel && selectedState ? (
        <PanelSheet
          hsKey={selectedPanel}
          shopCode={selectedPanel}
          bodyStyle={bodyStyle}
          panel={selectedState}
          rows={activeRows}
          markups={markups}
          settings={{
            ...settings,
            oversizedOsCents: OS_DENT_CENTS,
            oversizedDosCents: DOUBLE_OS_CENTS,
            defaultHourlyCents: defaultRate,
          }}
          hasSaved={hsPanelHasEntry(selectedState)}
          onChange={(patch) => patchPanel(selectedPanel, patch)}
          onSave={() => setSelectedPanel(null)}
          onClose={() => setSelectedPanel(null)}
          onRemove={() => {
            setPanels((current) => ({
              ...current,
              [selectedPanel]: emptyHsPanel(defaultRate, selectedPanel),
            }));
            setSelectedPanel(null);
          }}
        />
      ) : null}

      {showSaved ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 backdrop-blur-[6px] lg:items-center">
          <div
            data-saved-list
            className="flex h-dvh max-h-dvh w-full max-w-[480px] flex-col overflow-hidden rounded-t-[20px] bg-white lg:h-auto lg:max-h-[80dvh] lg:max-w-lg lg:rounded-2xl"
          >
            <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-3">
              <div className="text-lg font-extrabold">Saved estimates</div>
              <button
                type="button"
                className="flex size-11 items-center justify-center text-slate-400"
                onClick={() => setShowSaved(false)}
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
            {savedLoading ? (
              <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
            ) : savedRows.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mb-2 text-2xl">📋</div>
                <div className="text-sm font-semibold">No saved estimates yet</div>
                <div className="text-sm text-slate-400">Estimates auto-save as you build.</div>
              </div>
            ) : (
              savedRows.map((row) => {
                const panelsCount = new Set(
                  (row.lineItems ?? []).map((item) => item.panelCode).filter(Boolean),
                ).size;
                const when = new Date(row.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const carrierLabel =
                  HS_CARRIERS.find((item) => item.id === row.carrierId)?.label ?? row.carrierId;
                return (
                  <div key={row.id} className="mb-2 rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">{row.customer.name || "No owner"}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatVehicle(row.vehicle)}
                          {row.claim ? ` • #${row.claim.claimNumber}` : ""}
                          {` • ${panelsCount} panels • ${carrierLabel} • ${when}`}
                        </div>
                      </div>
                      <div className="text-sm font-extrabold text-[#2563eb]">
                        {formatMoney(row.totalCents)}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="min-h-11 flex-1 rounded-lg bg-[#2563eb] py-2 text-sm font-bold text-white"
                        onClick={() => router.push(`/estimates/${row.id}/edit`)}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="min-h-11 flex-1 rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-bold text-red-600"
                        onClick={async () => {
                          if (!window.confirm("Delete this estimate?")) return;
                          await deleteEstimateAction(row.id);
                          setSavedRows((current) => current.filter((item) => item.id !== row.id));
                          if (estimateId === row.id) resetNew();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SavePill({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const label =
    state === "saving" ? "Saving…" : state === "saved" ? "✓ Saved" : "⚠ Error";
  const color =
    state === "saving" ? "text-blue-200" : state === "saved" ? "text-emerald-300" : "text-red-300";
  return <span className={`text-[10px] font-bold ${color}`}>{label}</span>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-center shadow-sm">
      <div className={`text-[22px] font-extrabold ${accent ? "text-[#2563eb]" : "text-slate-900"}`}>
        {value}
      </div>
      <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</div>
    </div>
  );
}

function emailBody(
  owner: string,
  vehicle: string,
  vin: string,
  claim: string,
  carrier: string,
  keys: HsKey[],
  panels: Record<HsKey, HsPanelState>,
  bodyStyle: BodyStyle,
  totalCents: number,
  rows: MatrixRow[],
  markups: MarkupOption[],
) {
  const lines = keys
    .map((key) => {
      const panel = panels[key];
      const label = key === "TRUNK" ? trunkLabel(bodyStyle) : HS_LABELS[key];
      const kind = panel.rrEnabled
        ? "R&R"
        : panel.convEnabled
          ? "Conv."
          : `${panel.selectedRange || ""} ${DENT_SIZE_LABELS[panel.size].toLowerCase()} dents`;
      return `  ${label}: ${kind} — ${formatMoney(calculateHsPanel(key, panel, rows, markups).totalCents)}`;
    })
    .join("\n");
  return `Carrier: ${carrier}\nOwner: ${owner || "N/A"}\nVehicle: ${vehicle || "N/A"}\nVIN: ${vin || "N/A"}\nClaim #: ${claim || "N/A"}\n\n${lines}\n\nGRAND TOTAL: ${formatMoney(totalCents)}\n\n— NTX Hail | ntxhail.com`;
}

function computeLine(
  line: EstimateDraftLine,
  matrixRows: MatrixRow[],
  markups: MarkupOption[],
  laborRates: LaborRateOption[],
  laborTimes: LaborTimeOption[],
  settings: EditorSettings,
): CalculatedLine {
  if (line.type === "PDR_PANEL") {
    return {
      type: "PDR_PANEL",
      ...calculatePanelLine(line, matrixRows, markups, settings.maxCombinedMarkupPercent),
    };
  }
  if (line.type === "OVERSIZED") {
    return {
      type: "OVERSIZED",
      ...calculateOversizedLine({
        kind: line.kind,
        quantity: line.quantity,
        unitCents:
          line.kind === "OS_3X"
            ? settings.oversizedTripleCents
            : line.kind === "OS_2X"
              ? settings.oversizedDosCents
              : settings.oversizedOsCents,
      }),
    };
  }
  if (line.type === "LABOR") {
    const rate = laborRates.find((item) => item.id === line.laborRateId);
    const time = laborTimes.find((item) => item.id === line.laborTimeId);
    return {
      type: "LABOR",
      ...calculateLaborLine({
        description: line.description || time?.name || "Labor",
        rateType: line.rateType,
        hours: line.hours,
        rateCents: line.rateCents,
        rateName: rate?.name,
        timeName: time?.name,
      }),
    };
  }
  if (line.type === "CONVENTIONAL") {
    return {
      type: "CONVENTIONAL",
      ...calculateConventionalLine({
        ...line,
        hourlyRateCents: line.hourlyRateCents ?? settings.defaultHourlyCents,
      }),
    };
  }
  if (line.type === "REPLACE") {
    return {
      type: "REPLACE",
      ...calculateReplaceLine({
        ...line,
        hourlyRateCents: line.hourlyRateCents ?? settings.defaultHourlyCents,
      }),
    };
  }
  return { type: "CUSTOM", amountCents: line.amountCents, description: line.description };
}
