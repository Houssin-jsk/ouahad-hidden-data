import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import ignore from "ignore";

// `exclude` affects root discovery, not transitive imports. Check the complete
// TypeScript import graph before a release build can reintroduce removed files.
const root = process.cwd();
const configPath = path.join(root, "tsconfig.production.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error)
  throw Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
if (parsed.errors.length)
  throw Error(
    parsed.errors
      .map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n"))
      .join("\n"),
  );
const program = ts.createProgram(parsed.fileNames, parsed.options);
const excluded = ignore().add(
  readFileSync(path.join(root, ".vercelignore"), "utf8"),
);
const sources = program
  .getSourceFiles()
  .map((source) =>
    path.relative(root, source.fileName).replaceAll(path.sep, "/"),
  )
  .filter(
    (file) => !file.startsWith("../") && !file.startsWith("node_modules/"),
  );
const blocked = sources.filter((file) => excluded.ignores(file));
if (blocked.length)
  throw Error(
    "Production TypeScript imports files excluded by .vercelignore:\n" +
      blocked.sort().join("\n"),
  );
console.log(
  `Production TypeScript graph verified: ${sources.length} local files; no .vercelignore exclusions imported.`,
);
