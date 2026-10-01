"use client";

import { useMemo, useState, useTransition } from "react";
import type { PdrMatrixRow } from "@prisma/client";
import { saveMatrixRowsAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { dentBandLabel, panelLabel } from "@/lib/constants";
import { centsToDollarsInput, dollarsToCents, formatMoney } from "@/lib/format";

type EditableRow = {
  id: string;
  dimeCents: number;
  nickelCents: number;
  quarterCents: number;
  halfDollarCents: number;
};

export function MatrixEditor({ rows }: { rows: PdrMatrixRow[] }) {
  const panelOptions = useMemo(() => {
    const codes = [...new Set(rows.map((row) => row.panelCode))];
    return codes.map((code) => ({ code, label: rows.find((row) => row.panelCode === code)?.panelLabel || panelLabel(code) }));
  }, [rows]);
  const [panelCode, setPanelCode] = useState<string>(panelOptions[0]?.code ?? rows[0]?.panelCode ?? "HOOD");
  const [draft, setDraft] = useState<Record<string, EditableRow>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          dimeCents: row.dimeCents,
          nickelCents: row.nickelCents,
          quarterCents: row.quarterCents,
          halfDollarCents: row.halfDollarCents,
        },
      ]),
    ),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => rows.filter((row) => row.panelCode === panelCode),
    [rows, panelCode],
  );

  function update(id: string, field: keyof Omit<EditableRow, "id">, value: string) {
    setDraft((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: dollarsToCents(value),
      },
    }));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      await saveMatrixRowsAction(Object.values(draft));
      setMessage("Matrix saved. New estimates will use these cells.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-72">
          <p className="mb-1.5 text-sm font-medium">Panel</p>
          <NativeSelect value={panelCode} onChange={(event) => setPanelCode(event.target.value)}>
            {panelOptions.map((panel) => (
              <option key={panel.code} value={panel.code}>
                {panel.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save matrix"}
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-emerald-700">{message}</p>
      ) : null}

      <div className="table-scroll rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Dent count</th>
              <th className="px-3 py-2 font-medium">Dime</th>
              <th className="px-3 py-2 font-medium">Nickel</th>
              <th className="px-3 py-2 font-medium">Quarter</th>
              <th className="px-3 py-2 font-medium">Half-dollar</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const values = draft[row.id];
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {dentBandLabel(row.minDents, row.maxDents)}
                  </td>
                  {(
                    [
                      ["dimeCents", values.dimeCents],
                      ["nickelCents", values.nickelCents],
                      ["quarterCents", values.quarterCents],
                      ["halfDollarCents", values.halfDollarCents],
                    ] as const
                  ).map(([field, cents]) => (
                    <td key={field} className="px-3 py-2">
                      <Input
                        inputMode="decimal"
                        value={centsToDollarsInput(cents)}
                        onChange={(event) => update(row.id, field, event.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
        <summary className="cursor-pointer font-medium">Preview all panels</summary>
        <div className="table-scroll mt-4">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-3">Panel</th>
                <th className="py-1 pr-3">Band</th>
                <th className="py-1 pr-3">Dime</th>
                <th className="py-1 pr-3">Nickel</th>
                <th className="py-1 pr-3">Quarter</th>
                <th className="py-1 pr-3">Half</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const values = draft[row.id];
                return (
                  <tr key={row.id} className="border-t">
                    <td className="py-1 pr-3">{row.panelLabel}</td>
                    <td className="py-1 pr-3">{dentBandLabel(row.minDents, row.maxDents)}</td>
                    <td className="py-1 pr-3">{formatMoney(values.dimeCents)}</td>
                    <td className="py-1 pr-3">{formatMoney(values.nickelCents)}</td>
                    <td className="py-1 pr-3">{formatMoney(values.quarterCents)}</td>
                    <td className="py-1 pr-3">{formatMoney(values.halfDollarCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
