import { Builder } from "../src/builder";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";

describe("start", () => {
  it("builds scaffold correct", async () => {
    const source = path.join(__dirname, "../scaffold/");
    const dest = path.join(__dirname, "./tmp_scaffold");
    fse.emptyDirSync(dest);
    fse.copySync(source, dest);
    await new Builder(dest).start();

    expect(
      fs.existsSync(path.join(dest, "_dist/my-first-post/index.html"))
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(dest, "_dist/my-first-post/amp.html"))
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(dest, "_dist/my-second-post/index.html"))
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(dest, "_dist/my-second-post/amp.html"))
    ).toEqual(true);

    const aboutMeContent = fs.readFileSync(
      path.join(dest, "_dist/about-me/index.html"),
      { encoding: "utf-8" }
    );
    expect(
      aboutMeContent.includes(
        "Hello there.  My name is Brady Holt and I like to blog."
      )
    ).toBeTruthy();
  });
});
