import { EstimateEditor } from "@/components/estimate-editor";
import { PageHeader } from "@/components/page-header";
import {
  getCarrierMatrices,
  getCustomerOptions,
  getShopCatalog,
  toCustomerOptions,
  toEstimateCatalog,
} from "@/lib/queries";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; claimId?: string; vehicleId?: string }>;
}) {
  const params = await searchParams;
  const [customers, catalog, carrierMatrices] = await Promise.all([
    getCustomerOptions(),
    getShopCatalog(),
    getCarrierMatrices(),
  ]);

  const shop = toEstimateCatalog(catalog);
  if (shop.matrixRows.length === 0) {
    return (
      <div className="p-6">
        <PageHeader title="New estimate" />
        <p className="text-sm text-muted-foreground">
          An admin needs to activate a PDR matrix before estimates can be written.
        </p>
      </div>
    );
  }

  const customer = customers.find((item) => item.id === params.customerId);

  return (
    <EstimateEditor
      customers={toCustomerOptions(customers)}
      matrixRows={shop.matrixRows}
      carrierMatrices={carrierMatrices}
      markups={shop.markups}
      laborRates={shop.laborRates}
      laborTimes={shop.laborTimes}
      settings={shop.settings}
      initialOwner={customer?.name ?? ""}
      initialClaimNumber={
        customer?.claims.find((claim) => claim.id === params.claimId)?.claimNumber ?? ""
      }
      backHref={params.claimId ? `/claims/${params.claimId}` : "/estimates"}
      initial={{
        customerId: params.customerId ?? "",
        vehicleId: params.vehicleId || null,
        claimId: params.claimId || null,
        notes: "",
        bodyStyle: "CAR",
        carrierId: "state_farm",
        lines: [],
      }}
    />
  );
}
