#!/usr/bin/env node

"use strict";

const cli = require("../dist/cli.js").init(
  process.cwd(),
  process.argv.slice(2)
);

(async function() {
  await cli.run();
})();
