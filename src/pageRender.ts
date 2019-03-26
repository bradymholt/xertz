import * as fs from "fs";
import * as path from "path";
import marked from "marked";
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
    const h1Start = markdownContent.indexOf("#");
    const h1End = markdownContent.indexOf("\n", h1Start);
    const h1 = markdownContent.substring(
      h1Start,
      h1End >= 0 ? h1End : undefined
    );
    const pageTitle = h1.replace(/\s*\#\s*/g, "");
    const markdownContentWithoutHeader = markdownContent.replace(h1, "");
    const htmlFromMarkdown = marked(markdownContentWithoutHeader);

    let date = "";
    let slug = this.fileName;
    const fileNameMatcher = this.fileName.match(
      /(\d{4}-\d{2}-\d{2})?[_|-]?(.*).md/
    );
    if (fileNameMatcher != null) {
      date = fileNameMatcher[1];
      slug = fileNameMatcher[2];
    }

    const pageAbstract = <IPageAbstract>{
      date,
      slug,
      title: pageTitle
    };

    const page = Object.assign(pageAbstract, {
      content: htmlFromMarkdown
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
