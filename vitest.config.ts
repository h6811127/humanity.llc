import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["worker/tests/**/*.test.ts"],
    environment: "node",
    server: {
      deps: {
        inline: ["@scure/base", "@noble/ed25519", "@noble/hashes", "canonicalize"],
      },
    },
  },
});
