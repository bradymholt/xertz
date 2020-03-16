import { Builder } from "../src/builder";
import * as fs from "fs";
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
      "my-third-post/index.html",
      "projects/index.html",
      "posts/index.html"
    ];
    for (let file of expectedFiles) {
      try {
        expect(
          fs.existsSync(path.join(scaffoldFolder, "_dist", file))
        ).toBeTruthy();
      } catch (err) {
        throw new Error(`${file} not found after running building`);
      }
    }
  });

  it("skips expected files", async () => {
    const notExpectedFiles = ["2019-08-02-draft-post", "ignoreme.toml"];
    for (let file of notExpectedFiles) {
      expect(
        fs.existsSync(path.join(scaffoldFolder, "_dist", file))
      ).toBeFalsy();
    }
  });

  describe("about-me/", () => {
    it("creates index.html correctly", () => {
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
  });

  describe("my-second-post/", () => {
    it("creates index.html correctly", () => {
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
          `<style>body,h1,h2,h3,h4,h5,h6,p,blockquote,pre,hr,dl,dd,ol,ul,figure{margin:0;padding:0;-webkit-font-smoothing:antialiased}`
        )
      ).toBeTruthy();

      // Does not indent formatted code
      expect(mySecondPostContent.match(/^console\<span/m)).toBeTruthy();
      
      // Does not contain zero width spaces
      expect(mySecondPostContent.match(/\u200b\n/)).toBeFalsy();
    });

    it("creates amp.html correctly", () => {
      const mySecondPostAmpContent = fs.readFileSync(
        path.join(scaffoldFolder, "_dist/my-second-post/amp.html"),
        { encoding: "utf-8" }
      );

      expect(
        mySecondPostAmpContent.includes(
          `body,h1,h2,h3,h4,h5,h6,p,blockquote,pre,hr,dl,dd,ol,ul,figure{margin:0;padding:0;-webkit-font-smoothing:antialiased}`
        )
      ).toBeTruthy();

      expect(
        mySecondPostAmpContent.includes(`body { font-family: 'Poly', serif; }`)
      ).toBeTruthy();

      expect(
        mySecondPostAmpContent.includes(
          `<amp-img src="/my-second-post/smile.png" alt="Smile" width="256" height="256"></amp-img>`
        )
      ).toBeTruthy();
    });
  });

  describe("template pages", () => {
    it("creates posts/index.html", () => {
      const postsIndexContent = fs.readFileSync(
        path.join(scaffoldFolder, "_dist/posts/index.html"),
        { encoding: "utf-8" }
      );

      expect(
        postsIndexContent.includes(`<a href="/old-post/">My Old Post</a>`)
      ).toBeTruthy();
    });
  });

  describe("rss.xml", () => {
    it("creates correctly", () => {
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
});
