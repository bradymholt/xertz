import { Builder } from "../src/builder";
import * as fse from "fs-extra";
import * as path from "path";

describe("start", function() {
  it.only("builds scaffold correct", function() {
    const dest = path.join(__dirname, "./tmp_scaffold");
    fse.copySync(path.join(__dirname, "../scaffold/"), dest);
    new Builder(dest).start();
  });  
});
