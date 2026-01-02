import { defineConfig } from "astro/config"
import tailwind from "@astrojs/tailwind"
import react from "@astrojs/react"

// https://astro.build/config
import vercel from "@astrojs/vercel"

// https://astro.build/config

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
    react(),
  ],
  output: "server",
  adapter: vercel({
    webAnalytics: {
      enabled: false,
    },
  }),
  vite: {
    optimizeDeps: {
      include: ["@react-three/postprocessing", "@react-three/fiber", "three"],
      exclude: [],
      esbuildOptions: {
        target: "es2020",
      },
    },
    ssr: {
      noExternal: ["@react-three/postprocessing"],
    },
    resolve: {
      dedupe: ["three", "@react-three/fiber", "@react-three/postprocessing"],
    },
  },
})
