import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StormLandingForm } from "@/components/storm-landing-form";
import { prisma } from "@/lib/db";
import { BRAND_NAME, BRAND_PHONE, LEGAL_NAME } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export default async function StormLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; thanks?: string; utm_source?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const storm = await prisma.storm.findUnique({
    where: { slug },
    include: { zips: { orderBy: { maxHailInches: "desc" } } },
  });
  if (!storm || (storm.status !== "APPROVED" && storm.status !== "ACTIVE")) {
    notFound();
  }

  const cities = [...new Set(storm.zips.slice(0, 6).map((zip) => zip.city))];
  const area = cities.slice(0, 3).join(", ") || storm.states.replaceAll(",", "/");
  const headline =
    storm.headline || `Hail hit ${area} on ${formatDate(storm.occurredOn)}?`;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="mx-auto min-h-screen max-w-[480px] bg-[#f8fafc]">
        <header className="sticky top-0 z-20 bg-[#0a1628] px-4 py-3.5 shadow-[0_2px_12px_rgba(10,22,40,0.18)]">
          <div className="text-[17px] font-black tracking-[1.5px] text-white">HAILSPEC</div>
          <div className="text-[9px] font-bold tracking-widest text-blue-300 uppercase">
            by {BRAND_NAME}
          </div>
        </header>
        <div
          className="h-[3px]"
          style={{ background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #dc2626 100%)" }}
        />

        <main className="px-4 py-5 pb-16">
          {query.thanks ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h1 className="text-xl font-extrabold text-emerald-900">We have your request</h1>
              <p className="mt-2 text-sm text-emerald-800">
                An NTX Hail estimator will reach out using the contact method you chose. We do not
                text you unless you checked the SMS box.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                {formatDate(storm.occurredOn)} · {storm.peakHailInches.toFixed(2)}" hail · {storm.states}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">{headline}</h1>
              <p className="mt-3 rounded-xl border border-blue-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
                {storm.offerText}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                {BRAND_NAME} · mobile and in-shop PDR · {BRAND_PHONE}
              </p>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Suspense fallback={<p className="text-sm text-slate-400">Loading form…</p>}>
                  <StormLandingForm
                    stormId={storm.id}
                    slug={storm.slug}
                    error={query.error}
                    pageUrl={`/storm/${storm.slug}`}
                  />
                </Suspense>
              </div>
            </>
          )}
        </main>
        <footer className="px-4 pb-8 text-[11px] text-slate-400">
          <p>{LEGAL_NAME}</p>
          <Link href="/privacy" className="font-semibold text-[#2563eb]">
            Privacy policy
          </Link>
        </footer>
      </div>
    </div>
  );
}
