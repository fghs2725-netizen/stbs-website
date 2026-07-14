import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#090909",
        signal: "#f7c600",
        steel: "#1b1b1b",
        surface: "#0b0b0b",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        display: ["var(--font-oswald)", "system-ui", "sans-serif"],
      },
      spacing: {
        "1": "0.5rem",
        "2": "0.75rem",
        "3": "1rem",
        "4": "1.5rem",
        "5": "2rem",
        "6": "3rem",
        "7": "4rem",
        "8": "6rem",
        "9": "8rem",
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.875rem",
        xl: "1.125rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(247,198,0,0.25), 0 18px 50px -20px rgba(247,198,0,0.35)",
      },
      backgroundImage: {
        "industrial-grid": "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
