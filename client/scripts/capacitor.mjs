import os from "node:os";
import { createRequire } from "node:module";

// Work around Windows environments where Node's os.userInfo() fails while the
// Capacitor CLI detects the shell. Capacitor only needs these fields for display.
os.userInfo = () => ({
  username: process.env.USERNAME || "user",
  uid: -1,
  gid: -1,
  shell: process.env.COMSPEC || "cmd.exe",
  homedir: process.env.USERPROFILE || "",
});

const require = createRequire(import.meta.url);
const cliPath = require.resolve("@capacitor/cli/bin/capacitor");
const args = process.argv.slice(2);
process.argv = [process.execPath, cliPath, ...args];
require(cliPath);
