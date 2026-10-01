import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {actionHref && actionLabel ? (
          <Link href={actionHref} className={cn(buttonVariants(), "min-h-11")}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
