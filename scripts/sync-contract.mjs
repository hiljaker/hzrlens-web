import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../../hzrlens-api/api/openapi.yaml", import.meta.url);
const destination = new URL("../contracts/openapi.yaml", import.meta.url);
await mkdir(new URL("../contracts/", import.meta.url), { recursive: true });
await copyFile(source, destination);
console.info(`Updated contract snapshot: ${fileURLToPath(destination)}`);
