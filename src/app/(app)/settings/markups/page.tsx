import { requireAdmin } from "@/lib/auth";
import { saveMarkupRuleAction, saveShopDefaultsAction } from "@/app/actions/settings";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";
import { centsToDollarsInput } from "@/lib/format";

export default async function MarkupSettingsPage() {
  await requireAdmin();
  const [settings, rules] = await Promise.all([
    prisma.shopSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
    prisma.markupRule.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Markups and oversized dents"
        description="Selected panel markups stack, then the shop cap applies. OS / 2× OS / 3× OS stay on their own lines and are not part of the panel dent count. The old DOS unit is now 2× OS."
      />

      <form
        action={saveShopDefaultsAction}
        className="grid gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:grid-cols-2"
      >
        <div>
          <Label className="mb-1">Max combined markup %</Label>
          <Input
            name="maxCombinedMarkupPercent"
            type="number"
            defaultValue={settings.maxCombinedMarkupPercent}
          />
        </div>
        <div>
          <Label className="mb-1">Oversized (OS) unit</Label>
          <Input name="oversizedOs" defaultValue={centsToDollarsInput(settings.oversizedOsCents)} />
        </div>
        <div>
          <Label className="mb-1">2× oversized unit</Label>
          <Input
            name="oversizedDos"
            defaultValue={centsToDollarsInput(settings.oversizedDosCents)}
          />
        </div>
        <div>
          <Label className="mb-1">3× oversized unit</Label>
          <Input
            name="oversizedTriple"
            defaultValue={centsToDollarsInput(settings.oversizedTripleCents)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Save defaults</Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Markup rules</h2>
        {rules.map((rule) => (
          <form
            key={rule.id}
            action={saveMarkupRuleAction}
            className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-4"
          >
            <input type="hidden" name="id" value={rule.id} />
            <input type="hidden" name="code" value={rule.code} />
            <div>
              <Label className="mb-1">Name</Label>
              <Input name="name" defaultValue={rule.name} />
            </div>
            <div>
              <Label className="mb-1">Percent</Label>
              <Input name="percent" type="number" defaultValue={rule.percent} />
            </div>
            <label className="flex items-end gap-2 pb-1 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={rule.isActive} />
              Active
            </label>
            <div className="flex items-end">
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        ))}

        <form
          action={saveMarkupRuleAction}
          className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-4"
        >
          <div className="text-sm font-medium sm:col-span-4">Add markup</div>
          <Input name="name" placeholder="Name" required />
          <Input name="code" placeholder="CODE" required />
          <Input name="percent" type="number" placeholder="25" />
          <Button type="submit">Add</Button>
        </form>
      </section>
    </div>
  );
}
