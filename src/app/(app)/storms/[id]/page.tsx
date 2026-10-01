import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addStormZipsAction,
  removeStormZipAction,
  setStormStatusAction,
  updateStormOfferAction,
} from "@/app/actions/storms";
import { PageHeader } from "@/components/page-header";
import { StormStatusBadge } from "@/components/status-badge";
import { StormZipMap } from "@/components/storm-zip-map";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function StormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const storm = await prisma.storm.findUnique({
    where: { id },
    include: {
      zips: { orderBy: [{ maxHailInches: "desc" }, { city: "asc" }] },
      _count: { select: { leads: true } },
    },
  });
  if (!storm) notFound();
  const admin = user.role === "ADMIN";
  const live = storm.status === "APPROVED" || storm.status === "ACTIVE";

  return (
    <div>
      <PageHeader
        title={storm.name}
        description={`${formatDate(storm.occurredOn)} · ${storm.states} · peak ${storm.peakHailInches.toFixed(2)}" · ${storm.source}`}
      >
        <StormStatusBadge status={storm.status} />
        {live ? (
          <Link
            href={`/storm/${storm.slug}`}
            className="rounded-lg bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white"
          >
            Open landing page
          </Link>
        ) : null}
      </PageHeader>

      {admin ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {storm.status === "DETECTED" || storm.status === "CLOSED" ? (
            <form action={setStormStatusAction}>
              <input type="hidden" name="id" value={storm.id} />
              <input type="hidden" name="status" value="APPROVED" />
              <Button type="submit">Approve storm</Button>
            </form>
          ) : null}
          {storm.status === "APPROVED" ? (
            <form action={setStormStatusAction}>
              <input type="hidden" name="id" value={storm.id} />
              <input type="hidden" name="status" value="ACTIVE" />
              <Button type="submit" variant="outline">
                Mark active
              </Button>
            </form>
          ) : null}
          {storm.status !== "CLOSED" ? (
            <form action={setStormStatusAction}>
              <input type="hidden" name="id" value={storm.id} />
              <input type="hidden" name="status" value="CLOSED" />
              <Button type="submit" variant="outline">
                Close
              </Button>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">Only an admin can approve or edit ZIPs.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 space-y-4">
          <StormZipMap zips={storm.zips} />
          <div className="table-scroll overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">ZIP</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">County</th>
                  <th className="px-3 py-2">Hail</th>
                  {admin ? <th className="px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {storm.zips.map((zip) => (
                  <tr key={zip.id}>
                    <td className="px-3 py-2 font-mono">{zip.zip}</td>
                    <td className="px-3 py-2">{zip.city}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {zip.county}, {zip.state}
                    </td>
                    <td className="px-3 py-2">{zip.maxHailInches.toFixed(2)}"</td>
                    {admin ? (
                      <td className="px-3 py-2 text-right">
                        <form action={removeStormZipAction}>
                          <input type="hidden" name="stormId" value={storm.id} />
                          <input type="hidden" name="zipId" value={zip.id} />
                          <button type="submit" className="text-xs text-red-600">
                            Remove
                          </button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {admin ? (
            <form action={addStormZipsAction} className="flex gap-2">
              <input type="hidden" name="stormId" value={storm.id} />
              <input
                name="zips"
                placeholder="Add ZIPs (75034, 75035)"
                className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
              />
              <Button type="submit" variant="outline">
                Add ZIPs
              </Button>
            </form>
          ) : null}
        </section>

        <section className="lg:col-span-2 space-y-4">
          <form action={updateStormOfferAction} className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <input type="hidden" name="id" value={storm.id} />
            <Field label="Name" name="name" defaultValue={storm.name} disabled={!admin} />
            <Field label="Headline" name="headline" defaultValue={storm.headline ?? ""} disabled={!admin} />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Offer text
              </span>
              <textarea
                name="offerText"
                rows={5}
                defaultValue={storm.offerText}
                disabled={!admin}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Internal notes
              </span>
              <textarea
                name="notes"
                rows={3}
                defaultValue={storm.notes ?? ""}
                disabled={!admin}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            {admin ? <Button type="submit">Save copy</Button> : null}
          </form>
          <Link
            href={`/leads?storm=${storm.id}`}
            className="block rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10 hover:bg-muted/40"
          >
            <p className="font-semibold">Leads from this storm</p>
            <p className="text-muted-foreground">{storm._count.leads} in the inbox</p>
          </Link>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}
