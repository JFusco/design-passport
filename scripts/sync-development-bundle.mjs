import { copyFile, mkdir } from "node:fs/promises";

await mkdir("development/dist", { recursive: true });
await Promise.all([
  copyFile("dist/code.js", "development/dist/code.js"),
  copyFile("dist/index.html", "development/dist/index.html"),
]);
