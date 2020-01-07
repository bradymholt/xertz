// This script runs xertz using the source .ts files
// using ts-node and is intended for development only.

import cli from "../src/cli";

const cliInstance = new cli(process.cwd(), process.argv.slice(2));

(async function() {
  await cliInstance.run();
})();
