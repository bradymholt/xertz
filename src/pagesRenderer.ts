import * as fs from "fs";
import * as path from "path";
import * as handlebars from "handlebars";
import { ITemplateData, IPage, IPageAbstract, IConstants } from "./interfaces";
import { PageRenderer } from "./pageRender";

export class PagesRenderer {
  readonly constants: IConstants;
  readonly baseDirectory: string;
  readonly baseDirectoryName: string;
  readonly destinationDirectory: string;
  readonly templateData: ITemplateData;

  renderedPages: Array<IPageAbstract> = [];

  constructor(
    constants: IConstants,
    baseDirectory: string,
    templateData: ITemplateData
  ) {
    this.constants = constants;
    this.baseDirectory = baseDirectory;
    this.baseDirectoryName = path.basename(this.baseDirectory);
    this.templateData = templateData;

    if (constants.postsDirectoryName == this.baseDirectoryName) {
      this.destinationDirectory = this.constants.distDirectory;
    } else {
      this.destinationDirectory = path.join(
        this.constants.distDirectory,
        baseDirectory.replace(this.constants.contentPath, "")
      );
    }
  }

  render() {
    const baseDirFileNames = fs.readdirSync(this.baseDirectory);
    const markdownFileNames = baseDirFileNames.filter(
      f => f.endsWith(".md") && f.length > 10
    );
    const nonMarkdownFiles = baseDirFileNames.filter(
      f =>
        !markdownFileNames.includes(f) &&
        !fs.statSync(path.join(this.baseDirectory, f)).isDirectory()
    );

    if (!fs.existsSync(this.destinationDirectory)) {
      fs.mkdirSync(this.destinationDirectory);
    }

    if (markdownFileNames.length > 0) {
      const applyTemplate = this.initializeTemplate(this.baseDirectoryName);

      for (let fileName of markdownFileNames) {
        const pageRenderer = new PageRenderer(
          this.constants,
          this.baseDirectory,
          fileName,
          this.destinationDirectory,
          applyTemplate,
          this.templateData
        );
        const rendered = pageRenderer.render();
        this.renderedPages.push(rendered);
      }

      if (this.baseDirectoryName == this.constants.postsDirectoryName) {
        this.renderIndex(this.renderedPages);
      }
    }

    for (let fileName of nonMarkdownFiles) {
      fs.copyFileSync(
        path.join(this.baseDirectory, fileName),
        path.join(this.destinationDirectory, fileName)
      );
    }

    const subDirectoryNames = baseDirFileNames.filter(f => {
      return fs.statSync(path.join(this.baseDirectory, f)).isDirectory();
    });
    for (let subDirectoryName of subDirectoryNames) {
      // TODO: instantiate based on type (factory?)
      const pagesRenderer = new PagesRenderer(
        this.constants,
        path.join(this.baseDirectory, subDirectoryName),
        this.templateData
      );
      pagesRenderer.render();
    }
  }

  renderIndex(pages: Array<IPageAbstract>) {
    const applyTemplate = this.initializeTemplate(
      `${this.baseDirectoryName}-index`
    );

    const firstTenPages = pages.slice(0, 10);
    const indexHtml = applyTemplate(
      Object.assign(this.templateData, {
        page: {
          title: this.templateData.site.name
        } as IPageAbstract,
        pages: firstTenPages
      })
    );
    
    fs.writeFileSync(
      path.join(this.constants.distDirectory, "index.html"),
      indexHtml
    );
  }

  private initializeTemplate(templateName: string) {
    const templateFile = path.join(
      this.constants.templatePath,
      `${templateName}.hbs`
    );
    if (!fs.existsSync(templateFile)) {
      throw new Error(`Template file could not be found: ${templateFile}`);
    }
    const templateContent = fs.readFileSync(templateFile, {
      encoding: "utf-8"
    });
    const applyTemplate = handlebars.compile(templateContent);
    return applyTemplate;
  }
}
