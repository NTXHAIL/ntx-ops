export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);
}

export function dollarsToCents(value: string | number) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100);
  }
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function centsToDollarsInput(cents: number) {
  return ((cents || 0) / 100).toFixed(2);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatVehicle(vehicle: {
  year?: string | null;
  make?: string | null;
  model?: string | null;
  vin?: string | null;
} | null | undefined) {
  if (!vehicle) return "No vehicle";
  const name = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");
  if (!name && !vehicle.vin) return "Vehicle on file";
  if (vehicle.vin && vehicle.vin.length >= 6) {
    const tail = vehicle.vin.slice(-6);
    return name ? `${name} · …${tail}` : `VIN …${tail}`;
  }
  return name || "Vehicle on file";
}

export function formatPhone(value?: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}
