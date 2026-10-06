"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import {
  deleteEstimateAction,
  listSavedEstimatesAction,
  saveEstimateAction,
} from "@/app/actions/estimates";
import { decodeVinAction } from "@/app/actions/vin";
import { CarSilhouette } from "@/components/car-silhouette";
import { PanelPhotoField, PhotoSections, filesToDraftPhotos, photoCountForPanel } from "@/components/photo-fields";
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
import { clearLocalDraft, readLocalDraft, writeLocalDraft } from "@/lib/estimate-local-draft";
import type { LocalEstimateDraft } from "@/lib/estimate-local-draft";
import {
  mergeSavedPhotos,
  normalizePhotoSlot,
  photoFieldKey,
  resolveFieldLabel,
  type DraftPhoto,
  type PhotoSlot,
} from "@/lib/estimate-photos";
import type { EstimateDraftLine, EstimateDraftPayload } from "@/lib/estimate-types";
import { photoNeedsUpload, uploadEstimatePhoto } from "@/lib/upload-estimate-photo";
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

type IncomingPhoto = {
  url: string;
  name: string;
  path?: string;
  dataUrl?: string;
  label?: string;
  slot?: string;
  panelCode?: string;
};

type SaveDraft = LocalEstimateDraft & { activeRows: MatrixRow[] };

function vehicleSnapshot(
  customers: CustomerOption[],
  customerId: string,
  vehicleId: string,
) {
  const selected = customers
    .find((item) => item.id === customerId)
    ?.vehicles.find((item) => item.id === vehicleId);
  return {
    vin: selected?.vin ?? "",
    year: selected?.year ?? "",
    make: selected?.make ?? "",
    model: selected?.model ?? "",
    bodyClass: selected?.bodyClass ?? "",
  };
}

