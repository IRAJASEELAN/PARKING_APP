import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const rootEnvPath = resolve(projectRoot, ".env");
if (existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
else dotenv.config({ path: resolve(projectRoot, "server", ".env") });