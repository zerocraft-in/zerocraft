import shared from "../../packages/tailwind-config/tailwind.config";
export default {
  ...shared,
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
};
