import { Builder } from "../src/builder";
import * as fse from "fs-extra";
import * as path from "path";
import { getCurrentDateInISOFormat } from "../src/dateHelper";

describe("start", function() {
  it.only("builds scaffold correct", function() {
    const source = path.join(__dirname, "../scaffold/");
    const dest = path.join(__dirname, "./tmp_scaffold");
    fse.emptyDirSync(dest);
    fse.copySync(source, dest);
    fse.renameSync(path.join(dest, "content/posts/YYYY-MM-DD-my-first-post.md"), path.join(dest, `content/posts/${getCurrentDateInISOFormat()}-my-first-post.md`))
    new Builder(dest).start();
  });  
});
