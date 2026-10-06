import { prepareDatabaseEnv, runCommand } from "./database-process.mjs";

await prepareDatabaseEnv();
runCommand(process.argv.slice(2));
