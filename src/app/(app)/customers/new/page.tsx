import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New customer"
        description="Capture contact details and an optional first vehicle."
      />
      <CustomerForm error={error} includeVehicle />
    </div>
  );
}
