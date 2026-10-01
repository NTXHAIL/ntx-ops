import { DENT_SIZE_LABELS } from "@/lib/constants";
import { hailSpecPercentCents } from "@/lib/estimate-calc";
import {
  DEFAULT_LABOR_RATE_CENTS,
  DOUBLE_OS_CENTS,
  HS_LABELS,
  OS_DENT_CENTS,
  RI_OPERATIONS,
  rangesForPanel,
  sizePrice,
  type HsKey,
  type MatrixRow,
} from "@/lib/hailspec";
import type { HsPanelState } from "@/lib/hailspec-draft";

export type ReportLine = {
  line: number;
  kind: "pdr" | "addon" | "rr" | "conv" | "ri";
  label: string;
  qty: string;
  priceCents: number;
  laborCents: number;
};

export type ReportSection = {
  panel: HsKey;
  title: string;
  rr: boolean;
  conv: boolean;
  lines: ReportLine[];
};

export function buildReportSections(
  panelData: Record<HsKey, HsPanelState>,
  markups: { code: string; name: string; percent: number }[],
  keys: HsKey[],
  rows: MatrixRow[] = [],
): { sections: ReportSection[]; totalPriceCents: number; totalLaborCents: number } {
  let lineNum = 0;
  let totalPrice = 0;
  let totalLabor = 0;
  const sections: ReportSection[] = [];

  for (const key of keys) {
    const d = panelData[key];
    if (!d) continue;
    const np = d.rrEnabled || d.convEnabled;
    const rate = d.laborRateCents || DEFAULT_LABOR_RATE_CENTS;
    const title = `${HS_LABELS[key]}${d.rrEnabled ? " — R&R" : d.convEnabled ? " — Conv." : ""}`;
    const lines: ReportLine[] = [];

    if (np) {
      const hours = d.rrEnabled ? d.rrHours : d.convHours;
      const cost = Math.round(hours * rate);
      lineNum += 1;
      totalLabor += cost;
      lines.push({
        line: lineNum,
        kind: d.rrEnabled ? "rr" : "conv",
        label: d.rrEnabled ? "R&R — Remove & Replace" : "Conventional Repair",
        qty: `${hours.toFixed(1)} hrs`,
        priceCents: 0,
        laborCents: cost,
      });
    } else if (d.selectedRange) {
      const range = rangesForPanel(rows, key).find((item) => item.range === d.selectedRange);
      const baseCents = range ? sizePrice(range, d.size) : 0;
      lineNum += 1;
      totalPrice += baseCents;
      lines.push({
        line: lineNum,
        kind: "pdr",
        label: `PDR — ${d.selectedRange} ${DENT_SIZE_LABELS[d.size].toLowerCase()} dents`,
        qty: "1",
        priceCents: baseCents,
        laborCents: 0,
      });
      for (const name of d.markupCodes) {
        const rule = markups.find((item) => item.code === name);
        if (rule) {
          const addonAmt = hailSpecPercentCents(baseCents, rule.percent);
          if (addonAmt > 0) {
            lineNum += 1;
            totalPrice += addonAmt;
            lines.push({
              line: lineNum,
              kind: "addon",
              label: `Add-on: ${rule.name}`,
              qty: `${rule.percent}% of $${(baseCents / 100).toLocaleString()}`,
              priceCents: addonAmt,
              laborCents: 0,
            });
          }
        }
      }
      if (d.os > 0) {
        const addonAmt = OS_DENT_CENTS * d.os;
        lineNum += 1;
        totalPrice += addonAmt;
        lines.push({
          line: lineNum,
          kind: "addon",
          label: "Add-on: Oversized Dent",
          qty: `${d.os} × $50`,
          priceCents: addonAmt,
          laborCents: 0,
        });
      }
      if (d.os2x > 0) {
        const addonAmt = DOUBLE_OS_CENTS * d.os2x;
        lineNum += 1;
        totalPrice += addonAmt;
        lines.push({
          line: lineNum,
          kind: "addon",
          label: "Add-on: Double OS Dents",
          qty: `${d.os2x} × $100`,
          priceCents: addonAmt,
          laborCents: 0,
        });
      }
    }

    if (d.riEnabled) {
      for (const op of RI_OPERATIONS[key]) {
        if (!d.riIncluded[op.id]) continue;
        const time = d.riTimes[op.id] ?? op.time;
        const cost = Math.round(time * rate);
        const isOpRr = Boolean(d.riRr[op.id]);
        lineNum += 1;
        totalLabor += cost;
        lines.push({
          line: lineNum,
          kind: "ri",
          label: `${isOpRr ? "R&R" : "R&I"}: ${op.name}`,
          qty: `${time.toFixed(1)} hrs @ $${(rate / 100).toFixed(2)}`,
          priceCents: 0,
          laborCents: cost,
        });
      }
    }

    if (lines.length) {
      sections.push({ panel: key, title, rr: d.rrEnabled, conv: d.convEnabled, lines });
    }
  }

  return { sections, totalPriceCents: totalPrice, totalLaborCents: totalLabor };
}

