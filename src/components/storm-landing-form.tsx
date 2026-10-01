"use client";

import { useSearchParams } from "next/navigation";
import { submitStormLeadAction } from "@/app/actions/leads";
import { VinDecodeFields } from "@/components/vin-decode-field";
import { SMS_CONSENT_TEXT } from "@/lib/storms/consent";
import { useEffect, useState } from "react";

export function StormLandingForm({
  stormId,
  slug,
  error,
  pageUrl,
}: {
  stormId: string;
  slug: string;
  error?: string;
  pageUrl: string;
}) {
  const params = useSearchParams();
  const [resolvedPageUrl, setResolvedPageUrl] = useState(pageUrl);
  const [vehicle, setVehicle] = useState({
    vin: "",
    year: "",
    make: "",
    model: "",
    bodyClass: "",
  });

  useEffect(() => {
    setResolvedPageUrl(window.location.href);
  }, []);

  return (
    <form action={submitStormLeadAction} className="space-y-4">
      <input type="hidden" name="stormId" value={stormId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="pageUrl" value={resolvedPageUrl} />
      <input type="hidden" name="utm_source" value={params.get("utm_source") ?? ""} />
      <input type="hidden" name="utm_medium" value={params.get("utm_medium") ?? ""} />
      <input type="hidden" name="utm_campaign" value={params.get("utm_campaign") ?? ""} />
      <input type="hidden" name="utm_term" value={params.get("utm_term") ?? ""} />
      <input type="hidden" name="utm_content" value={params.get("utm_content") ?? ""} />
      <input type="hidden" name="fbclid" value={params.get("fbclid") ?? ""} />
      <input type="hidden" name="gclid" value={params.get("gclid") ?? ""} />
      <input type="hidden" name="vehicleYear" value={vehicle.year} />
      <input type="hidden" name="vehicleMake" value={vehicle.make} />
      <input type="hidden" name="vehicleModel" value={vehicle.model} />
      <input type="hidden" name="vin" value={vehicle.vin} />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Was your vehicle damaged by hail?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <Choice name="vehicleDamaged" value="yes" label="Yes" />
          <Choice name="vehicleDamaged" value="no" label="No / not sure" />
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Comprehensive insurance?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <Choice name="insurance" value="YES" label="Yes" />
          <Choice name="insurance" value="NO" label="No" />
          <Choice name="insurance" value="NOT_SURE" label="Not sure" />
        </div>
      </fieldset>

      <div>
        <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Vehicle (optional VIN decode)
        </p>
        <VinDecodeFields compact value={vehicle} onChange={setVehicle} showBodyClass={false} />
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">ZIP</span>
        <input
          name="zip"
          required
          inputMode="numeric"
          maxLength={5}
          className="h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-3 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Full name</span>
        <input
          name="name"
          required
          className="h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-3 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Mobile phone</span>
        <input
          name="phone"
          required
          type="tel"
          className="h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-3 text-sm"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Email</span>
        <input
          name="email"
          type="email"
          className="h-11 w-full rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-3 text-sm"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Preferred contact
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <Choice name="preferredContact" value="PHONE" label="Call" />
          <Choice name="preferredContact" value="TEXT" label="Text" />
          <Choice name="preferredContact" value="EMAIL" label="Email" />
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          Photo of damage (optional)
        </span>
        <input
          name="photo"
          type="file"
          accept="image/*"
          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#2563eb]"
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
        <input type="checkbox" name="smsConsent" className="mt-1 size-4" />
        <span>
          {SMS_CONSENT_TEXT}{" "}
          <a href="/privacy" className="font-semibold text-[#2563eb] underline">
            Privacy policy
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        className="w-full rounded-xl bg-[#2563eb] py-3.5 text-sm font-bold text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]"
      >
        Request a free inspection
      </button>
    </form>
  );
}

function Choice({ name, value, label }: { name: string; value: string; label: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-slate-200 bg-[#f8fafc] px-2 text-sm font-semibold has-[:checked]:border-[#2563eb] has-[:checked]:bg-blue-50 has-[:checked]:text-[#2563eb]">
      <input type="radio" name={name} value={value} required className="sr-only" />
      {label}
    </label>
  );
}
