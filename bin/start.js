#!/usr/bin/env node

"use strict";

console.log("HELLO")
require("ts-node").register({ transpileOnly: true, typeCheck: false });
const cli = require("../src/cli.ts").init(process.cwd(), process.argv.slice(2));

(async function() {
  await cli.run();
})();
