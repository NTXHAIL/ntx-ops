import type { LaborRate, LaborTime } from "@prisma/client";
import {
  saveLaborRateAction,
  saveLaborTimeAction,
  toggleLaborActiveAction,
} from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { centsToDollarsInput, formatMoney } from "@/lib/format";

export function LaborSettings({
  rates,
  times,
}: {
  rates: LaborRate[];
  times: (LaborTime & { defaultRate: LaborRate | null })[];
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Labor rates</h2>
          <p className="text-sm text-muted-foreground">
            Hourly rates multiply by catalog or overridden hours. Flat rates ignore time.
          </p>
        </div>
        <div className="space-y-3">
          {rates.map((rate) => (
            <form
              key={rate.id}
              action={saveLaborRateAction}
              className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-5"
            >
              <input type="hidden" name="id" value={rate.id} />
              <input type="hidden" name="isActive" value={rate.isActive ? "on" : "off"} />
              <div className="sm:col-span-2">
                <Label className="mb-1">Name</Label>
                <Input name="name" defaultValue={rate.name} />
              </div>
              <div>
                <Label className="mb-1">Type</Label>
                <NativeSelect name="type" defaultValue={rate.type}>
                  <option value="HOURLY">Hourly</option>
                  <option value="FLAT">Flat</option>
                </NativeSelect>
              </div>
              <div>
                <Label className="mb-1">Amount</Label>
                <Input name="amount" defaultValue={centsToDollarsInput(rate.amountCents)} />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="isDefault" defaultChecked={rate.isDefault} />
                  Default
                </label>
                <Button type="submit" size="sm">
                  Save
                </Button>
              </div>
            </form>
          ))}
        </div>
        <form
          action={saveLaborRateAction}
          className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-4"
        >
          <div className="text-sm font-medium sm:col-span-4">Add rate</div>
          <Input name="name" placeholder="Name" required />
          <NativeSelect name="type" defaultValue="HOURLY">
            <option value="HOURLY">Hourly</option>
            <option value="FLAT">Flat</option>
          </NativeSelect>
          <Input name="amount" placeholder="85.00" />
          <Button type="submit">Add rate</Button>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Labor time catalog</h2>
          <p className="text-sm text-muted-foreground">
            R&amp;I-style items estimators can pull onto a hail estimate and override per line.
          </p>
        </div>
        <div className="space-y-3">
          {times.map((time) => (
            <div
              key={time.id}
              className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-6"
            >
              <form action={saveLaborTimeAction} className="contents">
                <input type="hidden" name="id" value={time.id} />
                <input type="hidden" name="isActive" value={time.isActive ? "on" : "off"} />
                <div className="sm:col-span-2">
                  <Label className="mb-1">Name</Label>
                  <Input name="name" defaultValue={time.name} />
                </div>
                <div>
                  <Label className="mb-1">Category</Label>
                  <Input name="category" defaultValue={time.category ?? ""} />
                </div>
                <div>
                  <Label className="mb-1">Hours</Label>
                  <Input name="hours" type="number" step="0.1" defaultValue={time.hours} />
                </div>
                <div>
                  <Label className="mb-1">Default rate</Label>
                  <NativeSelect name="defaultRateId" defaultValue={time.defaultRateId ?? ""}>
                    <option value="">None</option>
                    {rates.map((rate) => (
                      <option key={rate.id} value={rate.id}>
                        {rate.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                </div>
              </form>
              <form action={toggleLaborActiveAction} className="sm:col-span-6">
                <input type="hidden" name="kind" value="time" />
                <input type="hidden" name="id" value={time.id} />
                <input type="hidden" name="isActive" value={time.isActive ? "false" : "true"} />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Catalog {time.hours}h
                    {time.defaultRate
                      ? ` · ${time.defaultRate.name} ${formatMoney(time.defaultRate.amountCents)}`
                      : ""}
                    {!time.isActive ? " · hidden from new estimates" : ""}
                  </p>
                  <Button type="submit" size="sm" variant="outline">
                    {time.isActive ? "Hide" : "Show"}
                  </Button>
                </div>
              </form>
            </div>
          ))}
        </div>
        <form
          action={saveLaborTimeAction}
          className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-5"
        >
          <div className="text-sm font-medium sm:col-span-5">Add catalog time</div>
          <Input name="name" placeholder="Name" required />
          <Input name="category" placeholder="Category" />
          <Input name="hours" type="number" step="0.1" placeholder="1.0" />
          <NativeSelect
            name="defaultRateId"
            defaultValue={rates.find((rate) => rate.isDefault)?.id ?? ""}
          >
            <option value="">No default rate</option>
            {rates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit">Add time</Button>
        </form>
      </section>
    </div>
  );
}
