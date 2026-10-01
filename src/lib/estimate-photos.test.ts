import { describe, expect, it } from "vitest";
import {
  defaultFieldLabel,
  groupDraftPhotos,
  mergeSavedPhotos,
  normalizePhotoSlot,
  photoFieldKey,
  type DraftPhoto,
} from "@/lib/estimate-photos";

describe("estimate photo fields", () => {
  it("keeps unknown slots on misc so older photos still show", () => {
    expect(normalizePhotoSlot(undefined)).toBe("MISC");
    expect(normalizePhotoSlot("NOT_A_SLOT")).toBe("MISC");
    expect(normalizePhotoSlot("VIN")).toBe("VIN");
  });

  it("names trunk from the body style and keeps a custom label", () => {
    expect(defaultFieldLabel("PANEL", "TRUNK", "TRUCK")).toBe("Bed / Tailgate");
    expect(defaultFieldLabel("PANEL", "HOOD", "CAR")).toBe("Hood");
    expect(defaultFieldLabel("MILEAGE", "", "CAR")).toBe("Mileage / odometer");
    expect(photoFieldKey("PANEL", "HOOD")).toBe("PANEL:HOOD");
    expect(photoFieldKey("VIN", "ignored")).toBe("VIN:");
  });

  it("groups panel photos separately from misc and documentation", () => {
    const photos = [
      { slot: "MISC", panelCode: "", name: "old" },
      { slot: "PANEL", panelCode: "HOOD", name: "hood-1" },
      { slot: "PANEL", panelCode: "HOOD", name: "hood-2" },
      { slot: "VIN", panelCode: "", name: "vin" },
    ];
    const groups = groupDraftPhotos(photos, { "PANEL:HOOD": "Hood hail" }, "CAR");
    const hood = groups.find((group) => group.key === "PANEL:HOOD");
    const misc = groups.find((group) => group.key === "MISC:");
    const vin = groups.find((group) => group.key === "VIN:");
    expect(hood?.label).toBe("Hood hail");
    expect(hood?.photos).toHaveLength(2);
    expect(misc?.photos.map((photo) => photo.name)).toEqual(["old"]);
    expect(vin?.photos).toHaveLength(1);
    expect(groups.find((group) => group.key === "PANEL:ROOF")?.photos).toHaveLength(0);
  });

  it("replaces saved data urls without dropping a photo added during the save", () => {
    const current: DraftPhoto[] = [
      {
        key: "a",
        url: "data:image/jpeg;base64,aaa",
        dataUrl: "data:image/jpeg;base64,aaa",
        name: "a.jpg",
        label: "close",
        slot: "PANEL",
        panelCode: "HOOD",
      },
      {
        key: "b",
        url: "data:image/jpeg;base64,bbb",
        dataUrl: "data:image/jpeg;base64,bbb",
        name: "b.jpg",
        label: "",
        slot: "VIN",
        panelCode: "",
      },
    ];
    const merged = mergeSavedPhotos(current, [
      { clientKey: "a", path: "/estimate-photos/est/a.jpg", name: "a.jpg" },
    ]);
    expect(merged[0].path).toBe("/estimate-photos/est/a.jpg");
    expect(merged[0].dataUrl).toBeUndefined();
    expect(merged[0].label).toBe("close");
    expect(merged[1].dataUrl).toContain("bbb");
  });
});
