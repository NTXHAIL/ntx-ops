import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { MatrixEditor } from "@/components/matrix-editor";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { HS_CARRIERS } from "@/lib/hailspec";
import { initializeCarrierMatrixAction, setCarrierStubAction } from "@/app/actions/settings";
import { cn } from "cn";

export default async function MatrixSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ carrier?: string }>;
}) {
  await requireAdmin();
  const { carrier } = await searchParams;
  const carrierId = carrier || "state_farm";
  const matrices = await prisma.pdrMatrix.findMany({
    include: { rows: { orderBy: [{ panelCode: "asc" }, { minDents: "asc" }] } },
    orderBy: { name: "asc" },
  });
  const matrix =
    matrices.find((item) => item.carrierId === carrierId) ??
    matrices.find((item) => item.carrierId === "state_farm");

  return (
    <div>
      <PageHeader
        title="Carrier pricing matrices"
        description="State Farm uses the HailSpec 13-panel table. Other carriers are stubs and fall back to State Farm prices until you fill them in. Signed-in admins only."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {HS_CARRIERS.map((item) => {
          const row = matrices.find((matrixRow) => matrixRow.carrierId === item.id);
          const active = (matrix?.carrierId ?? "state_farm") === item.id;
          return (
            <Link
              key={item.id}
              href={`/settings/matrix?carrier=${item.id}`}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-semibold",
                active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500",
              )}
            >
              {item.label}
              {row?.isStub || !row?.rows.length ? " · stub" : ""}
            </Link>
          );
        })}
      </div>
      {matrix ? (
        <div className="space-y-4">
          {matrix.isStub || matrix.rows.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>
                {matrix.name} is a stub. Estimates currently use State Farm prices. Copy the State
                Farm structure (cells start at $0) and turn off stub mode when the table is ready.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {matrix.rows.length === 0 ? (
                  <form action={initializeCarrierMatrixAction}>
                    <input type="hidden" name="carrierId" value={matrix.carrierId} />
                    <button
                      type="submit"
                      className="rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-bold text-white"
                    >
                      Copy State Farm structure
                    </button>
                  </form>
                ) : (
                  <form action={setCarrierStubAction}>
                    <input type="hidden" name="carrierId" value={matrix.carrierId} />
                    <input type="hidden" name="isStub" value="false" />
                    <button
                      type="submit"
                      className="rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-bold text-white"
                    >
                      Use this carrier’s prices
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : null}
          {matrix.rows.length > 0 ? <MatrixEditor rows={matrix.rows} /> : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No matrix found. Re-run the seed.</p>
      )}
    </div>
  );
}
