import { Builder } from "./builder";
import * as path from "path";
import * as fse from "fs-extra";
import * as chokidar from "chokidar";
import packageJson from "package-json";
import express = require("express");
import currentPackageInfo from "../package.json";
import { getCurrentDateInISOFormat } from "./dateHelper";

export default class cli {
  readonly scaffoldDirectoryName = "scaffold";
  readonly scaffoldContentExampleFileName = "YYYY-MM-DD-my-first-post.md";

  cwd: string;
  args: Array<string>;

  constructor(cwd: string, args: Array<string>) {
    this.cwd = cwd;
    this.args = args;
  }

  printHelp() {
    console.log(`\
${currentPackageInfo.name} - version ${currentPackageInfo.version}
${currentPackageInfo.description}

Usage:
  xertz COMMAND

Commands:
  init
  new 
  build
  serve
  update
  help
`);
  }

  async run() {
    console.log(
      `${currentPackageInfo.name} - Version: ${currentPackageInfo.version}`
    );

    this.watchSignal();

    const command = this.args[0] || "build";

    switch (command) {
      case "init":
        this.init(this.args[1]);
        break;
      case "new":
        await this.checkForUpdates();
        this.newPost(this.args[1]);
        break;
      case "build":
        await this.checkForUpdates();
        await this.build(this.args[1] || ".");
        break;
      case "serve":
        await this.checkForUpdates();
        this.serve(this.args[1]);
        break;
      case "update":
        await this.update();
        break;
      default:
        await this.checkForUpdates();
        this.printHelp();
    }
  }

  watchSignal() {
    process.on("SIGINT", function() {
      process.exit();
    });
  }

  async checkForUpdates() {
    const latestNpmPackageInfo = await packageJson(currentPackageInfo.name);
    const sitePackageInfo = JSON.parse(
      fse.readFileSync(path.join(this.cwd, "package.json"), "utf8")
    );

    if (
      latestNpmPackageInfo.version !=
      sitePackageInfo.dependencies[currentPackageInfo.name]
    ) {
      console.log(
        "\x1b[33m%s",
        `New version is available (${latestNpmPackageInfo.version}).  Run \`${currentPackageInfo.name} update\` to update.`,
        "\x1b[0m"
      );
    }
  }

  async init(targetDirectoryName: string) {
    if (!targetDirectoryName) {
      this.exitWithError("ERROR: target directory is required!");
      return;
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

    // Configure package.json file
    const scaffoldFile = path.join(scaffoldDirectory, "package.json");
    const scaffoldPackageContent = JSON.parse(
      fse.readFileSync(scaffoldFile, "utf8")
    );
    scaffoldPackageContent.name = targetDirectoryName;
    const latestPackageInfo = await packageJson(currentPackageInfo.name);
    scaffoldPackageContent.dependencies.xertz = latestPackageInfo.version;
    fse.writeFileSync(scaffoldFile, JSON.stringify(scaffoldPackageContent));

    console.log(`INIT: Done! Start blogging with ${currentPackageInfo.name}.`);
    process.exit();
  }

  newPost(title: string) {
    const postsPath = path.join(this.cwd, "posts");
    if (!title) {
      title = "My New Post";
    }
    const postSlug = title.toLocaleLowerCase().replace(/\s/g, "-");
    const postPath = path.join(
      postsPath,
      `${getCurrentDateInISOFormat()}-${postSlug}`
    );

    fse.ensureDirSync(postPath);
    fse.writeFileSync(
      path.join(postPath, "index.md"),
      `\
---
title: ${title}
---

This is a new post.
`,
      {
        encoding: "utf-8"
      }
    );

    console.log(`NEW: Done!  Created ${postPath}`);
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

  async update() {
    const latestNpmPackageInfo = await packageJson(currentPackageInfo.name);
    const packageFile = path.join(this.cwd, "package.json");
    const sitePackageInfo = JSON.parse(fse.readFileSync(packageFile, "utf8"));
    sitePackageInfo.dependencies[currentPackageInfo.name] =
      latestNpmPackageInfo.version;

    fse.writeFileSync(packageFile, JSON.stringify(sitePackageInfo));
    console.log(`Updated to ${latestNpmPackageInfo.version}!`);
  }

  exitWithError(errorMessage: string) {
    console.error(errorMessage);
    process.exit(1);
  }
}
