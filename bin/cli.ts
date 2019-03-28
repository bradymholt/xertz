#!/usr/bin/env node

import * as a from "../src/index";
import * as path from "path";
import * as process from "process";
import * as fse from "fs-extra";
import express = require("express");

const packageDir = path.resolve(__dirname, "..");
const currentDir = process.cwd();
const command = process.argv[2];

if (command == "init") {
  if (!process.argv[3]) {
    console.log("directory required");
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), process.argv[3]);
  fse.copySync(path.join(packageDir, "scaffold"), targetDir)  

  console.log("Done!  Run amplog serve.");
} else if (command == "serve") {
  new a.Amplog(currentDir).start();
  const app = express();
  const distDir = path.join(currentDir, "dist");
  app.use(express.static(distDir)); //  "public" off of current is root
  app.listen(8080);
} else {
  // build
  new a.Amplog(currentDir).start();
}
