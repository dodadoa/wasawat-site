import { defineConfig } from "astro/config"
import tailwind from "@astrojs/tailwind"
import react from "@astrojs/react"
import vercel from "@astrojs/vercel"

// https://astro.build/config

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
  output: "server",
  // Astro's dev toolbar periodically re-scans/audits the page in the background,
  // which was re-triggering fetches for every work thumbnail on the home 3D plane
  // (visible as an endlessly growing "network.log" in the HUD). It's dev-only and
  // has no effect on production builds — disabled here to keep dev-mode network
  // activity honest. Flip to `true` if you want the toolbar back.
  devToolbar: { enabled: false },
  redirects: {
    "/art": "/work",
    "/index": "/work",
    "/art/vina-v-para-cartography": "/art/from-scratch-live-coding#vina-v",
  },
  adapter: vercel({
    webAnalytics: {
      enabled: false,
    },
  }),
  vite: {
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@react-three/postprocessing",
        "@react-three/fiber",
        "@react-three/drei",
        "three",
        "phaser",
      ],
      exclude: [],
      esbuildOptions: {
        target: "es2020",
      },
    },
    ssr: {
      noExternal: ["@react-three/postprocessing", "@react-three/drei", "detect-gpu"],
    },
    resolve: {
      dedupe: ["react", "react-dom", "three", "@react-three/fiber", "@react-three/postprocessing"],
    },
  },
})
