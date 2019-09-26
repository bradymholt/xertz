import { Builder } from "./builder";
import * as path from "path";
import * as fse from "fs-extra";
import * as chokidar from "chokidar";
import express = require("express");
import pkg from "../package.json";
import { getCurrentDateInISOFormat } from "./dateHelper";

export function init(cwd: string, args: Array<string>) {
  const c = new cli(cwd, args);
  return c;
}

class cli {
  readonly scaffoldDirectoryName = "scaffold";
  readonly scaffoldContentExampleFileName = "YYYY-MM-DD-my-first-post.md";

  cwd: string;
  args: Array<string>;

  constructor(cwd: string, args: Array<string>) {
    this.cwd = cwd;
    this.args = args;
  }

  async run() {
    console.log(`${pkg.name} - Version: ${pkg.version}`);

    this.watchSignal();

    const command = this.args[0] || "build";

    switch (command) {
      case "init":
        this.init(this.args[1]);
        break;
      case "build":
        await this.build(this.args[1] || ".");
        break;
      case "serve":
        this.serve(this.args[1]);
        break;
      default:
        this.printHelp();
    }
  }

  watchSignal() {
    process.on("SIGINT", function() {
      process.exit();
    });
  }

  init(targetDirectoryName: string) {
    if (!targetDirectoryName) {
      this.exitWithError("ERROR: target directory is required!");      
    }

    const targetDirectoryPath = path.resolve(this.cwd, targetDirectoryName);

    if (fse.pathExistsSync(targetDirectoryPath)) {
      this.exitWithError(`ERROR: ${targetDirectoryPath} already exists.`);      
    }

    const scaffoldDirectory = path.resolve(
      __dirname,
      "../",
      this.scaffoldDirectoryName
    );

    fse.copySync(scaffoldDirectory, targetDirectoryPath, {
      filter: (src: string, dest: string) => {
        const name = path.parse(src).name;
        return name != "_dist";
      }
    });

    // Add today's date in the example content file
    fse.renameSync(
      path.join(
        targetDirectoryPath,
        "posts",
        this.scaffoldContentExampleFileName
      ),
      path.join(
        targetDirectoryPath,
        "posts",
        this.scaffoldContentExampleFileName.replace(
          "YYYY-MM-DD",
          getCurrentDateInISOFormat()
        )
      )
    );

    console.log(`INIT: Done! Start blogging with ${pkg.name}.`);
    process.exit();
  }

  async build(sourceDirectory: string, exit = true) {
    const builder = new Builder(path.join(this.cwd, sourceDirectory));
    console.log(`BUILD: Start`);
    await builder.start();
    console.log(`BUILD: Success!`);
    if (exit) {
      process.exit();
    }
  }

  async serve(preferredPortNumber: string) {
    await this.build(".", false);

    const distFolder = path.join(this.cwd, Builder.distDirectoryName);

    chokidar
      .watch([path.join(this.cwd)], {
        ignoreInitial: true,
        ignored: distFolder
      })
      .on("all", (event, path) => {
        console.log(`SERVE: Changed Detected`);
        this.build(".", false);
      });

    const expressApp = express();

    expressApp.use(express.static(distFolder));
    const portNumber = Number(preferredPortNumber) || 8080;
    expressApp.listen(portNumber);

    console.log(`SERVE: Listening on http://localhost:${portNumber}`);
  }
  printHelp() {
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

  exitWithError(errorMessage: string) {
    console.error(errorMessage);
    process.exit(1);
  }
}
