import fs from "fs";
import path from "path";
import { openApiSpec } from "../src/openapi";

const outputDir = path.join(__dirname, "../dist");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, "openapi.json");
fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));

console.log(`OpenAPI spec generated at ${outputPath}`);
