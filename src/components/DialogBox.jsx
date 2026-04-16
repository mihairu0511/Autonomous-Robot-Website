import { useEffect, useRef, useState, useCallback } from "react";
import '../App.css'

// ─── Animal Crossing–style dialog box ────────────────────────────────────────
const DIALOG_CHAR_INTERVAL_MS = 24; // ms per character

export default function DialogBox({ text, onContinue, visible }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const tickRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Tiny synth "blip" using Web Audio API — no file needed
  const playBlip = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      // Vary pitch slightly for variety
      osc.frequency.value = 520 + 67 + Math.random() * 160;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!visible || !text) return;
    setDisplayed("");
    setDone(false);
    let idx = 0;

    tickRef.current = setInterval(() => {
      idx++;
      setDisplayed(text.slice(0, idx));
      if (text[idx - 1] && text[idx - 1] !== " " && text[idx - 1] !== "\n") {
        playBlip();
      }
      if (idx >= text.length) {
        clearInterval(tickRef.current);
        setDone(true);
      }
    }, DIALOG_CHAR_INTERVAL_MS);

    return () => clearInterval(tickRef.current);
  }, [text, visible, playBlip]);

  // Space to continue
  useEffect(() => {
    if (!done || !visible) return;
    const handler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        onContinue?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [done, visible, onContinue]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "32px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(660px, calc(100vw - 40px))",
        background: "rgba(10,14,20,0.93)",
        border: "2px solid rgba(255,255,255,0.18)",
        borderRadius: "18px",
        padding: "40px 48px",
        color: "white",
        fontFamily: "'Jua', sans-serif",
        fontSize: "1.2rem",
        lineHeight: 1.65,
        zIndex: 50,
        boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        userSelect: "none",
        whiteSpace: "pre-wrap",
      }}
      onClick={() => { if (done) onContinue?.(); }}
    >
      {/* Robot avatar pip */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "24px" }}>
        {/* <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg,#7ec601,#3a7a00)",
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.2rem",
        }}>🤖</div> */}
        <div style={{ flex: 1 }}>
          {/* <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", color: "#7ec601", marginBottom: "6px", fontWeight: 700 }}>STELLA</div> */}
          <div>{displayed}</div>
        </div>
      </div>

      {done && (
        <div style={{
          textAlign: "right",
          marginTop: "10px",
          fontSize: "0.78rem",
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.06em",
        //   animation: "blink 1s step-start infinite",
        }}>
          SPACE / TAP TO CONTINUE ▶
        </div>
      )}
    </div>
  );
}