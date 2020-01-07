#!/usr/bin/env node

"use strict";

const cli = new (require("../dist/cli.js").default)(
  process.cwd(),
  process.argv.slice(2)
);

(async function() {
  await cli.run();
})();
