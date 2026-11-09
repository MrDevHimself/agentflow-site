import { defineConfig } from "astro/config";

// On Netlify, process.env.URL is your live site address (used for link-preview images).
// Redirects (like /thankyou -> /thank-you) live in netlify.toml.
export default defineConfig({
  site: process.env.URL || "https://agentflowmedia.netlify.app",
});
