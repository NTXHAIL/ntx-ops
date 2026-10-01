"use server";

import { decodeVinWithNhtsa, type VinDecodeResponse } from "@/lib/vin";

export async function decodeVinAction(vin: string): Promise<VinDecodeResponse> {
  return decodeVinWithNhtsa(vin);
}
