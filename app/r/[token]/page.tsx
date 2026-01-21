import { Suspense } from "react";
import ReservationClient from "./reservation-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { token } = await params;
  const { event } = await searchParams;

  return (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: "sans-serif" }}>Loading…</div>}>
      <ReservationClient token={token} eventId={event} />
    </Suspense>
  );
}
