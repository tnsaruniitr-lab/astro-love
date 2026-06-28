import type { Config } from "tailwindcss";

// Colors are CSS variables (RGB channel triples) set per theme in globals.css,
// so every `text-cream` / `bg-gold/20` etc. re-themes automatically.
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: v("ink"),
        cosmos: v("cosmos"),
        panel: v("panel"),
        gold: v("gold"),
        goldbright: v("goldbright"),
        rose: v("rose"),
        teal: v("teal"),
        lilac: v("lilac"),
        haze: v("haze"),
        cream: v("cream"),
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", '"Times New Roman"', "serif"],
        body: ['"Inter"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
