import type { HailSwath } from "@/lib/storms/types";

/**
 * NOAA MRMS MESH_Max_1440min hook.
 *
 * v1 uses a radius around LSR points (see zipsFromReportRadius). When we add
 * GRIB2 ingest, fetch MESH cells here, threshold at ≥1.0", and return them as
 * a HailSwath so ingest.ts can call zipsFromSwath instead of the radius helper.
 *
 * Public data:
 *   s3://noaa-mrms-pds/CONUS/MESH_Max_1440min_00.50/YYYYMMDD/...
 *   https://mrms.ncep.noaa.gov/2D/MESH_Max_1440min/
 */
export async function fetchMrmsMeshSwath(_occurredOn: string): Promise<HailSwath | null> {
  return null;
}
