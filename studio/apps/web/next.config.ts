import type { NextConfig } from "next";
import path from "node:path";
const projectRoot=path.resolve(__dirname,"../../..");

const nextConfig: NextConfig = {
  /**
   * The editor is entirely client-side — no route handlers, no server actions,
   * no middleware, and no server image optimisation. Exporting it as static
   * files is therefore not a compromise: it is what the app already is, and it
   * keeps the local-first promise honest by making the build deployable to any
   * static host (or opened from a file share) rather than to one vendor.
   */
  output: "export",
  basePath: "/studio",
  trailingSlash: true,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,

  /**
   * Workspace packages ship raw TypeScript rather than a build step — one less
   * thing to run, and edits to a package are reflected instantly in dev.
   * Next must therefore compile them itself.
   */
  transpilePackages: [
    "@looplilt-studio/types",
    "@looplilt-studio/utils",
    "@looplilt-studio/timeline-engine",
    "@looplilt-studio/media-engine",
    "@looplilt-studio/animation-engine",
    "@looplilt-studio/render-engine",
    "@looplilt-studio/project-io",
    "@looplilt-studio/playback-engine",
    "@looplilt-studio/history-engine",
    "@looplilt-studio/mask-engine",
    "@looplilt-studio/caption-engine",
    "@looplilt-studio/color-engine",
    "@looplilt-studio/ui",
  ],
};

export default nextConfig;
