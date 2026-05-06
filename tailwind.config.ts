import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        piche: {
          gold: "#c7b157",
          goldDark: "#a89337",
          navy: "#101827",
          charcoal: "#17202d",
          ink: "#111827",
          muted: "#667085",
          line: "#e5e7eb",
          bg: "#f5f6f8"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(16, 24, 39, 0.08)"
      },
      borderRadius: {
        app: "8px"
      }
    }
  },
  plugins: []
};

export default config;
