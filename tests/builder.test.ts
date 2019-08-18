import { Builder } from "../src/builder";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";

describe("start", () => {
  it("builds scaffold correct", async () => {
    const scaffoldFolder = path.join(__dirname, "./scaffold");
    await new Builder(scaffoldFolder).start();

    expect(
      fs.existsSync(path.join(scaffoldFolder, "_dist/my-first-post/index.html"))
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(scaffoldFolder, "_dist/my-first-post/amp.html"))
    ).toEqual(true);
    expect(
      fs.existsSync(
        path.join(scaffoldFolder, "_dist/my-second-post/index.html")
      )
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(scaffoldFolder, "_dist/my-second-post/amp.html"))
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(scaffoldFolder, "_dist/my-second-post/smile.png"))
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(scaffoldFolder, "_dist/my-second-post/assets/script.js"))
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(scaffoldFolder, "_dist/my-second-post/assets/style.css"))
    ).toEqual(true);
    expect(
      fs.existsSync(path.join(scaffoldFolder, "_dist/projects/index.html"))
    ).toEqual(true);

    const aboutMeContent = fs.readFileSync(
      path.join(scaffoldFolder, "_dist/about-me/index.html"),
      { encoding: "utf-8" }
    );
    expect(
      aboutMeContent.includes(
        "Hello there.  My name is Brady Holt and I like to blog."
      )
    ).toBeTruthy();

    const mySecondPostContent = fs.readFileSync(
      path.join(scaffoldFolder, "_dist/my-second-post/index.html"),
      { encoding: "utf-8" }
    );
    expect(mySecondPostContent.includes("August 10, 2019")).toBeTruthy();

    expect(
      mySecondPostContent.includes(
        `<img src="/my-second-post/smile.png" alt="Smile">`
      )
    ).toBeTruthy();

    expect(
      mySecondPostContent.includes(
        `<img src="/media/frown.png" alt="Frown">`
      )
    ).toBeTruthy();
    expect(
      mySecondPostContent.includes(
        `<style>body,h1,h2,h3,h4,h5,h6,p,blockquote,pre,hr,dl,dd,ol,ul,figure{margin:0;`
      )
    ).toBeTruthy();
  });
});
