"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

type Seat = {
  seatId: string; // "T2-S5"
  claimedBy: string | null;
  guestName: string;
  spirit: string;
};

const EVENT_ID = "nightclub-2026-02";
const EVENT_LABEL = "SClass Felt 2/13/26";

function seatNumberFromId(seatId: string) {
  const m = seatId.match(/^T\d+-S(\d+)$/);
  return m ? Number(m[1]) : 999;
}

function tableNumberFromId(seatId: string) {
  const m = seatId.match(/^T(\d+)-S\d+$/);
  return m ? Number(m[1]) : 999;
}

function seatSort(a: Seat, b: Seat) {
  const At = tableNumberFromId(a.seatId);
  const Bt = tableNumberFromId(b.seatId);
  if (At !== Bt) return At - Bt;
  return seatNumberFromId(a.seatId) - seatNumberFromId(b.seatId);
}

function shortName(name: string, max = 10) {
  const n = (name || "").trim();
  if (!n) return "";
  if (n.length <= max) return n;
  return n.slice(0, max - 1) + "…";
}

function TableCircleReadOnly({ tableNum, seats }: { tableNum: number; seats: Seat[] }) {
  const positions = [
    { left: 50, top: 10 },
    { left: 80, top: 18 },
    { left: 92, top: 50 },
    { left: 80, top: 82 },
    { left: 50, top: 90 },
    { left: 20, top: 82 },
    { left: 8, top: 50 },
    { left: 20, top: 18 },
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

        {sorted.map((s, idx) => {
          const p = positions[idx] ?? positions[0];
          const isFree = s.claimedBy === null;

          const bg = isFree ? "#e5e7eb" : "#dc2626";
          const textColor = isFree ? "#111827" : "#ffffff";
          const ring = isFree ? "0 0 0 2px #111827" : "0 0 0 2px #ffffff";

          const seatNum = seatNumberFromId(s.seatId);
          const name = (s.guestName || "").trim();
          const displayName = shortName(name, 10);

          return (
            <div
              key={s.seatId}
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
                fontWeight: 1000,
                padding: 4,
                lineHeight: 1.05,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
              }}
              title={
                isFree
                  ? `${s.seatId} (open)`
                  : `${s.seatId} (taken)${name ? ` — ${name}` : ""}`
              }
            >
              <div style={{ fontSize: 12, fontWeight: 1000 }}>S{seatNum}</div>
              {!isFree ? (
                <div style={{ fontSize: 9, fontWeight: 900 }}>
                  {displayName || "Taken"}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
        <span style={{ color: "#6b7280", fontWeight: 800 }}>● Open</span>
        <span style={{ color: "#dc2626", fontWeight: 800 }}>● Taken</span>
      </div>
    </div>
  );
}

export default function ViewOnlyClient() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    const seatsCol = collection(db, "events", EVENT_ID, "seats");
    const unsub = onSnapshot(
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

    return () => unsub();
  }, []);

  const claimedCount = useMemo(() => seats.filter((s) => s.claimedBy).length, [seats]);

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
      <h1>Current Table Setup</h1>
      <div style={{ marginTop: 6 }}>
        Event: <b>{EVENT_LABEL}</b>
      </div>
      <div style={{ marginTop: 8, color: "#374151" }}>
        Claimed seats: <b>{claimedCount}</b> / {seats.length || 24}
      </div>

      {loading ? (
        <p style={{ marginTop: 18 }}>Loading…</p>
      ) : err ? (
        <p style={{ marginTop: 18, color: "crimson" }}>{err}</p>
      ) : (
        <section style={{ marginTop: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
              gap: 14,
              alignItems: "stretch",
            }}
          >
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

            <div style={{ border: "2px solid #111827", borderRadius: 16, background: "#f8fafc" }}>
              <TableCircleReadOnly
                tableNum={1}
                seats={seats.filter((s) => tableNumberFromId(s.seatId) === 1)}
              />
            </div>

            <div style={{ border: "2px solid #111827", borderRadius: 16, background: "#f8fafc" }}>
              <TableCircleReadOnly
                tableNum={2}
                seats={seats.filter((s) => tableNumberFromId(s.seatId) === 2)}
              />
            </div>

            <div style={{ border: "2px solid #111827", borderRadius: 16, background: "#f8fafc" }}>
              <TableCircleReadOnly
                tableNum={3}
                seats={seats.filter((s) => tableNumberFromId(s.seatId) === 3)}
              />
            </div>
          </div>

          <div style={{ marginTop: 10, color: "#374151", fontSize: 12 }}>
            View-only. No edits from this page.
          </div>
        </section>
      )}
    </main>
  );
}
