"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type Reservation = {
  token: string;
  buyerLabel?: string;
  seatCount: number;
};

type Seat = {
  seatId: string; // e.g. "T2-S5"
  claimedBy: string | null;
  guestName: string;
  spirit: string;
};

const DEFAULT_EVENT_ID = "nightclub-2026-02";
const EVENT_LABEL = "SClass Felt 2/13/26";

const SPIRITS = [
  "Vodka",
  "Tequila",
  "Gin",
  "Rum",
  "Whiskey/Bourbon",
  "Scotch",
  "Champagne",
  "No preference",
];

function seatNumberFromId(seatId: string) {
  const m = seatId.match(/^T\d+-S(\d+)$/);
  return m ? Number(m[1]) : 999;
}

function tableNumberFromId(seatId: string) {
  const m = seatId.match(/^T(\d+)-S\d+$/);
  return m ? Number(m[1]) : 999;
}

function humanSeatLabel(seatId: string) {
  const m = seatId.match(/^T(\d+)-S(\d+)$/);
  if (!m) return seatId;
  return `Table ${Number(m[1])}, Seat ${Number(m[2])}`;
}

function shortName(name: string, max = 10) {
  const n = (name || "").trim();
  if (!n) return "";
  if (n.length <= max) return n;
  return n.slice(0, max - 1) + "…";
}

function seatSort(a: Seat, b: Seat) {
  const At = tableNumberFromId(a.seatId);
  const Bt = tableNumberFromId(b.seatId);
  if (At !== Bt) return At - Bt;
  return seatNumberFromId(a.seatId) - seatNumberFromId(b.seatId);
}

