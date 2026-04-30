import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow building with workspace packages that ship raw TS source.
  transpilePackages: [
    "@novelwright/types",
    "@novelwright/llm-adapter",
    "@novelwright/prompt-assembler",
  ],
  experimental: {
    // Enable streaming responses from API routes.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // The PromptAssembler reads files from the monorepo root at runtime; allow Next to trace them.
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  // Files outside the project that API routes read at runtime — Next.js can't trace fs.readFile
  // calls statically, so we explicitly tell it to bundle these into the serverless deployment.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "../../CLAUDE.md",
      "../../.claude/commands/**/*.md",
      "../../.agent/knowledge/**/*.md",
    ],
  },
};

export default nextConfig;
