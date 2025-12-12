import nextra from "nextra";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextra = nextra({});

export default withNextra({
  // Set the workspace root to the docs directory
  outputFileTracingRoot: __dirname,
});
