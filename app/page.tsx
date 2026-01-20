"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export default function Home() {
  const [status, setStatus] = useState("Checking Firestore...");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "sanity"));
        setStatus(`Connected ✅ (sanity docs: ${snap.size})`);
      } catch (e: any) {
        setStatus(`Error ❌ ${e?.message ?? String(e)}`);
      }
    })();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Nightclub Seats</h1>
      <p>{status}</p>
    </main>
  );
}
