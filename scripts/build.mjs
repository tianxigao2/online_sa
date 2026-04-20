import { build } from "esbuild"
import { cp, mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const distDir = path.join(rootDir, "dist")

await rm(distDir, { recursive: true, force: true })
await mkdir(distDir, { recursive: true })

await Promise.all([
  build({
    entryPoints: [path.join(rootDir, "src/content/index.tsx")],
    outfile: path.join(distDir, "content.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    sourcemap: true,
    target: ["chrome109"],
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production")
    }
  }),
  build({
    entryPoints: [path.join(rootDir, "src/options/index.tsx")],
    outfile: path.join(distDir, "options.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    sourcemap: true,
    target: ["chrome109"],
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production")
    }
  }),
  build({
    entryPoints: [path.join(rootDir, "src/background/index.ts")],
    outfile: path.join(distDir, "background.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    sourcemap: true,
    target: ["chrome109"],
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production")
    }
  }),
  build({
    entryPoints: [path.join(rootDir, "src/standalone/index.tsx")],
    outfile: path.join(distDir, "standalone.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    sourcemap: true,
    target: ["chrome109"],
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production")
    }
  }),
  cp(path.join(rootDir, "public"), distDir, { recursive: true })
])

console.log(`Built extension into ${distDir}`)
