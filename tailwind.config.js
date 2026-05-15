/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shortlist: { light: '#EEF2FF', border: '#818CF8', text: '#4338CA' },
        applied:   { light: '#ECFDF5', border: '#34D399', text: '#065F46' },
        responded: { light: '#FFF7ED', border: '#FB923C', text: '#9A3412' },
        interview: { light: '#F0F9FF', border: '#38BDF8', text: '#0369A1' },
        rejected:  { light: '#FFF1F2', border: '#FB7185', text: '#9F1239' },
      },
    },
  },
  plugins: [],
}
