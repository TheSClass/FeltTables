import { Suspense } from "react";
import ViewOnlyClient from "./view-only-client";

export const dynamic = "force-dynamic"; // avoids static prerender headaches

export default function ViewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: "sans-serif" }}>Loading…</div>}>
      <ViewOnlyClient />
    </Suspense>
  );
}
