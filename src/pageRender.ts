import * as fs from "fs";
import * as path from "path";
import marked from "marked";
import * as cheerio from "cheerio";
import * as handlebars from "handlebars";
import { ITemplateData, IConstants, IPage, IPageAbstract } from "./interfaces";

export class PageRenderer {
  readonly constants: IConstants;
  readonly file: string;
  readonly fileName: string;
  readonly destinationDirectory: string;
  readonly baseDirectory: string;
  readonly applyTemplate: handlebars.TemplateDelegate;
  readonly templateData: ITemplateData;

  constructor(
    constants: IConstants,
    baseDirectory: string,
    fileName: string,
    destinationDirectory: string,
    applyTemplate: handlebars.TemplateDelegate,
    templateData: ITemplateData
  ) {
    this.constants = constants;
    this.file = path.join(baseDirectory, fileName);
    this.baseDirectory = baseDirectory;
    this.fileName = fileName;
    this.destinationDirectory = destinationDirectory;
    this.applyTemplate = applyTemplate;
    this.templateData = templateData;
  }

  render() {
    const markdownContent = fs.readFileSync(this.file, { encoding: "utf-8" });
    const htmlFromMarkdown = marked(markdownContent);

    let date = "";
    let slug = this.fileName;
    const fileNameMatcher = this.fileName.match(
      /(\d{4}-\d{2}-\d{2})?[_|-]?(.*).md/
    );
    if (fileNameMatcher != null) {
      date = fileNameMatcher[1];
      slug = fileNameMatcher[2];
    }

    const $ = cheerio.load(htmlFromMarkdown, {
      xmlMode: true
    });

    let pageTitle = slug;
    const h1s = $("h1");
    if (h1s.length > 0) {
      const firstH1 = $("h1").first();
      pageTitle = firstH1.text();

      firstH1.remove();
    }

    const blurb = $("p").first().html();

    const html = $.html();

    const pageAbstract = <IPageAbstract>{
      date,
      slug,
      title: pageTitle
    };

    const page = Object.assign(pageAbstract, {
      content: html,
      blurb
    });

    const pageDirectory = path.join(this.destinationDirectory, page.slug);
    fs.mkdirSync(pageDirectory);

    const postHtml = this.applyTemplate(
      Object.assign(this.templateData, { page })
    );
    fs.writeFileSync(path.join(pageDirectory, "index.html"), postHtml);

    return pageAbstract;
  }
}
