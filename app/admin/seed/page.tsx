"use client";

import { useState } from "react";
import { db } from "../../firebase";
import {
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

type SeedResult =
  | { ok: true; eventId: string; reservationUrlExample: string }
  | { ok: false; error: string };

function makeSeatIds() {
  const seats: string[] = [];
  for (let t = 1; t <= 3; t++) {
    for (let s = 1; s <= 8; s++) {
      seats.push(`T${t}-S${s}`);
    }
  }
  return seats;
}

export default function SeedPage() {
  const [eventId, setEventId] = useState("nightclub-2026-02");
  const [eventName, setEventName] = useState("Nightclub Night");
  const [eventDate, setEventDate] = useState("2026-02-__");
  const [result, setResult] = useState<SeedResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function seed() {
    setBusy(true);
    setResult(null);

    try {
      const eventRef = doc(db, "events", eventId);

      // Safety: don't overwrite an existing event accidentally
      const existing = await getDoc(eventRef);
      if (existing.exists()) {
        setResult({
          ok: false,
          error: `Event "${eventId}" already exists. Choose a different eventId or delete it in Firestore.`,
        });
        setBusy(false);
        return;
      }

      const batch = writeBatch(db);

      // Event doc
      batch.set(eventRef, {
        name: eventName,
        date: eventDate,
        tables: [
          { id: "T1", name: "Table 1", seats: 8 },
          { id: "T2", name: "Table 2", seats: 8 },
          { id: "T3", name: "Table 3", seats: 8 },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 24 seat docs in a subcollection
      const seatIds = makeSeatIds();
      for (const seatId of seatIds) {
        const seatRef = doc(db, "events", eventId, "seats", seatId);
        batch.set(seatRef, {
          seatId,
          claimedBy: null, // reservation token string when claimed
          guestName: "",
          spirit: "",
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      // Example URL (we’ll implement /r/[token] next)
      const exampleToken = "PASTE-TOKEN-HERE";
      const reservationUrlExample = `${window.location.origin}/r/${exampleToken}?event=${encodeURIComponent(
        eventId
      )}`;

      setResult({ ok: true, eventId, reservationUrlExample });
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 720 }}>
      <h1>Seed Event + Seats</h1>
      <p>
        This is a one-time setup page. After seeding, you should delete this
        route.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          <div style={{ fontWeight: 600 }}>Event ID</div>
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="nightclub-2026-02"
          />
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            Use something unique. This becomes your event key in Firestore.
          </div>
        </label>

        <label>
          <div style={{ fontWeight: 600 }}>Event Name</div>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600 }}>Event Date (text is fine)</div>
          <input
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="2026-02-14"
          />
        </label>

        <button
          onClick={seed}
          disabled={busy}
          style={{
            padding: 12,
            fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Seeding..." : "Seed Event + 24 Seats"}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        >
          {result.ok ? (
            <>
              <div style={{ fontWeight: 800 }}>Seeded ✅</div>
              <div style={{ marginTop: 8 }}>
                Event ID: <code>{result.eventId}</code>
              </div>
              <div style={{ marginTop: 8, opacity: 0.85 }}>
                Example reservation link (we’ll make it real next):
              </div>
              <div style={{ marginTop: 6 }}>
                <code style={{ wordBreak: "break-all" }}>
                  {result.reservationUrlExample}
                </code>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800 }}>Error ❌</div>
              <div style={{ marginTop: 8 }}>
                <code style={{ wordBreak: "break-all" }}>{result.error}</code>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
