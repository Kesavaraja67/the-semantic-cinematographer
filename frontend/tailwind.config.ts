import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translate(0,0) rotate(0deg)" },
          "15%": { transform: "translate(-6px,3px) rotate(-0.5deg)" },
          "30%": { transform: "translate(5px,-3px) rotate(0.5deg)" },
          "45%": { transform: "translate(-4px,4px) rotate(-0.3deg)" },
          "60%": { transform: "translate(4px,-2px) rotate(0.3deg)" },
          "75%": { transform: "translate(-2px,2px) rotate(-0.2deg)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139,92,246,0.4)" },
          "50%": { boxShadow: "0 0 50px rgba(139,92,246,0.8), 0 0 80px rgba(236,72,153,0.3)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        shake: "shake 0.4s cubic-bezier(0.36,0.07,0.19,0.97)",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
