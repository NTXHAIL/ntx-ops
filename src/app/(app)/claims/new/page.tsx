import { ClaimForm } from "@/components/claim-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; customerId?: string }>;
}) {
  const { error, customerId } = await searchParams;
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { vehicles: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New claim"
        description="Record the carrier file so estimates can follow the same vehicle and deductible."
      />
      <ClaimForm
        customers={customers}
        error={error}
        claim={customerId ? { customerId } : undefined}
      />
    </div>
  );
}
