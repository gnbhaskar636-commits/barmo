import { Suspense } from "react";
import WorldView from "@/components/WorldView";

export default function Page() {
  return (
    <Suspense>
      <WorldView />
    </Suspense>
  );
}