function TableCircle({
  tableNum,
  seats,
  token,
  toggleSeat,
}: {
  tableNum: number;
  seats: Seat[];
  token: string;
  toggleSeat: (seatId: string) => void;
}) {
  // 8 seats around a circle. Index 0 is top, clockwise.
  const positions = [
    { left: 50, top: 10 }, // S1 top
    { left: 80, top: 18 }, // S2 top-right
    { left: 92, top: 50 }, // S3 right
    { left: 80, top: 82 }, // S4 bottom-right
    { left: 50, top: 90 }, // S5 bottom
    { left: 20, top: 82 }, // S6 bottom-left
    { left: 8, top: 50 }, // S7 left
    { left: 20, top: 18 }, // S8 top-left
  ];

  const sorted = [...seats].sort(
    (a, b) => seatNumberFromId(a.seatId) - seatNumberFromId(b.seatId)
  );

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontWeight: 1000, marginBottom: 10, color: "#111827" }}>
        Table {tableNum}
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          aspectRatio: "1 / 1",
          margin: "0 auto",
          border: "1px solid #111827",
          borderRadius: 16,
          background:
            "radial-gradient(circle at 50% 45%, #111827 0%, #0b1220 55%, #070b12 100%)",
        }}
      >
        {/* Center table */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "46%",
            height: "46%",
            borderRadius: 999,
            border: "2px solid #ffffff",
            background: "#111827",
            color: "#ffffff",
            display: "grid",
            placeItems: "center",
            fontWeight: 1000,
            letterSpacing: 0.5,
            textAlign: "center",
            padding: 10,
          }}
        >
          TABLE {tableNum}
        </div>

        {/* Seats */}
        {sorted.map((s, idx) => {
          const p = positions[idx] ?? positions[0];
          const isMine = s.claimedBy === token;
          const isFree = s.claimedBy === null;

          const bg = isMine ? "#16a34a" : isFree ? "#e5e7eb" : "#dc2626"; // green / gray / red
          const textColor = isMine || !isFree ? "#ffffff" : "#111827";
          const ring = isMine
            ? "0 0 0 2px #ffffff"
            : isFree
            ? "0 0 0 2px #111827"
            : "0 0 0 2px #ffffff";

          const cursor = isFree || isMine ? "pointer" : "not-allowed";

          const seatNum = seatNumberFromId(s.seatId);
          const name = (s.guestName || "").trim();
          const displayName = shortName(name, 10);

          return (
            <button
              key={s.seatId}
              onClick={() => (isFree || isMine) && toggleSeat(s.seatId)}
              style={{
                position: "absolute",
                left: `${p.left}%`,
                top: `${p.top}%`,
                transform: "translate(-50%, -50%)",
                width: 50,
                height: 50,
                borderRadius: 999,
                background: bg,
                color: textColor,
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: ring,
                cursor,
                fontWeight: 1000,
                padding: 4,
                lineHeight: 1.05,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
              }}
              title={
                isMine
                  ? `${s.seatId} (yours)`
                  : isFree
                  ? `${s.seatId} (open)`
                  : `${s.seatId} (taken)${name ? ` — ${name}` : ""}`
              }
            >
              <div style={{ fontSize: 12, fontWeight: 1000 }}>S{seatNum}</div>

              {/* Show name only when taken by someone else */}
              {!isFree && !isMine ? (
                <div style={{ fontSize: 9, fontWeight: 900 }}>
                  {displayName || "Taken"}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 12,
        }}
      >
        <span style={{ color: "#16a34a", fontWeight: 800 }}>● Yours</span>
        <span style={{ color: "#6b7280", fontWeight: 800 }}>● Open</span>
        <span style={{ color: "#dc2626", fontWeight: 800 }}>● Taken</span>
      </div>
    </div>
  );
}

export default function ReservationClient({
  token,
  eventId,
}: {
  token: string;
  eventId?: string;
}) {
  const resolvedEventId = eventId || DEFAULT_EVENT_ID;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const mySeats = useMemo(
    () => seats.filter((s) => s.claimedBy === token).sort(seatSort),
    [seats, token]
  );

  const remaining = useMemo(() => {
    if (!reservation) return 0;
    return Math.max(0, reservation.seatCount - mySeats.length);
  }, [reservation, mySeats.length]);

  useEffect(() => {
    let unsubSeats: (() => void) | null = null;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const resRef = doc(db, "events", resolvedEventId, "reservations", token);
        const resSnap = await getDoc(resRef);

        if (!resSnap.exists()) {
          setErr("That link is not valid (reservation not found).");
          setLoading(false);
          return;
        }

        setReservation(resSnap.data() as Reservation);

        const seatsCol = collection(db, "events", resolvedEventId, "seats");
        unsubSeats = onSnapshot(
          seatsCol,
          (snap) => {
            const all = snap.docs.map((d) => d.data() as Seat).sort(seatSort);
            setSeats(all);
            setLoading(false);
          },
          (e) => {
            setErr(e?.message ?? String(e));
            setLoading(false);
          }
        );
      } catch (e: any) {
        setErr(e?.message ?? String(e));
        setLoading(false);
      }
    })();

    return () => {
      if (unsubSeats) unsubSeats();
    };
  }, [resolvedEventId, token]);

  async function toggleSeat(seatId: string) {
    if (!reservation) return;

    const seatRef = doc(db, "events", resolvedEventId, "seats", seatId);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(seatRef);
        if (!snap.exists()) throw new Error("Seat not found.");
        const seat = snap.data() as Seat;

        const isMine = seat.claimedBy === token;
        const isFree = seat.claimedBy === null;

        if (isMine) {
          // unclaim
          tx.update(seatRef, {
            claimedBy: null,
            guestName: "",
            spirit: "",
            updatedAt: serverTimestamp(),
          });
          return;
        }

        if (!isFree) throw new Error("That seat is already taken.");

        // enforce limit (uses current local snapshot; good enough for this use case)
        const currentlyMine = seats.filter((s) => s.claimedBy === token).length;
        if (currentlyMine >= reservation.seatCount) {
          throw new Error(
            `You can only claim ${reservation.seatCount} seat(s). Unclaim one first.`
          );
        }

        tx.update(seatRef, { claimedBy: token, updatedAt: serverTimestamp() });
      });
    } catch (e: any) {
      alert(e?.message ?? String(e));
    }
  }

  async function updateSeatField(
    seatId: string,
    fields: Partial<Pick<Seat, "guestName" | "spirit">>
  ) {
    const seatRef = doc(db, "events", resolvedEventId, "seats", seatId);
    await updateDoc(seatRef, { ...fields, updatedAt: serverTimestamp() });
  }

  if (loading) {
    return (
      <main style={{ padding: 24, fontFamily: "sans-serif" }}>Loading…</main>
    );
  }

  if (err) {
    return (
      <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 720 }}>
        <h1>Reservation</h1>
        <p style={{ color: "crimson" }}>{err}</p>
      </main>
    );
  }

  if (!reservation) return null;

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "sans-serif",
        maxWidth: 980,
        color: "#111827",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <h1>Choose Your Seats</h1>

      <div style={{ marginTop: 6, color: "#111827" }}>
        Event: <b>{EVENT_LABEL}</b>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #111827",
          borderRadius: 12,
          background: "#ffffff",
        }}
      >
        <div>
          Seats purchased: <b>{reservation.seatCount}</b>{" "}
          {reservation.buyerLabel ? (
            <>
              · Buyer: <b>{reservation.buyerLabel}</b>
            </>
          ) : null}
        </div>

        <div style={{ marginTop: 6 }}>
          Your claimed seats:{" "}
          <b>
            {mySeats.map((s) => humanSeatLabel(s.seatId)).join(", ") ||
              "None yet"}
          </b>
        </div>

        <div style={{ marginTop: 6 }}>
          Remaining: <b>{remaining}</b>
        </div>

        <div style={{ marginTop: 10, color: "#374151" }}>
          Tap a seat to claim/unclaim. Seats claimed by others are locked.
        </div>
      </div>

      {/* Your Guests ABOVE the Venue Layout */}
      <h2 style={{ marginTop: 18 }}>Your Guests</h2>
      {mySeats.length === 0 ? (
        <p style={{ color: "#374151" }}>
          Claim seats below to add guest names and spirit preferences.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          {mySeats.map((s) => (
            <div
              key={s.seatId}
              style={{
                padding: 12,
                border: "1px solid #111827",
                borderRadius: 12,
                background: "#ffffff",
              }}
            >
              <div style={{ fontWeight: 900 }}>{humanSeatLabel(s.seatId)}</div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 220px",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <input
                  value={s.guestName || ""}
                  placeholder="Guest name"
                  onChange={(e) =>
                    updateSeatField(s.seatId, { guestName: e.target.value })
                  }
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #111827",
                  }}
                />

                <select
                  value={s.spirit || ""}
                  onChange={(e) =>
                    updateSeatField(s.seatId, { spirit: e.target.value })
                  }
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #111827",
                  }}
                >
                  <option value="">Spirit preference</option>
                  {SPIRITS.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Venue map */}
      <section style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 10 }}>Venue Layout</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          {/* DJ Booth (top-left) */}
          <div
            style={{
              border: "2px dashed #111827",
              borderRadius: 16,
              padding: 16,
              background: "#fff7ed",
              display: "grid",
              placeItems: "center",
              minHeight: 260,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 1000, fontSize: 18 }}>DJ BOOTH</div>
              <div style={{ marginTop: 6, color: "#374151", fontSize: 12 }}>
                (top-left corner reference)
              </div>
            </div>
          </div>

          {/* Top-right table */}
          <div
            style={{
              border: "2px solid #111827",
              borderRadius: 16,
              background: "#f8fafc",
            }}
          >
            <TableCircle
              tableNum={1}
              seats={seats.filter((s) => tableNumberFromId(s.seatId) === 1)}
              token={token}
              toggleSeat={toggleSeat}
            />
          </div>

          {/* Bottom-left table */}
          <div
            style={{
              border: "2px solid #111827",
              borderRadius: 16,
              background: "#f8fafc",
            }}
          >
            <TableCircle
              tableNum={2}
              seats={seats.filter((s) => tableNumberFromId(s.seatId) === 2)}
              token={token}
              toggleSeat={toggleSeat}
            />
          </div>

          {/* Bottom-right table */}
          <div
            style={{
              border: "2px solid #111827",
              borderRadius: 16,
              background: "#f8fafc",
            }}
          >
            <TableCircle
              tableNum={3}
              seats={seats.filter((s) => tableNumberFromId(s.seatId) === 3)}
              token={token}
              toggleSeat={toggleSeat}
            />
          </div>
        </div>

        <div style={{ marginTop: 10, color: "#374151", fontSize: 12 }}>
          Tip: Tap a seat to claim/unclaim. Seats taken by others aren’t
          clickable.
        </div>
      </section>
    </main>
  );
}
