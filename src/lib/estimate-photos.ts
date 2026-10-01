import type { BodyStyle } from "@/lib/body-styles";
import { HS_KEYS, HS_LABELS, trunkLabel, type HsKey } from "@/lib/hailspec";

export const PHOTO_SLOTS = [
  "PANEL",
  "MISC",
  "VIN",
  "MILEAGE",
  "WINDSHIELD",
  "INTERIOR",
  "DASH",
  "HEADLINER",
  "WHEEL_LF",
  "WHEEL_RF",
  "WHEEL_LR",
  "WHEEL_RR",
] as const;

export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

export const DOC_PHOTO_FIELDS: { slot: PhotoSlot; label: string }[] = [
  { slot: "VIN", label: "VIN" },
  { slot: "MILEAGE", label: "Mileage / odometer" },
  { slot: "WINDSHIELD", label: "Windshield" },
  { slot: "INTERIOR", label: "Interior" },
  { slot: "DASH", label: "Dash" },
  { slot: "HEADLINER", label: "Headliner" },
  { slot: "WHEEL_LF", label: "Left front wheel" },
  { slot: "WHEEL_RF", label: "Right front wheel" },
  { slot: "WHEEL_LR", label: "Left rear wheel" },
  { slot: "WHEEL_RR", label: "Right rear wheel" },
];

const SLOT_SET = new Set<string>(PHOTO_SLOTS);

export type DraftPhoto = {
  key: string;
  url: string;
  name: string;
  path?: string;
  dataUrl?: string;
  label: string;
  slot: PhotoSlot;
  panelCode: string;
};

export type PhotoFieldLabel = {
  slot: string;
  panelCode: string;
  label: string;
};

export function normalizePhotoSlot(slot: string | null | undefined): PhotoSlot {
  if (slot && SLOT_SET.has(slot)) return slot as PhotoSlot;
  return "MISC";
}

export function photoFieldKey(slot: string, panelCode = "") {
  return `${normalizePhotoSlot(slot)}:${slot === "PANEL" ? panelCode : ""}`;
}

export function defaultFieldLabel(slot: string, panelCode: string, bodyStyle: BodyStyle) {
  if (slot === "PANEL") {
    if (panelCode === "TRUNK") return trunkLabel(bodyStyle);
    if (panelCode in HS_LABELS) return HS_LABELS[panelCode as HsKey];
    return panelCode || "Panel";
  }
  return DOC_PHOTO_FIELDS.find((field) => field.slot === slot)?.label ?? "Misc photos";
}

export function panelPhotoFields(bodyStyle: BodyStyle) {
  return HS_KEYS.map((key) => ({
    slot: "PANEL" as const,
    panelCode: key,
    label: defaultFieldLabel("PANEL", key, bodyStyle),
  }));
}

export function fieldLabelMap(fields: PhotoFieldLabel[]) {
  const map: Record<string, string> = {};
  for (const field of fields) {
    const label = field.label.trim();
    if (!label) continue;
    map[photoFieldKey(field.slot, field.panelCode)] = label;
  }
  return map;
}

export function resolveFieldLabel(
  labels: Record<string, string>,
  slot: string,
  panelCode: string,
  bodyStyle: BodyStyle,
) {
  const custom = labels[photoFieldKey(slot, panelCode)];
  if (custom && custom.trim()) return custom.trim();
  return defaultFieldLabel(slot, panelCode, bodyStyle);
}

export type PhotoGroup<T> = {
  key: string;
  slot: PhotoSlot;
  panelCode: string;
  label: string;
  photos: T[];
};

export function groupDraftPhotos<T extends { slot: string; panelCode: string }>(
  photos: T[],
  labels: Record<string, string>,
  bodyStyle: BodyStyle,
): PhotoGroup<T>[] {
  const groups: PhotoGroup<T>[] = [];
  const push = (slot: PhotoSlot, panelCode: string) => {
    const key = photoFieldKey(slot, panelCode);
    groups.push({
      key,
      slot,
      panelCode,
      label: resolveFieldLabel(labels, slot, panelCode, bodyStyle),
      photos: photos.filter(
        (photo) =>
          normalizePhotoSlot(photo.slot) === slot &&
          (slot === "PANEL" ? photo.panelCode === panelCode : true),
      ),
    });
  };
  for (const field of DOC_PHOTO_FIELDS) push(field.slot, "");
  for (const key of HS_KEYS) push("PANEL", key);
  push("MISC", "");
  return groups;
}

export function mergeSavedPhotos<T extends DraftPhoto>(
  current: T[],
  saved: { clientKey: string; path: string; name: string }[],
): T[] {
  const byKey = new Map(saved.map((photo) => [photo.clientKey, photo]));
  return current.map((photo) => {
    const match = byKey.get(photo.key);
    if (!match) return photo;
    return {
      ...photo,
      path: match.path,
      url: match.path,
      dataUrl: undefined,
      name: photo.name || match.name,
    };
  });
}
