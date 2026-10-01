import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

const cards = [
  {
    href: "/settings/matrix",
    title: "PDR matrix",
    body: "Panel × dent-count × size lookup table used on hail estimates.",
  },
  {
    href: "/settings/labor",
    title: "Labor rates & times",
    body: "Hourly or flat rates and the R&I catalog estimators pull onto a job.",
  },
  {
    href: "/settings/markups",
    title: "Markups & oversized",
    body: "Aluminum, HSS, double-panel, combined cap, and OS / 2× OS / 3× OS unit prices.",
  },
];

export default async function SettingsPage() {
  await requireAdmin();
  return (
    <div>
      <PageHeader
        title="Shop settings"
        description="Admin-only catalogs that drive estimate math. Estimators can still override a line when the job needs it."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 hover:bg-muted/40"
          >
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
