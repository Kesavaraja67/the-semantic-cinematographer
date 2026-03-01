"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const features = [
  { icon: "🔍", label: "Auto-Zoom" },
  { icon: "🎨", label: "Live Filters" },
  { icon: "⚡", label: "Screen Shake" },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-[#07070f] flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Background glow blob */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.07) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center max-w-4xl"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-violet-500/20 text-violet-300 text-xs font-semibold tracking-widest uppercase"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          WeMakeDevs Vision AI Hackathon 2025
        </motion.div>

        {/* Hero title */}
        <h1
          className="font-black text-5xl sm:text-6xl md:text-7xl leading-[1.05] tracking-tight mb-6"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.65) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          The World&apos;s First<br />
          Real-Time AI<br />
          Cinematographer.
        </h1>

        {/* Tagline */}
        <p className="text-white/50 text-lg sm:text-xl max-w-xl leading-relaxed mb-10">
          Your camera is on. Your AI Director is watching.
          Every gesture, every word — directed in real time.
        </p>

        {/* CTA Button */}
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="mb-10"
        >
          <Link
            href="/studio"
            id="open-studio-btn"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-bold text-lg tracking-tight animate-glow-pulse"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
              boxShadow: "0 0 30px rgba(139,92,246,0.4)",
            }}
          >
            Open Studio
            <span className="text-xl">→</span>
          </Link>
        </motion.div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
              className="glass rounded-full px-4 py-2 text-xs text-white/60 flex items-center gap-2"
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom-right hackathon badge */}
      <div className="fixed bottom-5 right-5 z-20">
        <div className="glass rounded-full px-3 py-1.5 text-[10px] text-white/30">
          WeMakeDevs Vision AI Hackathon 2025
        </div>
      </div>
    </main>
  );
}
