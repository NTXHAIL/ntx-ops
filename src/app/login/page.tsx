import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_NAME, LEGAL_NAME, PRODUCT_NAME } from "@/lib/constants";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-[var(--app-canvas)] lg:flex-row">
      <section className="flex shrink-0 flex-col justify-between bg-[#0a1628] px-6 py-6 text-white sm:px-8 sm:py-8 lg:min-h-dvh lg:flex-1 lg:px-8 lg:py-10">
        <div>
          <p className="text-[9px] font-bold tracking-[0.2em] text-blue-300 uppercase">
            by {BRAND_NAME}
          </p>
          <h1 className="mt-3 max-w-md text-3xl font-black tracking-[0.08em] lg:mt-4 lg:text-4xl">
            HAILSPEC
          </h1>
          <p className="mt-1 text-sm font-semibold text-white/70">{PRODUCT_NAME}</p>
          <p className="mt-3 max-w-md text-sm text-white/70">
            Internal shop operations for hail and paintless dent repair — estimates,
            customers, and claims in one place.
          </p>
        </div>
        <p className="text-xs text-white/45">{LEGAL_NAME}</p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-8 lg:py-12">
        <form action={loginAction} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your Hail Ops email. Seeded demo accounts are in the README.
            </p>
          </div>
          {params.error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Email or password did not match.
            </p>
          ) : null}
          <input type="hidden" name="next" value={params.next || "/dashboard"} />
          <div>
            <Label htmlFor="email" className="mb-1.5">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              defaultValue="admin@ntxhail.local"
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-1.5">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="h-11 w-full">
            Continue
          </Button>
        </form>
      </section>
    </div>
  );
}
