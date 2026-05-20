import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// SSR on Cloudflare Pages/Workers so edits in the kura admin appear without
// a rebuild. Public API responses are edge-cached on kura's side, so this
// stays cheap.
export default defineConfig({
  output: "server",
  adapter: cloudflare({ imageService: "passthrough" }),
});
