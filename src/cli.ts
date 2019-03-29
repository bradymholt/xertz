import { Builder } from "./builder";
import * as path from "path";
import * as fse from "fs-extra";
import express = require("express");
import * as pkg from "../package.json";

export function run(cwd: string, args: Array<string>) {
  console.log(`${pkg.name} - Version: ${pkg.version}`);

  watchSignal();

  const command = args[0] || "build";

  switch (command) {
    case "init":
      init(cwd, args[1]);
      break;
    case "build":
      build(cwd, args[1] || ".");
      break;
    case "serve":
      serve(cwd, args[1]);
      break;
    default:
      printHelp();
  }
}

function watchSignal() {
  process.on("SIGINT", function() {
    process.exit();
  });
}

function init(cwd: string, targetDirectoryName: string) {
  if (!targetDirectoryName) {
    exitWithError("ERROR: target directory is required!");
  }

  const targetDirectoryPath = path.resolve(cwd, targetDirectoryName);

  if (fse.pathExistsSync(targetDirectoryPath)) {
    exitWithError(`ERROR: ${targetDirectoryPath} already exists.`);
  }

  const scaffoldDirectory = path.resolve(__dirname, "../scaffold");
  fse.copySync(scaffoldDirectory, targetDirectoryPath);

  console.log(`Done!  Start blogging with ${pkg.name}.`);
  process.exit();
}
function build(cwd: string, sourceDirectory: string) {
  new Builder(path.join(cwd, sourceDirectory)).start();
  console.log(`Success!`);
  process.exit();
}

function serve(cwd: string, preferredPortNumber: string) {
  build(cwd, ".");

  const expressApp = express();
  expressApp.use(express.static(path.join(cwd, "dist")));
  const portNumber = Number(preferredPortNumber) || 8080;
  expressApp.listen(portNumber);

  console.log(`Listening on http://localhost:${portNumber}`);
}
function printHelp() {
  console.log(`\
${pkg.name}
${pkg.description}
Version: ${pkg.version}

    The following options are available:

    init
    build
    serve
    help
`);
}

function exitWithError(errorMessage: string) {
  console.error(errorMessage);
  process.exit(1);
}
