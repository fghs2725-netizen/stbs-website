import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "#090909", signal: "#f7c600", steel: "#1b1b1b" },
      fontFamily: { sans: ["var(--font-manrope)", "sans-serif"], display: ["var(--font-oswald)", "sans-serif"] },
      backgroundImage: { "industrial-grid": "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)" },
    },
  },
  plugins: [],
} satisfies Config;
