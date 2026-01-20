"use client";

import { useMemo, useState } from "react";
import { db } from "../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const EVENT_ID = "nightclub-2026-02";

function uuidv4() {
  // browser-safe UUID
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function AdminCreateReservation() {
  const [buyerLabel, setBuyerLabel] = useState("");
  const [seatCount, setSeatCount] = useState(2);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seatCountOptions = useMemo(() => [1,2,3,4,5,6,7,8], []);

  async function createReservation() {
    setBusy(true);
    setError(null);
    setCreatedLink(null);

    try {
      const token = uuidv4();

      await setDoc(doc(db, "events", EVENT_ID, "reservations", token), {
        token,
        buyerLabel: buyerLabel.trim(),
        seatCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const link = `${window.location.origin}/r/${token}?event=${encodeURIComponent(
        EVENT_ID
      )}`;
      setCreatedLink(link);
      setBuyerLabel("");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 720 }}>
      <h1>Create Reservation Link</h1>
      <p>
        Event: <code>{EVENT_ID}</code>
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label>
          <div style={{ fontWeight: 700 }}>Buyer label (optional)</div>
          <input
            value={buyerLabel}
            onChange={(e) => setBuyerLabel(e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="John S. / Venmo @john / etc"
          />
        </label>

        <label>
          <div style={{ fontWeight: 700 }}>Seats purchased</div>
          <select
            value={seatCount}
            onChange={(e) => setSeatCount(Number(e.target.value))}
            style={{ width: "100%", padding: 10 }}
          >
            {seatCountOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={createReservation}
          disabled={busy}
          style={{ padding: 12, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}
        >
          {busy ? "Creating..." : "Create Link"}
        </button>
      </div>

      {createdLink && (
        <div style={{ marginTop: 18, padding: 14, border: "1px solid #ccc", borderRadius: 8 }}>
          <div style={{ fontWeight: 800 }}>Link created ✅</div>
          <div style={{ marginTop: 10 }}>
            <code style={{ wordBreak: "break-all" }}>{createdLink}</code>
          </div>
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => navigator.clipboard.writeText(createdLink)}
              style={{ padding: 10, fontWeight: 700, cursor: "pointer" }}
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 18, padding: 14, border: "1px solid #f99", borderRadius: 8 }}>
          <div style={{ fontWeight: 800 }}>Error ❌</div>
          <code style={{ wordBreak: "break-all" }}>{error}</code>
        </div>
      )}
    </main>
  );
}
