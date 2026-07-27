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
  redirects: {
    "/art": "/index",
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
