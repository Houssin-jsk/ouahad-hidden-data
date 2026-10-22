import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const [command, ...args] = process.argv.slice(2);
const research = args[0] === "research";
if (research) args.shift();
if (!["dev", "build", "start"].includes(command))
  throw Error("Unsupported Next command");
const root = fileURLToPath(new URL("../", import.meta.url));
// Explicit commands override inherited shell flags; normal build/start always release.
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    command,
    ...args,
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      HIDDEN_DATA_BUILD_TARGET: research ? "research" : "release",
    },
  },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
