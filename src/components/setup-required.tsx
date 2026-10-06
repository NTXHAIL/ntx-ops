import { BRAND_NAME, LEGAL_NAME, PRODUCT_NAME } from "@/lib/constants";
import type { SetupStep } from "@/lib/setup-status";

export function SetupRequired({ steps }: { steps: SetupStep[] }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--app-canvas)] lg:flex-row">
      <section className="flex shrink-0 flex-col justify-between bg-[#0a1628] px-6 py-6 text-white sm:px-8 sm:py-8 lg:min-h-dvh lg:w-[380px] lg:px-8 lg:py-10">
        <div>
          <p className="text-[9px] font-bold tracking-[0.2em] text-blue-300 uppercase">
            by {BRAND_NAME}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[0.08em]">HAILSPEC</h1>
          <p className="mt-1 text-sm font-semibold text-white/70">{PRODUCT_NAME}</p>
          <p className="mt-3 max-w-md text-sm text-white/70">
            The database is not connected yet, so the shop cannot be opened.
          </p>
        </div>
        <p className="mt-8 text-xs text-white/45">{LEGAL_NAME}</p>
      </section>
      <section className="flex flex-1 items-center justify-center px-6 py-8 lg:py-12">
        <div className="w-full max-w-lg space-y-4">
          <h2 className="text-xl font-semibold">Finish setup in Vercel</h2>
          <p className="text-sm text-muted-foreground">
            Do these steps in the Vercel project, then redeploy. You do not copy database
            passwords or photo keys.
          </p>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-lg border bg-white px-4 py-3">
                <p className="text-sm font-semibold">
                  {index + 1}. {step.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
