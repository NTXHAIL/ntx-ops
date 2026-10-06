import { redirect } from "next/navigation";
import { SetupRequired } from "@/components/setup-required";
import { setupSteps } from "@/lib/setup-status";

export default function SetupPage() {
  const steps = setupSteps();
  if (!steps) redirect("/login");
  return <SetupRequired steps={steps} />;
}
