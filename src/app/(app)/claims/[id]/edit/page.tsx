import { notFound } from "next/navigation";
import { ClaimForm } from "@/components/claim-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";

export default async function EditClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [claim, customers] = await Promise.all([
    prisma.claim.findUnique({ where: { id } }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: { vehicles: true },
    }),
  ]);
  if (!claim) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit claim" description={claim.claimNumber} />
      <ClaimForm claim={claim} customers={customers} error={error} />
    </div>
  );
}
