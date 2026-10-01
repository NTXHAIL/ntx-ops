import { requireAdmin } from "@/lib/auth";
import { LaborSettings } from "@/components/labor-settings";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";

export default async function LaborSettingsPage() {
  await requireAdmin();
  const [rates, times] = await Promise.all([
    prisma.laborRate.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.laborTime.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { defaultRate: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Labor rates and times"
        description="Catalog values are copied onto each estimate line. The line keeps an audit of which rate and time were used, including overrides."
      />
      <LaborSettings rates={rates} times={times} />
    </div>
  );
}
