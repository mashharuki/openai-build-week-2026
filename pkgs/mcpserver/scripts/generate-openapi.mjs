import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { serializeOpenApiDocument, validateOpenApiDocument } from "../dist/openapi.js";

const outputPath = fileURLToPath(new URL("../openapi.yaml", import.meta.url));
const document = JSON.parse(serializeOpenApiDocument());

validateOpenApiDocument(document);
await writeFile(outputPath, serializeOpenApiDocument());
