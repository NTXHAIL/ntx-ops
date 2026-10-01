import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/format";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();
  const customers = await prisma.customer.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query } },
            { emailPrimary: { contains: query } },
            { phonePrimary: { contains: query } },
            { city: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { vehicles: true, estimates: true, claims: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People and fleet accounts tied to vehicles, claims, and hail estimates."
        actionHref="/customers/new"
        actionLabel="New customer"
      />

      <form className="mb-4 flex max-w-md gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search name, email, phone, or city"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title={query ? "No customers match that search" : "No customers yet"}
          description="Add a customer before you write an estimate or open a claim."
          actionHref="/customers/new"
          actionLabel="New customer"
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <ul className="divide-y">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/customers/${customer.id}`}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[formatPhone(customer.phonePrimary), customer.emailPrimary, customer.city]
                        .filter(Boolean)
                        .join(" · ") || "No contact yet"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {customer._count.vehicles} vehicles · {customer._count.estimates} estimates ·{" "}
                    {customer._count.claims} claims
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
