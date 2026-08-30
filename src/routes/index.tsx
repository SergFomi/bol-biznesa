import { createFileRoute } from "@tanstack/react-router";
import { DissolveStage } from "@/components/dissolve-stage";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <DissolveStage />;
}
