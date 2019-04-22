// This script runs xertz using the source .ts files
// using ts-node and is intended for development only.

import { init } from "../src/cli";

const cli = init(process.cwd(), process.argv.slice(2));

(async function() {
  await cli.run();
})();
