#!/usr/bin/env node

"use strict";

require("ts-node").register({ transpileOnly: true, typeCheck: false });
require("../src/cli.ts").run(process.cwd(), process.argv.slice(2));
