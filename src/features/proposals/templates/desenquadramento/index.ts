import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Template } from "../../types";
import { defaultContent } from "./default-content";
import { metadata } from "./metadata";
import { editableContentSchema } from "./schema";

const __dirname = dirname(fileURLToPath(import.meta.url));

const html = readFileSync(join(__dirname, "template.html"), "utf-8");

export const desenquadramento: Template<typeof editableContentSchema> = {
	key: "DESENQUADRAMENTO",
	name: "Desenquadramento",
	category: "CONTINUOUS",
	html,
	schema: editableContentSchema,
	metadata,
	defaultContent,
};
