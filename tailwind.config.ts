import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: "#14231b",
        cream: "#f4f1df",
        lime: "#b9f548",
        moss: "#476a32",
        swamp: "#193526",
      },
      boxShadow: {
        card: "0 18px 60px rgba(12, 32, 20, 0.10)",
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        blink: "blink 5s infinite",
        ticker: "ticker 28s linear infinite",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        blink: {
          "0%,45%,48%,100%": { transform: "scaleY(1)" },
          "46%,47%": { transform: "scaleY(.08)" },
        },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
