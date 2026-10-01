import { notFound, redirect } from "next/navigation";
import { EstimateEditor } from "@/components/estimate-editor";
import { estimateToDraft } from "@/lib/estimate-draft";
import { prisma } from "@/lib/db";
import {
  getCarrierMatrices,
  getCustomerOptions,
  getShopCatalog,
  toCustomerOptions,
  toEstimateCatalog,
} from "@/lib/queries";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [estimate, customers, catalog, carrierMatrices] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        photos: { orderBy: { createdAt: "asc" } },
        customer: true,
        claim: true,
      },
    }),
    getCustomerOptions(),
    getShopCatalog(),
    getCarrierMatrices(),
  ]);
  if (!estimate) notFound();
  if (estimate.status !== "DRAFT") {
    redirect(`/estimates/${estimate.id}`);
  }
  const shop = toEstimateCatalog(catalog);
  if (shop.matrixRows.length === 0) {
    redirect("/settings/matrix");
  }

  return (
    <EstimateEditor
      customers={toCustomerOptions(customers)}
      matrixRows={shop.matrixRows}
      carrierMatrices={carrierMatrices}
      markups={shop.markups}
      laborRates={shop.laborRates}
      laborTimes={shop.laborTimes}
      settings={shop.settings}
      initial={estimateToDraft(estimate)}
      initialOwner={estimate.customer.name}
      initialClaimNumber={estimate.claim?.claimNumber ?? ""}
      initialPhotos={estimate.photos.map((photo) => ({
        url: photo.path,
        name: photo.name,
        path: photo.path,
      }))}
    />
  );
}
