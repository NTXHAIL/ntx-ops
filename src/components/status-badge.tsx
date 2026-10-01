import { Badge } from "@/components/ui/badge";
import {
  CLAIM_STATUS_LABELS,
  ESTIMATE_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  STORM_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "cn";

const estimateTone: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING_APPROVAL: "bg-amber-100 text-amber-900 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DECLINED: "bg-rose-100 text-rose-800 border-rose-200",
};

const claimTone: Record<string, string> = {
  OPEN: "bg-sky-100 text-sky-800 border-sky-200",
  PENDING: "bg-amber-100 text-amber-900 border-amber-200",
  IN_REVIEW: "bg-indigo-100 text-indigo-800 border-indigo-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

export function EstimateStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", estimateTone[status])}
    >
      {ESTIMATE_STATUS_LABELS[status as keyof typeof ESTIMATE_STATUS_LABELS] ??
        status}
    </Badge>
  );
}

const stormTone: Record<string, string> = {
  DETECTED: "bg-slate-100 text-slate-700 border-slate-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ACTIVE: "bg-sky-100 text-sky-800 border-sky-200",
  CLOSED: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const leadTone: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 border-blue-200",
  CONTACTED: "bg-amber-100 text-amber-900 border-amber-200",
  BOOKED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ESTIMATED: "bg-violet-100 text-violet-800 border-violet-200",
  WON: "bg-emerald-100 text-emerald-800 border-emerald-200",
  LOST: "bg-rose-100 text-rose-800 border-rose-200",
};

export function StormStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("border font-medium", stormTone[status])}>
      {STORM_STATUS_LABELS[status as keyof typeof STORM_STATUS_LABELS] ?? status}
    </Badge>
  );
}

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("border font-medium", leadTone[status])}>
      {LEAD_STATUS_LABELS[status as keyof typeof LEAD_STATUS_LABELS] ?? status}
    </Badge>
  );
}

export function ClaimStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", claimTone[status])}
    >
      {CLAIM_STATUS_LABELS[status as keyof typeof CLAIM_STATUS_LABELS] ?? status}
    </Badge>
  );
}
