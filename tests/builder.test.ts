import { Builder } from "../src/builder";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";

describe("start", () => {
  const scaffoldFolder = path.join(__dirname, "./scaffold");

  beforeAll(async () => {
    await new Builder(scaffoldFolder).start();
  });

  it("creates expected files", async () => {
    const expectedFiles = [
      "my-first-post/index.html",
      "my-first-post/amp.html",
      "my-second-post/index.html",
      "my-second-post/amp.html",
      "my-second-post/smile.png",
      "my-second-post/assets/script.js",
      "my-second-post/assets/style.css",
      "projects/index.html"
    ];
    for (let file of expectedFiles) {
      expect(fs.existsSync(path.join(scaffoldFolder, "_dist", file))).toEqual(
        true
      );
    }
  });

  it("creates about-me/ correctly", () => {
    const aboutMeContent = fs.readFileSync(
      path.join(scaffoldFolder, "_dist/about-me/index.html"),
      { encoding: "utf-8" }
    );

    expect(
      aboutMeContent.includes(
        "Hello there.  My name is Brady Holt and I like to blog."
      )
    ).toBeTruthy();
  });

  it("creates my-second-post/ correctly", () => {
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
      mySecondPostContent.includes(`<img src="/media/frown.png" alt="Frown">`)
    ).toBeTruthy();
    expect(
      mySecondPostContent.includes(
        `<style>body,h1,h2,h3,h4,h5,h6,p,blockquote,pre,hr,dl,dd,ol,ul,figure{margin:0;`
      )
    ).toBeTruthy();
  });

  it("creates rss.xml correctly", () => {
    const rssContent = fs.readFileSync(
      path.join(scaffoldFolder, "_dist/rss.xml"),
      { encoding: "utf-8" }
    );

    expect(
      rssContent.includes(
        `<guid isPermaLink="true">https://www.my-awesome-blog.com/my-first-post/</guid>`
      )
    ).toBeTruthy();
  });
});
