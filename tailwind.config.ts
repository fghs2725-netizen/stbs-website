import type { Config } from "tailwindcss";

export default {
  // Touch devices fire :hover on tap and leave it stuck until you tap elsewhere.
  // This compiles every hover: variant behind @media (hover: hover) instead.
  future: { hoverOnlyWhenSupported: true },
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Water theme aliases. `signal` remains as a compatibility name for
        // existing components, so all current CTAs and accents share one token.
        ink: "#102235",
        signal: "#1677a8",
        steel: "#123b59",
        surface: "#0b1f33",
        water: { primary: "#1677a8", dark: "#0d537a", accent: "#56c5d5", light: "#edf4f3", text: "#102235", deep: "#07131f" },

        // Public design-system tokens (values live in app/globals.css :root). Namespaced
        // under "stbs" because `ink`/`surface` above already exist with other meanings.
        stbs: {
          ink: "var(--ink)", body: "var(--body)", muted: "var(--muted)", hairline: "var(--hairline)",
          "hairline-strong": "var(--hairline-strong)", surface: "var(--surface)", "surface-alt": "var(--surface-alt)",
          "brand-deep": "var(--brand-deep)", "brand-mid": "var(--brand-mid)", accent: "var(--accent)", verified: "var(--verified)",
          "ink-on-dark": "var(--ink-on-dark)", "muted-on-dark": "var(--muted-on-dark)", "hairline-on-dark": "var(--hairline-on-dark)",
        },

        // Document system colors
        navy: {
          50: "#eef4ff",
          100: "#d9e5ff",
          200: "#bccdff",
          300: "#8eaaff",
          400: "#597bff",
          500: "#334bff",
          600: "#1e3a5f",
          700: "#1a2f4e",
          800: "#162640",
          900: "#0f1b2e",
          950: "#0a1220",
        },
        gold: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#f7c600",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
        },
        admin: {
          bg: "#090909",
          card: "#111111",
          border: "rgba(255,255,255,0.06)",
          hover: "rgba(255,255,255,0.04)",
          text: "#e2e8f0",
          muted: "#64748b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "Archivo", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        display: ["Noto Sans", "system-ui", "sans-serif"],
      },
      spacing: {
        // 8px scale for the public design system: p-u2 = 16px, gap-u3 = 24px, py-u7 = 56px, ...
        u1: "8px", u2: "16px", u3: "24px", u4: "32px", u5: "40px", u6: "48px", u7: "56px",
        u8: "64px", u9: "72px", u10: "80px", u11: "88px", u12: "96px", u13: "104px", u14: "112px",
        "1": "0.25rem", "2": "0.5rem", "3": "0.75rem", "4": "1rem", "5": "1.5rem", "6": "2rem", "7": "3rem", "8": "3rem", "9": "3rem",
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
        "card-dark": "0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)",
        "card-light": "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
        "page": "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
        "viewer": "0 0 0 1px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.1)",
      },
      backgroundImage: {
        "industrial-grid":
          "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #0d537a 0%, #56c5d5 100%)",
        "navy-gradient":
          "linear-gradient(135deg, #1e3a5f 0%, #0f1b2e 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "slide-in-left": "slide-in-left 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.3s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;
