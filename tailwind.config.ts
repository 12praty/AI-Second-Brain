import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  darkMode: "class",
  theme: {
    container: { center: true, padding: "2rem" },
    extend: {
      colors: {
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
          border: "var(--accent-border)",
        },
        bg: {
          base: "var(--bg-base)",
          card: "var(--bg-card)",
          elevated: "var(--bg-elevated)",
          border: "var(--bg-border)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        note: "var(--note-color)",
        url: "var(--url-color)",
        pdf: "var(--pdf-color)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.8125rem", { lineHeight: "1.5" }],
        base: ["0.875rem", { lineHeight: "1.5" }],
        lg: ["1rem", { lineHeight: "1.45" }],
        xl: ["1.125rem", { lineHeight: "1.3" }],
        "2xl": ["1.375rem", { lineHeight: "1.25" }],
        "3xl": ["1.75rem", { lineHeight: "1.25" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      keyframes: {
        pageIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        messageIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        pageIn: "pageIn 200ms ease-out",
        messageIn: "messageIn 180ms ease-out",
        shimmer: "shimmer 1.8s infinite linear",
        fadeIn: "fadeIn 200ms ease-out",
        slideUp: "slideUp 250ms ease-out",
        blink: "blink 1s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