function draftSignature(draft: SaveDraft) {
  return JSON.stringify({
    customerId: draft.customerId,
    vehicleId: draft.vehicleId,
    claimId: draft.claimId,
    ownerName: draft.ownerName,
    claimNumber: draft.claimNumber,
    notes: draft.notes,
    bodyStyle: draft.bodyStyle,
    carrierId: draft.carrierId,
    vehicleFields: draft.vehicleFields,
    panels: draft.panels,
    fieldLabels: draft.fieldLabels,
    photos: draft.photos.map((photo) => ({
      key: photo.key,
      label: photo.label,
      slot: photo.slot,
      panelCode: photo.panelCode,
      name: photo.name,
    })),
  });
}

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
  initialPhotoFields = [],
  initialOwner = "",
  initialClaimNumber = "",
  backHref = "/estimates",
}: {
  customers: CustomerOption[];
  matrixRows: MatrixRow[];
  carrierMatrices?: CarrierMatrix[];
  markups: MarkupOption[];
  laborRates: LaborRateOption[];
  laborTimes: LaborTimeOption[];
  settings: EditorSettings;
  initial?: EstimateDraftPayload;
  initialPhotos?: IncomingPhoto[];
  initialPhotoFields?: { slot: string; panelCode?: string; label: string }[];
  initialOwner?: string;
  initialClaimNumber?: string;
  backHref?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    initial?.id ? "saved" : "idle",
  );
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
  const [photos, setPhotos] = useState<DraftPhoto[]>(() =>
    initialPhotos.map((photo, index) => ({
      key: photo.path || `photo-${index}`,
      url: photo.url,
      name: photo.name,
      path: photo.path,
      dataUrl: photo.dataUrl,
      label: photo.label ?? "",
      slot: normalizePhotoSlot(photo.slot),
      panelCode: photo.slot === "PANEL" ? photo.panelCode || "" : "",
    })),
  );
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>(() => {
    const labels: Record<string, string> = {};
    for (const field of initialPhotoFields) {
      const key = photoFieldKey(field.slot, field.panelCode || "");
      if (field.label.trim()) labels[key] = field.label;
    }
    return labels;
  });
  const [emailTo, setEmailTo] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [vinMessage, setVinMessage] = useState<string | null>(null);
  const [vinOk, setVinOk] = useState(false);
  const lastSavedSignature = useRef<string | null>(null);
  const estimateIdRef = useRef(initial?.id);
  const photosRef = useRef<DraftPhoto[]>([]);
  const draftRef = useRef<SaveDraft | null>(null);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const saveTimer = useRef<number | null>(null);
  const echoPhotos = useRef(false);
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
  const [vehicleFields, setVehicleFields] = useState(() =>
    vehicleSnapshot(customers, initial?.customerId ?? "", initial?.vehicleId ?? ""),
  );

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

  useEffect(() => {
    photosRef.current = photos;
    draftRef.current = {
      synced: false,
      estimateId,
      customerId,
      vehicleId,
      claimId,
      ownerName,
      claimNumber,
      notes,
      bodyStyle,
      carrierId,
      vehicleFields,
      panels,
      photos,
      fieldLabels,
      activeRows,
    };
  });

  const flushSave = useCallback(
    (isAuto: boolean) => {
      const run = saveChain.current.then(() => saveDraft(isAuto));
      saveChain.current = run.then(
        () => undefined,
        () => undefined,
      );
      return run;

      async function saveDraft(auto: boolean, attempt = 0): Promise<boolean> {
        const draft = draftRef.current;
        if (!draft) return false;
        if (!draft.ownerName.trim() && !draft.customerId) {
          if (!auto) setError("Enter an owner name before saving.");
          return false;
        }
        const idAtStart = estimateIdRef.current;
        setError(null);
        setSaveState("saving");
        const savingShownAt = Date.now();
        const signature = draftSignature(draft);
        const toPhotoPayload = (photo: DraftPhoto) => ({
          clientKey: photo.key,
          path: photo.path,
          name: photo.name,
          label: photo.label,
          slot: photo.slot,
          panelCode: photo.panelCode,
          dataUrl: photo.path
            ? undefined
            : photo.dataUrl || (photo.url.startsWith("data:") ? photo.url : undefined),
        });
        const payloadBase = {
          customerId: draft.customerId,
          vehicleId: draft.vehicleId || null,
          claimId: draft.claimId || null,
          notes: draft.notes,
          bodyStyle: draft.bodyStyle,
          carrierId: draft.carrierId,
          ownerName: draft.ownerName,
          claimNumber: draft.claimNumber,
          lines: flattenHsPanels(
            draft.bodyStyle,
            draft.panels as Record<HsKey, HsPanelState>,
            draft.activeRows,
          ),
          vehiclePatch:
            draft.vehicleFields.year ||
            draft.vehicleFields.make ||
            draft.vehicleFields.vin ||
            draft.vehicleFields.model
              ? draft.vehicleFields
              : null,
          photoFields: Object.entries(draft.fieldLabels).flatMap(([key, label]) => {
            const splitAt = key.indexOf(":");
            const slot = key.slice(0, splitAt);
            const panelCode = key.slice(splitAt + 1);
            const trimmed = label.trim();
            if (!trimmed || trimmed === resolveFieldLabel({}, slot, panelCode, draft.bodyStyle)) {
              return [];
            }
            return [{ slot, panelCode, label: trimmed }];
          }),
        };
        let id = idAtStart;
        let photosToSave = draft.photos;
        if (photosToSave.some(photoNeedsUpload)) {
          if (!id) {
            const created = await saveEstimateAction({
              ...payloadBase,
              photos: photosToSave.filter((photo) => photo.path && !photoNeedsUpload(photo)).map(toPhotoPayload),
            });
            if (!("id" in created)) {
              setSaveState("error");
              setError(created.error);
              return false;
            }
            id = created.id;
            estimateIdRef.current = id;
            setEstimateId(id);
          }
          try {
            const uploaded = [...photosToSave];
            for (let index = 0; index < uploaded.length; index += 1) {
              if (!photoNeedsUpload(uploaded[index])) continue;
              uploaded[index] = await uploadEstimatePhoto(id, uploaded[index]);
              photosRef.current = uploaded;
              if (draftRef.current) {
                draftRef.current = { ...draftRef.current, photos: uploaded, estimateId: id };
              }
            }
            photosToSave = uploaded;
          } catch (uploadError) {
            setSaveState("error");
            setError(uploadError instanceof Error ? uploadError.message : "Photo upload failed.");
            return false;
          }
        }
        const result = await saveEstimateAction({
          ...payloadBase,
          id,
          photos: photosToSave.map(toPhotoPayload),
        });
        if (!("id" in result)) {
          setSaveState("error");
          setError(result.error);
          return false;
        }
        estimateIdRef.current = result.id;
        setEstimateId(result.id);
        const merged = mergeSavedPhotos(photosRef.current, result.photos);
        photosRef.current = merged;
        if (draftRef.current) draftRef.current = { ...draftRef.current, photos: merged, estimateId: result.id };
        echoPhotos.current = true;
        setPhotos(merged);
        if (result.error) {
          setSaveState("error");
          setError(result.error);
          return false;
        }
        const elapsed = Date.now() - savingShownAt;
        if (elapsed < 900) {
          await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
        }
        setSaveState("saved");
        const latest = draftRef.current;
        if (latest && draftSignature(latest) !== signature && attempt < 3) {
          return saveDraft(true, attempt + 1);
        }
        if (!latest) return true;
        const inSync = draftSignature(latest) === signature;
        if (inSync) lastSavedSignature.current = draftSignature(latest);
        writeLocalDraft(result.id, {
          ...latest,
          synced: inSync,
          estimateId: result.id,
          photos: merged,
        });
        if (!idAtStart) clearLocalDraft(undefined);
        if (inSync && window.location.pathname !== `/estimates/${result.id}/edit`) {
          router.replace(`/estimates/${result.id}/edit`);
        }
        return true;
      }
    },
    [router],
  );

  useEffect(() => {
    const stored = readLocalDraft(initial?.id);
    const timer = window.setTimeout(() => {
      if (stored && !stored.synced) {
        setCustomerId(stored.customerId || "");
        setVehicleId(stored.vehicleId || "");
        setClaimId(stored.claimId || "");
        setOwnerName(stored.ownerName || "");
        setClaimNumber(stored.claimNumber || "");
        setNotes(stored.notes || "");
        if (stored.bodyStyle) setBodyStyle(stored.bodyStyle);
        if (stored.carrierId) setCarrierId(stored.carrierId);
        setVehicleFields(stored.vehicleFields);
        setPanels((current) => {
          const next = { ...current };
          for (const key of Object.keys(current) as HsKey[]) {
            if (stored.panels?.[key]) next[key] = { ...current[key], ...stored.panels[key] };
          }
          return next;
        });
        if (stored.photos?.length) {
          photosRef.current = stored.photos;
          setPhotos(stored.photos);
        }
        if (stored.fieldLabels) setFieldLabels(stored.fieldLabels);
        if (stored.estimateId) {
          estimateIdRef.current = stored.estimateId;
          setEstimateId(stored.estimateId);
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initial?.id]);

  useEffect(() => {
    writeLocalDraft(estimateId, {
      synced: false,
      estimateId,
      customerId,
      vehicleId,
      claimId,
      ownerName,
      claimNumber,
      notes,
      bodyStyle,
      carrierId,
      vehicleFields,
      panels,
      photos,
      fieldLabels,
    });
  }, [
    customerId,
    vehicleId,
    claimId,
    ownerName,
    claimNumber,
    notes,
    bodyStyle,
    carrierId,
    vehicleFields,
    panels,
    photos,
    fieldLabels,
    estimateId,
  ]);

  useEffect(() => {
    const draft = draftRef.current;
    const signature = draft ? draftSignature(draft) : "";
    if (lastSavedSignature.current === null) {
      lastSavedSignature.current = signature;
      return;
    }
    if (signature === lastSavedSignature.current) {
      echoPhotos.current = false;
      return;
    }
    echoPhotos.current = false;
    if (!ownerName.trim() && !customerId) return;
    const pendingPhoto = photos.some((photo) => photo.dataUrl && !photo.path);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      startTransition(() => {
        void flushSave(true);
      });
    }, pendingPhoto ? 200 : 800);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [
    panels,
    ownerName,
    claimNumber,
    carrierId,
    vehicleFields,
    bodyStyle,
    notes,
    photos,
    fieldLabels,
    customerId,
    vehicleId,
    claimId,
    flushSave,
  ]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        void flushSave(true);
      }
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flushSave]);

  async function addPhotos(slot: PhotoSlot, panelCode: string, files: FileList | null) {
    if (!files?.length) return;
    const added = await filesToDraftPhotos(files, slot, panelCode);
    if (!added.length) return;
    setPhotos((current) => {
      const next = [...current, ...added];
      photosRef.current = next;
      return next;
    });
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const next = current.filter((photo) => photo.key !== key);
      photosRef.current = next;
      return next;
    });
  }

  function captionPhoto(key: string, label: string) {
    setPhotos((current) => {
      const next = current.map((photo) => (photo.key === key ? { ...photo, label } : photo));
      photosRef.current = next;
      return next;
    });
  }

  async function goBack() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const hasWork =
      photos.length > 0 ||
      notes.trim().length > 0 ||
      claimNumber.trim().length > 0 ||
      vehicleFields.vin.trim().length > 0 ||
      vehicleFields.year.trim().length > 0 ||
      activeKeys.length > 0;
    if (!ownerName.trim() && !customerId) {
      if (hasWork) {
        setShowVehicle(true);
        setError("Enter an owner name so this estimate can save.");
        return;
      }
      router.push(backHref);
      return;
    }
    const saved = await flushSave(true);
    if (!saved) return;
    router.push(backHref);
  }

  function onVinChange(raw: string) {
    const vin = normalizeVin(raw).replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
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
    clearLocalDraft(estimateId);
    clearLocalDraft(undefined);
    router.push("/estimates/new");
    if (!estimateId) {
      lastSavedSignature.current = null;
      setEstimateId(undefined);
      estimateIdRef.current = undefined;
      setOwnerName("");
      setClaimNumber("");
      setCustomerId("");
      setVehicleId("");
      setClaimId("");
      setNotes("");
      setCarrierId("state_farm");
      setBodyStyle("CAR");
      setPhotos([]);
      photosRef.current = [];
      setFieldLabels({});
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
      photos: photos.map((photo) => ({
        url: photo.url,
        name: [resolveFieldLabel(fieldLabels, photo.slot, photo.panelCode, bodyStyle), photo.label]
          .filter(Boolean)
          .join(" — "),
      })),
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
      const label = resolveFieldLabel(fieldLabels, photo.slot, photo.panelCode, bodyStyle)
        .replace(/[^A-Za-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const name = `${String(index + 1).padStart(2, "0")}-${label || "photo"}-${photo.name || "photo.jpg"}`;
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
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            data-action="back"
            onClick={() => void goBack()}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[10px] border border-white/25 bg-white px-3 text-sm font-bold text-[#0a1628]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div className="hidden min-w-0 items-center gap-2.5 min-[480px]:flex">
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
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SavePill state={saveState} hasEstimate={Boolean(estimateId)} />
          <button
            type="button"
            onClick={() => void openSaved()}
            className="min-h-11 rounded-[10px] border border-white/20 bg-white/10 px-3 text-[12px] font-semibold text-white"
          >
            List
          </button>
          <button
            type="button"
            onClick={resetNew}
            className="min-h-11 rounded-[10px] border border-white/20 bg-white/10 px-3 text-[12px] font-semibold text-white"
          >
            + New
          </button>
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
                setVehicleFields((current) => ({ ...current, year }));
              }}
            />
            <SearchSelect
              label="Make"
              value={vehicleFields.make}
              options={VEHICLE_MAKES}
              placeholder="Make"
              onChange={(make) => {
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
          <label className="block space-y-1 lg:col-span-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Notes
            </span>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-base"
              rows={2}
              placeholder="Estimate notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
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
        <div className="hs-page-pad">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:grid md:grid-cols-2 md:items-start md:gap-6">
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
                        {photoCountForPanel(photos, key)
                          ? ` · ${photoCountForPanel(photos, key)} photo${photoCountForPanel(photos, key) === 1 ? "" : "s"}`
                          : ""}
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
        <div className="mx-auto w-full max-w-6xl px-4 pt-2">
          <PhotoSections
            bodyStyle={bodyStyle}
            photos={photos}
            fieldLabels={fieldLabels}
            onFieldLabel={(key, label) =>
              setFieldLabels((current) => ({ ...current, [key]: label }))
            }
            onAdd={(slot, panelCode, files) => void addPhotos(slot, panelCode, files)}
            onRemove={removePhoto}
            onCaption={captionPhoto}
          />
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
            </>
          )}
          {photos.length > 0 ? (
            <section className="mt-4 mb-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Photos ({photos.length})
                </div>
                <button
                  type="button"
                  onClick={() => void downloadZip()}
                  className="min-h-11 text-[12px] font-bold text-[#2563eb]"
                >
                  Download ZIP
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => {
                  const caption = [resolveFieldLabel(fieldLabels, photo.slot, photo.panelCode, bodyStyle), photo.label]
                    .filter(Boolean)
                    .join(" — ");
                  return (
                    <figure key={photo.key} className="min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={caption || photo.name}
                        className="h-24 w-full rounded-lg object-cover"
                      />
                      <figcaption className="mt-1 truncate text-[11px] text-slate-500">{caption}</figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          ) : null}
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
            <SavePill state={saveState} hasEstimate={Boolean(estimateId)} tone="light" />
          </div>
          <button
            type="button"
            data-action="save-estimate"
            disabled={saveState === "saving"}
            onClick={() => {
              if (saveTimer.current) window.clearTimeout(saveTimer.current);
              void flushSave(false);
            }}
            className="min-h-11 min-w-36 rounded-xl bg-[#2563eb] px-5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
          >
            {saveState === "saving" ? "Saving..." : estimateId ? "Save draft" : "Save estimate"}
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
          photoSection={
            <PanelPhotoField
              panelCode={selectedPanel}
              bodyStyle={bodyStyle}
              photos={photos}
              fieldLabels={fieldLabels}
              onFieldLabel={(key, label) =>
                setFieldLabels((current) => ({ ...current, [key]: label }))
              }
              onAdd={(files) => void addPhotos("PANEL", selectedPanel, files)}
              onRemove={removePhoto}
              onCaption={captionPhoto}
            />
          }
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

function SavePill({
  state,
  hasEstimate,
  tone = "dark",
}: {
  state: "idle" | "saving" | "saved" | "error";
  hasEstimate: boolean;
  tone?: "dark" | "light";
}) {
  const label =
    state === "saving" ? "Saving..." : state === "error" ? "Not saved" : hasEstimate || state === "saved" ? "Saved" : "Draft";
  const dark =
    state === "saving"
      ? "bg-blue-500/25 text-blue-50"
      : state === "error"
        ? "bg-red-500/25 text-red-100"
        : state === "saved" || hasEstimate
          ? "bg-emerald-500/25 text-emerald-100"
          : "bg-white/10 text-white/80";
  const light =
    state === "saving"
      ? "text-blue-700"
      : state === "error"
        ? "text-red-600"
        : "text-emerald-700";
  return (
    <span
      data-save-state={state === "idle" && hasEstimate ? "saved" : state}
      className={
        tone === "light"
          ? `text-[11px] font-bold ${light}`
          : `inline-flex min-h-11 items-center rounded-full px-3 text-xs font-bold ${dark}`
      }
    >
      {label}
    </span>
  );
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
