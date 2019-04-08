import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as handlebars from "handlebars";
import {
  ITemplateData,
  IPageAbstract,
  IStyle,
  IConstants,
  IConfig
} from "./interfaces";
import { MarkDownRenderer } from "./renderers/markDownRenderer";
import { SassRenderer } from "./renderers/SassRenderer";

export class ContentRenderer {
  readonly baseDirectory: string;
  readonly destinationDirectory: string;
  readonly constants: IConstants;
  readonly baseDirectoryName: string;
  readonly templateData: ITemplateData;

  renderedStyles: Array<IStyle> = [];

  constructor(
    baseDirectory: string,
    destinationDirectory: string,
    constants: IConstants,
    templateData: ITemplateData
  ) {
    this.baseDirectory = baseDirectory;
    this.destinationDirectory = destinationDirectory;
    this.constants = constants;

    this.baseDirectoryName = path.basename(this.baseDirectory);
    this.templateData = templateData;
  }

  render() {
    const renderedPages: Array<IPageAbstract> = [];
    const baseDirFileNames = fs.readdirSync(this.baseDirectory);

    const subDirectoryNames = baseDirFileNames.filter(f => {
      return fs.statSync(path.join(this.baseDirectory, f)).isDirectory();
    });
    for (let subDirectoryName of subDirectoryNames) {
      // TODO: instantiate based on type (factory?)
      const pagesRenderer = new ContentRenderer(
        path.join(this.baseDirectory, subDirectoryName),
        path.join(this.destinationDirectory, subDirectoryName),
        this.constants,
        this.templateData
      );
      renderedPages.push(...pagesRenderer.render());
    }

    const markdownFileNames = baseDirFileNames.filter(
      f => f.endsWith(".md") && f.length > 10
    );
    const cssFileNames = baseDirFileNames.filter(
      f =>
        !f.startsWith("_") &&
        ["scss", "sass", "css"].includes(path.extname(f).substr(1))
    );
    const hbsFileNames = baseDirFileNames.filter(
      f => !f.startsWith("_") && ["hbs"].includes(path.extname(f).substr(1))
    );

    const nonMarkdownFiles = baseDirFileNames.filter(
      f =>
        !f.startsWith("_") &&
        !markdownFileNames.includes(f) &&
        !cssFileNames.includes(f) &&
        !hbsFileNames.includes(f) &&
        !fs.statSync(path.join(this.baseDirectory, f)).isDirectory()
    );

    if (!fs.existsSync(this.destinationDirectory)) {
      fs.mkdirSync(this.destinationDirectory);
    }

    if (markdownFileNames.length > 0 && this.templateData != null) {
      const applyTemplate = this.initializeLayoutTemplate("content.hbs");

      for (let fileName of markdownFileNames) {
        const pageRenderer = new MarkDownRenderer(
          this.baseDirectory,
          this.constants,
          fileName,
          this.destinationDirectory,
          applyTemplate,
          this.templateData
        );
        const rendered = pageRenderer.render();
        renderedPages.push(rendered);
      }

      this.renderIndexPage("index.hbs", renderedPages);
      this.renderIndexPage("robots.txt.hbs", renderedPages);
      this.renderIndexPage("rss.xml.hbs", renderedPages);
      this.renderIndexPage("sitemap.xml.hbs", renderedPages);
    }

    for (let fileName of cssFileNames) {
      const renderer = new SassRenderer(
        this.baseDirectory,
        fileName,
        this.destinationDirectory,
        this.templateData.config
      );
      const rendered = renderer.render();
      this.renderedStyles.push(rendered);
    }

    for (let fileName of hbsFileNames) {
      const applyTemplate = this.initializeTemplate(
        path.join(this.baseDirectory, fileName)
      );
      const fileHtml = applyTemplate(Object.assign(this.templateData));
      const outFileName = fileName.replace(".hbs", "");
      fs.writeFileSync(
        path.join(this.destinationDirectory, outFileName),
        fileHtml
      );
    }

    for (let fileName of nonMarkdownFiles) {
      fs.copyFileSync(
        path.join(this.baseDirectory, fileName),
        path.join(this.destinationDirectory, fileName)
      );
    }

    return renderedPages;
  }

  renderIndexPage(templateFileName: string, pages: Array<IPageAbstract>) {
    const applyTemplate = this.initializeLayoutTemplate(templateFileName);

    const firstTenPages = pages.slice(0, 10);
    const html = applyTemplate(
      Object.assign(this.templateData, {
        page: {
          title: this.templateData.config.title
        } as IPageAbstract,
        pages: firstTenPages
      })
    );

    fs.writeFileSync(
      path.join(
        this.constants.distDirectory,
        path.parse(templateFileName).name
      ),
      html
    );
  }

  private initializeLayoutTemplate(layoutFileName: string) {
    const layoutsDirectory = path.join(this.constants.templatePath, "layouts");
    const pathRelativeToContent = this.baseDirectory.replace(
      this.constants.contentPath,
      ""
    );
    let templateFile = path.join(
      layoutsDirectory,
      pathRelativeToContent,
      layoutFileName
    );
    if (!fse.existsSync(templateFile)) {
      // Default content template
      templateFile = path.join(layoutsDirectory, layoutFileName);
    }

    if (!fs.existsSync(templateFile)) {
      throw new Error(`Template file could not be found: ${templateFile}`);
    }

    return this.initializeTemplate(templateFile);
  }

  private initializeTemplate(templateFileName: string) {
    const templateContent = fs.readFileSync(templateFileName, {
      encoding: "utf-8"
    });
    const applyTemplate = handlebars.compile(templateContent);
    return applyTemplate;
  }
}
