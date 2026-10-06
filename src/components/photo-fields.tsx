"use client";

import type { ReactNode } from "react";
import type { BodyStyle } from "@/lib/body-styles";
import {
  DOC_PHOTO_FIELDS,
  groupDraftPhotos,
  photoFieldKey,
  resolveFieldLabel,
  type DraftPhoto,
  type PhotoSlot,
} from "@/lib/estimate-photos";

const MAX_EDGE = 1600;

export async function filesToDraftPhotos(
  files: FileList | File[],
  slot: PhotoSlot,
  panelCode: string,
) {
  const photos: DraftPhoto[] = [];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image/")) continue;
    const dataUrl = await resizeImageFile(file);
    photos.push({
      key: crypto.randomUUID(),
      url: dataUrl,
      dataUrl,
      name: file.name || "photo.jpg",
      label: "",
      slot,
      panelCode: slot === "PANEL" ? panelCode : "",
    });
  }
  return photos;
}

function resizeImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const original = String(reader.result || "");
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(original);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.onerror = () => resolve(original);
      image.src = original;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoSections({
  bodyStyle,
  photos,
  fieldLabels,
  onFieldLabel,
  onAdd,
  onRemove,
  onCaption,
}: {
  bodyStyle: BodyStyle;
  photos: DraftPhoto[];
  fieldLabels: Record<string, string>;
  onFieldLabel: (key: string, label: string) => void;
  onAdd: (slot: PhotoSlot, panelCode: string, files: FileList | null) => void;
  onRemove: (key: string) => void;
  onCaption: (key: string, label: string) => void;
}) {
  const groups = groupDraftPhotos(photos, fieldLabels, bodyStyle);
  const vehicle = groups.filter((group) => DOC_PHOTO_FIELDS.some((field) => field.slot === group.slot));
  const panels = groups.filter((group) => group.slot === "PANEL");
  const misc = groups.find((group) => group.slot === "MISC");

  return (
    <div data-photo-fields className="space-y-4">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">Photos</h2>
        <p className="text-xs text-slate-500">
          Take a photo or add several. They save with this estimate.
        </p>
      </div>
      <PhotoGroup title="Vehicle photos" hint="VIN, mileage, glass, interior, and wheels">
        <div className="grid gap-3 md:grid-cols-2">
          {vehicle.map((group) => (
            <PhotoField
              key={group.key}
              fieldKey={group.key}
              defaultLabel={group.label}
              labelValue={fieldLabels[group.key] ?? group.label}
              photos={group.photos}
              onFieldLabel={onFieldLabel}
              onAdd={(files) => onAdd(group.slot, group.panelCode, files)}
              onRemove={onRemove}
              onCaption={onCaption}
            />
          ))}
        </div>
      </PhotoGroup>
      <PhotoGroup title="Panel photos" hint="Each panel keeps its own photos">
        <div className="grid gap-3 md:grid-cols-2">
          {panels.map((group) => (
            <PhotoField
              key={group.key}
              fieldKey={group.key}
              defaultLabel={group.label}
              labelValue={fieldLabels[group.key] ?? group.label}
              photos={group.photos}
              onFieldLabel={onFieldLabel}
              onAdd={(files) => onAdd(group.slot, group.panelCode, files)}
              onRemove={onRemove}
              onCaption={onCaption}
            />
          ))}
        </div>
      </PhotoGroup>
      {misc ? (
        <PhotoGroup title="Misc photos" hint="Anything that does not fit a panel">
          <PhotoField
            fieldKey={misc.key}
            defaultLabel="Misc photos"
            labelValue={fieldLabels[misc.key] ?? "Misc photos"}
            photos={misc.photos}
            onFieldLabel={onFieldLabel}
            onAdd={(files) => onAdd("MISC", "", files)}
            onRemove={onRemove}
            onCaption={onCaption}
          />
        </PhotoGroup>
      ) : null}
    </div>
  );
}

export function PanelPhotoField({
  panelCode,
  bodyStyle,
  photos,
  fieldLabels,
  onFieldLabel,
  onAdd,
  onRemove,
  onCaption,
}: {
  panelCode: string;
  bodyStyle: BodyStyle;
  photos: DraftPhoto[];
  fieldLabels: Record<string, string>;
  onFieldLabel: (key: string, label: string) => void;
  onAdd: (files: FileList | null) => void;
  onRemove: (key: string) => void;
  onCaption: (key: string, label: string) => void;
}) {
  const fieldKey = photoFieldKey("PANEL", panelCode);
  const label = resolveFieldLabel(fieldLabels, "PANEL", panelCode, bodyStyle);
  const mine = photos.filter(
    (photo) => photo.slot === "PANEL" && photo.panelCode === panelCode,
  );
  return (
    <div className="mt-5">
      <div className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        Photos for this panel
      </div>
      <PhotoField
        fieldKey={fieldKey}
        defaultLabel={label}
        labelValue={fieldLabels[fieldKey] ?? label}
        photos={mine}
        onFieldLabel={onFieldLabel}
        onAdd={onAdd}
        onRemove={onRemove}
        onCaption={onCaption}
      />
    </div>
  );
}

function PhotoGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mb-3 text-[11px] text-slate-500">{hint}</p>
      {children}
    </section>
  );
}

function PhotoField({
  fieldKey,
  defaultLabel,
  labelValue,
  photos,
  onFieldLabel,
  onAdd,
  onRemove,
  onCaption,
}: {
  fieldKey: string;
  defaultLabel: string;
  labelValue: string;
  photos: DraftPhoto[];
  onFieldLabel: (key: string, label: string) => void;
  onAdd: (files: FileList | null) => void;
  onRemove: (key: string) => void;
  onCaption: (key: string, label: string) => void;
}) {
  const inputId = `photo-name-${fieldKey}`;
  return (
    <div data-photo-field={fieldKey} className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
      <label htmlFor={inputId} className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        Name
      </label>
      <input
        id={inputId}
        value={labelValue}
        aria-label={`${defaultLabel} name`}
        onChange={(event) => onFieldLabel(fieldKey, event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-white px-3 text-base font-semibold"
      />
      <div className="mt-2 flex gap-2">
        <FileButton label="Take photo" capture onPick={onAdd} />
        <FileButton label="Add photos" multiple onPick={onAdd} />
      </div>
      {photos.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.key} className="min-w-0">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.label || photo.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="hs-icon-xs absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-black text-lg font-bold text-white shadow"
                  aria-label={`Remove photo ${index + 1} from ${labelValue || defaultLabel}`}
                  onClick={() => onRemove(photo.key)}
                >
                  ✕
                </button>
              </div>
              <input
                value={photo.label}
                aria-label={`Label for photo ${index + 1} on ${labelValue || defaultLabel}`}
                placeholder="Label"
                onChange={(event) => onCaption(photo.key, event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-2 text-base"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-slate-400">No photos yet</p>
      )}
    </div>
  );
}

function FileButton({
  label,
  capture,
  multiple,
  onPick,
}: {
  label: string;
  capture?: boolean;
  multiple?: boolean;
  onPick: (files: FileList | null) => void;
}) {
  return (
    <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-dashed border-slate-300 bg-white px-2 text-center text-[13px] font-semibold text-slate-600">
      {label}
      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          onPick(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}

export function photoCountForPanel(photos: DraftPhoto[], panelCode: string) {
  return photos.filter((photo) => photo.slot === "PANEL" && photo.panelCode === panelCode).length;
}
