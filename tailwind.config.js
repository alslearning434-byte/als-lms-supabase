/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: { 400: "#2B4C75", 500: "#1E3A5F", 600: "#162D4A", 700: "#0F2035" },
        primary: { DEFAULT: "#2563eb", 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#2563eb", 600: "#1d4ed8", 700: "#1e40af" }
      }
    }
  },
  plugins: []
}
