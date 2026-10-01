export type VinDecodeResult = {
  vin: string;
  year: string;
  make: string;
  model: string;
  bodyClass: string;
};

export type VinDecodeResponse =
  | { ok: true; data: VinDecodeResult }
  | { ok: false; error: string };

const NHTSA_URL =
  process.env.NHTSA_VPIC_URL ||
  "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

export function normalizeVin(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

const VIN_WMI_MAKES: Record<string, string> = {
  "1G1": "Chevrolet",
  "1GC": "Chevrolet",
  "1GT": "GMC",
  "1G6": "Cadillac",
  "1FA": "Ford",
  "1FB": "Ford",
  "1FC": "Ford",
  "1FD": "Ford",
  "1FM": "Ford",
  "1FT": "Ford",
  "1GK": "GMC",
  "1HG": "Honda",
  "1C3": "Chrysler",
  "1C4": "Chrysler",
  "1C6": "Ram",
  "1D3": "Dodge",
  "1D4": "Dodge",
  "1D7": "Dodge",
  "1J4": "Jeep",
  "1J8": "Jeep",
  "1LN": "Lincoln",
  "1N4": "Nissan",
  "1N6": "Nissan",
  "1VW": "Volkswagen",
  "1YV": "Mazda",
  "2HG": "Honda",
  "2HK": "Honda",
  "2T1": "Toyota",
  "2T2": "Lexus",
  "3VW": "Volkswagen",
  "4S3": "Subaru",
  "4S4": "Subaru",
  "4T1": "Toyota",
  "4T3": "Toyota",
  "4T4": "Toyota",
  "5FN": "Honda",
  "5J6": "Honda",
  "5N1": "Nissan",
  "5NP": "Hyundai",
  "5NM": "Hyundai",
  "5TD": "Toyota",
  "5TF": "Toyota",
  "5YJ": "Tesla",
  JA3: "Mitsubishi",
  JA4: "Mitsubishi",
  JF1: "Subaru",
  JF2: "Subaru",
  JH4: "Acura",
  JHM: "Honda",
  JM1: "Mazda",
  JM3: "Mazda",
  JN1: "Nissan",
  JN8: "Nissan",
  JT2: "Toyota",
  JT3: "Toyota",
  JTD: "Toyota",
  JTE: "Toyota",
  JTH: "Lexus",
  JTK: "Toyota",
  JTM: "Toyota",
  KM8: "Hyundai",
  KMH: "Hyundai",
  KNA: "Kia",
  KND: "Kia",
  WAU: "Audi",
  WA1: "Audi",
  WBA: "BMW",
  WBS: "BMW",
  WDB: "Mercedes-Benz",
  WDC: "Mercedes-Benz",
  WDD: "Mercedes-Benz",
  WMW: "Mini",
  WP0: "Porsche",
  WP1: "Porsche",
  WVW: "Volkswagen",
  YV1: "Volvo",
  YV4: "Volvo",
  ZAM: "Maserati",
  ZAR: "Alfa Romeo",
  "19U": "Acura",
  "19X": "Honda",
};

const VIN_YEAR_CODES: Record<string, string> = {
  A: "2010",
  B: "2011",
  C: "2012",
  D: "2013",
  E: "2014",
  F: "2015",
  G: "2016",
  H: "2017",
  J: "2018",
  K: "2019",
  L: "2020",
  M: "2021",
  N: "2022",
  P: "2023",
  R: "2024",
  S: "2025",
  T: "2026",
};

/** HailSpec-style local WMI fallback. Used only after NHTSA fails. */
export function decodeVinLocalWmi(rawVin: string): Pick<VinDecodeResult, "year" | "make"> | null {
  const vin = normalizeVin(rawVin);
  if (vin.length !== 17) return null;
  const year = VIN_YEAR_CODES[vin[9]] || "";
  const wmi3 = vin.slice(0, 3);
  let make = VIN_WMI_MAKES[wmi3] || "";
  if (!make) {
    for (const [prefix, name] of Object.entries(VIN_WMI_MAKES)) {
      if (wmi3.startsWith(prefix)) {
        make = name;
        break;
      }
    }
  }
  if (!year && !make) return null;
  return { year, make };
}

function fromWmi(vin: string): VinDecodeResponse | null {
  const local = decodeVinLocalWmi(vin);
  if (!local) return null;
  return {
    ok: true,
    data: {
      vin,
      year: local.year,
      make: local.make,
      model: "",
      bodyClass: "",
    },
  };
}

export async function decodeVinWithNhtsa(rawVin: string): Promise<VinDecodeResponse> {
  const vin = normalizeVin(rawVin);
  if (vin.length !== 17) {
    return { ok: false, error: "VIN should be 17 characters." };
  }

  try {
    const response = await fetch(`${NHTSA_URL}/${encodeURIComponent(vin)}?format=json`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return (
        fromWmi(vin) ?? {
          ok: false,
          error: "VIN decoder is unavailable right now. Enter year / make / model by hand.",
        }
      );
    }
    const json = (await response.json()) as {
      Results?: Array<Record<string, string>>;
    };
    const row = json.Results?.[0];
    if (!row) {
      return fromWmi(vin) ?? { ok: false, error: "No decode result for that VIN." };
    }

    const errorCode = String(row.ErrorCode || "0");
    const hardFail = errorCode.split(",").map((part) => part.trim()).includes("400");
    const year = (row.ModelYear || "").trim();
    const make = (row.Make || "").trim();
    const model = (row.Model || "").trim();
    if (hardFail || (!year && !make && !model)) {
      return (
        fromWmi(vin) ?? {
          ok: false,
          error: row.ErrorText || "That VIN did not decode. You can still save it as text.",
        }
      );
    }

    return {
      ok: true,
      data: {
        vin,
        year,
        make,
        model,
        bodyClass: (row.BodyClass || "").trim(),
      },
    };
  } catch {
    return (
      fromWmi(vin) ?? {
        ok: false,
        error: "Could not reach the NHTSA decoder. Enter the vehicle by hand.",
      }
    );
  }
}
