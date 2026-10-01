import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit customer" description={customer.name} />
      <CustomerForm customer={customer} error={error} />
    </div>
  );
}
