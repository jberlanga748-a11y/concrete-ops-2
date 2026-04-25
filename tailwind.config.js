/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 18px 45px -24px rgba(15, 23, 42, 0.28)",
      },
      colors: {
        ops: {
          page: "#F4F8FC",
          navy: "#0F172A",
          blue: "#1D4ED8",
          sky: "#EFF6FF",
          border: "#DBEAFE",
          muted: "#64748B",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
