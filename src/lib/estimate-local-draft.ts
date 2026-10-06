import type { BodyStyle } from "@/lib/body-styles";
import type { DraftPhoto } from "@/lib/estimate-photos";
import type { HsPanelState } from "@/lib/hailspec-draft";

export type LocalEstimateDraft = {
  synced: boolean;
  estimateId?: string;
  customerId: string;
  vehicleId: string;
  claimId: string;
  ownerName: string;
  claimNumber: string;
  notes: string;
  bodyStyle: BodyStyle;
  carrierId: string;
  vehicleFields: {
    vin: string;
    year: string;
    make: string;
    model: string;
    bodyClass: string;
  };
  panels: Record<string, HsPanelState>;
  photos: DraftPhoto[];
  fieldLabels: Record<string, string>;
};

const PREFIX = "ntx-estimate-draft:";

export function draftStorageKey(estimateId?: string) {
  return `${PREFIX}${estimateId || "new"}`;
}

export function readLocalDraft(estimateId?: string): LocalEstimateDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(draftStorageKey(estimateId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalEstimateDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.panels || !parsed.vehicleFields) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalDraft(estimateId: string | undefined, draft: LocalEstimateDraft) {
  if (typeof window === "undefined") return;
  const key = draftStorageKey(estimateId);
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    try {
      const slim: LocalEstimateDraft = {
        ...draft,
        photos: draft.photos.map((photo) =>
          photo.path ? { ...photo, dataUrl: undefined } : photo,
        ),
      };
      window.sessionStorage.setItem(key, JSON.stringify(slim));
    } catch {
      // The browser refused the backup. The debounced server save still runs.
    }
  }
}

export function clearLocalDraft(estimateId?: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(draftStorageKey(estimateId));
  } catch {
    // Ignore storage failures.
  }
}
