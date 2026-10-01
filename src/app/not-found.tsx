import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/constants";
import { cn } from "cn";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-muted-foreground">{PRODUCT_NAME}</p>
      <h1 className="text-2xl font-semibold">That page is not in the shop file</h1>
      <Link href="/dashboard" className={cn(buttonVariants())}>
        Back to dashboard
      </Link>
    </div>
  );
}
