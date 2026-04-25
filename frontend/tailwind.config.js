/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette
        brand: {
          50:  "#f0eeff",
          100: "#e0dcff",
          200: "#c4baff",
          300: "#a898ff",
          400: "#8c76f8",
          500: "#7c6af7", // primary
          600: "#6b58e8",
          700: "#5846c9",
          800: "#4535a0",
          900: "#322577",
        },
        // Surface / background scale
        surface: {
          base:   "#0f1117",
          raised: "#1a1d27",
          overlay:"#252836",
          border: "#2d3148",
        },
        // Semantic text
        text: {
          primary:   "#e2e8f0",
          secondary: "#94a3b8",
          muted:     "#64748b",
        },
        // Status colors
        success: { DEFAULT: "#4ade80", bg: "#14532d", border: "#166534" },
        error:   { DEFAULT: "#f87171", bg: "#450a0a", border: "#7f1d1d" },
        warning: { DEFAULT: "#fb923c", bg: "#451a03", border: "#7c2d12" },
        info:    { DEFAULT: "#a5b4fc", bg: "#1e1b4b", border: "#312e81" },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        xs:   ["0.75rem",  { lineHeight: "1rem" }],
        sm:   ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem",     { lineHeight: "1.5rem" }],
        lg:   ["1.125rem", { lineHeight: "1.75rem" }],
        xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
        "2xl":["1.5rem",   { lineHeight: "2rem" }],
        "3xl":["1.875rem", { lineHeight: "2.25rem" }],
        "4xl":["2.25rem",  { lineHeight: "2.5rem" }],
      },
      spacing: {
        // Extends default Tailwind spacing; key values documented here
        // 1=4px  2=8px  3=12px  4=16px  5=20px  6=24px  8=32px  10=40px
      },
      borderRadius: {
        sm:  "6px",
        DEFAULT: "8px",
        md:  "10px",
        lg:  "12px",
        xl:  "16px",
        full:"9999px",
      },
    },
  },
  plugins: [],
};
