import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StormStatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function StormsPage() {
  await requireUser();
  const storms = await prisma.storm.findMany({
    orderBy: { occurredOn: "desc" },
    include: { _count: { select: { zips: true, leads: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Storms"
        description="Detected hail events wait for admin approval. Nothing customer-facing goes live until you approve."
      />
      {storms.length === 0 ? (
        <EmptyState
          title="No storms yet"
          description="Run npm run storms:ingest to pull SPC / NWS hail reports for TX, OK, AR, and MO."
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <ul className="divide-y">
            {storms.map((storm) => (
              <li key={storm.id}>
                <Link
                  href={`/storms/${storm.id}`}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{storm.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(storm.occurredOn)} · {storm.states} · {storm.peakHailInches.toFixed(2)}" ·{" "}
                      {storm._count.zips} ZIPs
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{storm._count.leads} leads</span>
                    <StormStatusBadge status={storm.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
