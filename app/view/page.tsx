import { Suspense } from "react";
import ViewOnlyClient from "./view-only-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ViewPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event } = await searchParams;

  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, fontFamily: "sans-serif" }}>Loading…</div>
      }
    >
      <ViewOnlyClient eventId={event} />
    </Suspense>
  );
}
