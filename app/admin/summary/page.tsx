"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";

const DEFAULT_EVENT_ID = "nightclub-2026-02";

type Seat = {
  seatId: string; // "T1-S1"
  claimedBy: string | null;
  guestName: string;
  spirit: string;
};

function parseSeatId(seatId: string) {
  const m = seatId.match(/^T(\d+)-S(\d+)$/);
  return m ? { t: Number(m[1]), s: Number(m[2]) } : { t: 999, s: 999 };
}

function seatSort(a: Seat, b: Seat) {
  const A = parseSeatId(a.seatId);
  const B = parseSeatId(b.seatId);
  return A.t !== B.t ? A.t - B.t : A.s - B.s;
}

function toCSV(rows: { table: number; seat: string; name: string; spirit: string }[]) {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Table", "Seat", "Guest", "Spirit"].map(esc).join(",");
  const lines = rows.map((r) =>
    [String(r.table), r.seat, r.name, r.spirit].map((x) => esc(String(x))).join(",")
  );
  return [header, ...lines].join("\n");
}

export default function AdminSummaryPage() {
  const [eventId, setEventId] = useState(DEFAULT_EVENT_ID);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    const seatsCol = collection(db, "events", eventId, "seats");
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
  }, [eventId]);

  const claimed = useMemo(() => seats.filter((s) => s.claimedBy), [seats]);

  const rows = useMemo(() => {
    return claimed
      .map((s) => {
        const { t } = parseSeatId(s.seatId);
        return {
          table: t,
          seat: s.seatId,
          name: (s.guestName || "").trim(),
          spirit: (s.spirit || "").trim(),
        };
      })
      .sort((a, b) => {
        if (a.table !== b.table) return a.table - b.table;
        return seatSort({ seatId: a.seat } as Seat, { seatId: b.seat } as Seat);
      });
  }, [claimed]);

  const byTable = useMemo(() => {
    const map = new Map<number, Seat[]>();
    for (const s of claimed) {
      const { t } = parseSeatId(s.seatId);
      map.set(t, [...(map.get(t) ?? []), s]);
    }
    // sort seats within each table
    for (const [t, list] of map.entries()) map.set(t, list.sort(seatSort));
    return map;
  }, [claimed]);

  const spiritCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of claimed) {
      const key = (s.spirit || "—").trim() || "—";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    // sort by count desc
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [claimed]);

  const copyText = useMemo(() => {
    const lines: string[] = [];
    for (const table of [1, 2, 3]) {
      const list = byTable.get(table) ?? [];
      lines.push(`TABLE ${table}`);
      if (!list.length) {
        lines.push("  (no claimed seats)");
      } else {
        for (const s of list) {
          const name = (s.guestName || "").trim() || "(no name)";
          const spirit = (s.spirit || "").trim() || "(no spirit)";
          lines.push(`  ${s.seatId}: ${name} — ${spirit}`);
        }
      }
      lines.push("");
    }

    lines.push("SPIRIT COUNTS");
    for (const [sp, n] of spiritCounts) lines.push(`  ${sp}: ${n}`);
    return lines.join("\n");
  }, [byTable, spiritCounts]);

  function downloadCSV() {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventId}-seats.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(copyText);
    alert("Copied summary to clipboard ✅");
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 980 }}>
      <h1>Admin Summary</h1>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700 }}>Event ID</span>
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            style={{ padding: 10, minWidth: 260 }}
          />
        </label>

        <button onClick={copyToClipboard} style={{ padding: 10, fontWeight: 800, cursor: "pointer" }}>
          Copy summary
        </button>

        <button onClick={downloadCSV} style={{ padding: 10, fontWeight: 800, cursor: "pointer" }}>
          Download CSV
        </button>
      </div>

      <div style={{ marginTop: 12, opacity: 0.85 }}>
        Claimed seats: <b>{claimed.length}</b> / {seats.length || 24}
      </div>

      {loading ? (
        <p style={{ marginTop: 18 }}>Loading…</p>
      ) : err ? (
        <p style={{ marginTop: 18, color: "crimson" }}>{err}</p>
      ) : (
        <>
          {/* Spirit counts */}
          <section style={{ marginTop: 18, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <h2 style={{ margin: 0 }}>Spirit counts</h2>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {spiritCounts.length ? (
                spiritCounts.map(([sp, n]) => (
                  <div key={sp} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{sp}</span>
                    <b>{n}</b>
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.8 }}>(none yet)</div>
              )}
            </div>
          </section>

          {/* Tables */}
          {[1, 2, 3].map((t) => {
            const list = byTable.get(t) ?? [];
            return (
              <section key={t} style={{ marginTop: 18, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                <h2 style={{ margin: 0 }}>Table {t}</h2>

                {list.length === 0 ? (
                  <p style={{ marginTop: 10, opacity: 0.8 }}>(no claimed seats)</p>
                ) : (
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    {list.map((s) => (
                      <div
                        key={s.seatId}
                        style={{
                          padding: 12,
                          border: "1px solid #e5e7eb",
                          borderRadius: 10,
                          display: "grid",
                          gridTemplateColumns: "120px 1fr 220px",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{s.seatId}</div>
                        <div style={{ fontWeight: 700 }}>
                          {(s.guestName || "").trim() || <span style={{ opacity: 0.6 }}>(no name)</span>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {(s.spirit || "").trim() || <span style={{ opacity: 0.6 }}>(no spirit)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