export function generateReportHTML(input: {
  owner: string;
  vehicle: string;
  vin: string;
  claim: string;
  carrierLabel: string;
  photos: { url: string; name: string }[];
  sections: ReportSection[];
  totalPriceCents: number;
  totalLaborCents: number;
}) {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const grand = input.totalPriceCents + input.totalLaborCents;
  const money = (cents: number) =>
    cents ? `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
  const rows = input.sections
    .map((section) => {
      const klass = section.rr ? "section-row-rr" : "section-row";
      const head = `<tr class="${klass}"><td colspan="5">${escapeHtml(section.title)}</td></tr>`;
      const body = section.lines
        .map((line) => {
          const rowClass = line.kind === "ri" ? (line.label.startsWith("R&R") ? "rr-labor-row" : "labor-row") : line.kind === "addon" ? "addon-row" : "";
          return `<tr class="${rowClass}"><td class="ln">${line.line}</td><td>${escapeHtml(line.label)}</td><td>${escapeHtml(line.qty)}</td><td class="amt">${money(line.priceCents)}</td><td class="amt">${money(line.laborCents)}</td></tr>`;
        })
        .join("");
      return head + body;
    })
    .join("");
  const photos = input.photos
    .map(
      (photo) =>
        `<img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.name)}" style="width:150px;height:110px;object-fit:cover;border-radius:8px;margin:4px" />`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>NTX Hail Estimate</title>
<style>
  @page { size: letter; margin: 0.6in; }
  html,body{max-width:100%;overflow-x:clip}
  body{font-family:'DM Sans',system-ui,sans-serif;color:#0f172a;margin:24px;background:#fff}
  h1{margin:0;letter-spacing:.12em}
  .sub{color:#64748b;font-size:13px}
  .table-wrap{width:100%;overflow-x:auto}
  table{width:100%;min-width:560px;border-collapse:collapse;margin-top:16px;font-size:13px}
  th{background:#0a1628;color:#fff;text-align:left;padding:8px}
  td{padding:6px 8px;border-bottom:1px solid #e2e8f0;word-break:break-word}
  .section-row td{background:#eff6ff;font-weight:700}
  .section-row-rr td{background:#fef2f2;font-weight:700;color:#dc2626}
  .addon-row td{color:#334155}
  .labor-row td{color:#1d4ed8}
  .rr-labor-row td{color:#dc2626}
  .ln{width:36px;color:#94a3b8}
  .amt{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;font-size:13px}
  .photos{margin-top:16px}
  .photos img{max-width:100%;height:auto}
  @media (max-width:600px){
    body{margin:16px}
    .grid{grid-template-columns:1fr}
    table{font-size:12px;min-width:480px}
  }
  @media print{
    button{display:none}
    body{margin:0}
    table{min-width:0;font-size:12px}
    .table-wrap{overflow:visible}
  }
</style></head><body>
  <h1>NTX HAIL</h1>
  <div class="sub">HailSpec Estimator</div>
  <div class="sub">${escapeHtml(input.carrierLabel)} Matrix Pricing — ${date}</div>
  <div class="grid">
    <div><strong>Owner</strong><br/>${escapeHtml(input.owner || "—")}</div>
    <div><strong>Vehicle</strong><br/>${escapeHtml(input.vehicle || "—")}</div>
    <div><strong>VIN</strong><br/>${escapeHtml(input.vin || "—")}</div>
    <div><strong>Claim #</strong><br/>${escapeHtml(input.claim || "—")}</div>
  </div>
  <div class="table-wrap"><table>
    <thead><tr><th>Line</th><th>Operation</th><th>Qty</th><th>Price $</th><th>Labor $</th></tr></thead>
    <tbody>${rows}
      <tr><td></td><td colspan="2"><strong>Subtotals</strong></td><td class="amt"><strong>${money(input.totalPriceCents)}</strong></td><td class="amt"><strong>${money(input.totalLaborCents)}</strong></td></tr>
      <tr><td></td><td colspan="2"><strong>GRAND TOTAL</strong></td><td class="amt" colspan="2"><strong>${money(grand)}</strong></td></tr>
    </tbody>
  </table></div>
  ${photos ? `<div class="photos"><h2>Documentation Photos</h2>${photos}</div>` : ""}
  <p class="sub">Generated by HailSpec — NTX Hail | ntxhail.com — ${date}</p>
</body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
