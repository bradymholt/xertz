import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as yaml from "js-yaml";
import * as handlebars from "handlebars";
import marked = require("marked");
import * as cheerio from "cheerio";
import registerHbsHelpers from "../hbs-helpers";
import { IPage, IConfig, IStyle, ITemplateData } from "../interfaces";
import { getCurrentDateInISOFormat } from "../dateHelper";
import { loadConfigFile } from "../configHelper";

export class ContentGenerator {
  readonly baseConfig: IConfig;
  readonly layoutsDirectory: string;
  readonly styles: Array<IStyle>;
  initialized = false;

  constructor(
    baseConfig: IConfig,
    styles: Array<IStyle>,
    layoutsDirectory: string
  ) {
    this.baseConfig = baseConfig;
    this.styles = styles;
    this.layoutsDirectory = layoutsDirectory;
  }

  protected initialize() {
    if (!this.initialized) {
      this.registerTemplatePartials(this.layoutsDirectory);
      registerHbsHelpers();

      this.initialized = true;
    }
  }

  public render(sourceDirectory: string, destDirectory: string) {
    this.initialize();

    let config = this.baseConfig;
    let sourceDirectoryConfig = loadConfigFile(sourceDirectory);
    if (sourceDirectoryConfig) {
      config = Object.assign(config, sourceDirectoryConfig);
    }
    if (!config) {
      throw Error("Config file not found.");
    }

    const templateData = this.buildTemplateData(config, this.styles);
    // TODO: Make this configurable
    const applyTemplate = this.initializeTemplate(
      path.join(this.layoutsDirectory, "content.hbs")
    );

    const pages: Array<IPage> = [];
    const baseDirFileNames = fs.readdirSync(sourceDirectory);
    const contentFileNames = baseDirFileNames.filter(
      f =>
        !f.startsWith("_") &&
        !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
        ["md"].includes(path.extname(f).substr(1))
    );
    for (let currentFileName of contentFileNames) {
      const pageContent = this.renderContentFile(
        sourceDirectory,
        destDirectory,
        currentFileName,
        applyTemplate,
        templateData,
        config
      );

      pages.push(pageContent);
    }

    const subDirectoryNames = baseDirFileNames.filter(f => {
      return fs.statSync(path.join(sourceDirectory, f)).isDirectory();
    });

    for (let subDirectoryName of subDirectoryNames) {
      const subDirectorySource = path.join(sourceDirectory, subDirectoryName);
      const subDirectoryDest = path.join(destDirectory, subDirectoryName);
      const subContent = this.render(subDirectorySource, subDirectoryDest);
      pages.push(...subContent);
    }

    // Render templates/indexes
    const indexFileNames = baseDirFileNames.filter(
      f =>
        !f.startsWith("_") &&
        !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
        ["hbs"].includes(path.extname(f).substr(1))
    );
    for (let currentFileName of indexFileNames) {
      this.renderTemplateFile(
        sourceDirectory,
        destDirectory,
        currentFileName,
        templateData,
        pages
      );
    }

    return pages;
  }

  private renderTemplateFile(
    sourceDirectory: string,
    destDirectory: string,
    currentFileName: string,
    templateData: ITemplateData,
    pages: Array<IPage>
  ) {
    // TODO: Move this to initializeTemplate but we need it because we need templateContent to extract title
    const templateContent = fs.readFileSync(
      path.join(sourceDirectory, currentFileName),
      {
        encoding: "utf-8"
      }
    );
    const applyTemplate = handlebars.compile(templateContent);

    const $ = cheerio.load(templateContent, {
      xmlMode: true
    });

    let title = "";
    // Use first <h1/> (#) as the page title, if available
    const h1s = $("h1");
    if (h1s.length > 0) {
      const firstH1 = $("h1").first();
      title = firstH1.text();
      firstH1.remove();
    }

    const page = <IPage>{
      title,
      description: title
    };

    const templatedOutput = applyTemplate(<ITemplateData>(
      Object.assign({}, templateData, { page }, { pages })
    ));

    // TODO: don't hardcode .hbs extension
    // TODO: config outPath is ignored for template files...I think this is ok but need to make obvious
    const name = currentFileName.replace(".hbs", ".html");
    fs.writeFileSync(path.join(destDirectory, name), templatedOutput);
  }

  private renderContentFile(
    sourceDirectory: string,
    destDirectory: string,
    currentFileName: string,
    applyTemplate: handlebars.TemplateDelegate<any>,
    templateData: ITemplateData,
    config: IConfig
  ) {
    const markdown = fs.readFileSync(
      path.join(sourceDirectory, currentFileName),
      { encoding: "utf-8" }
    );
    const htmlFromMarkdown = marked(markdown);
    let date = "";
    let slug = currentFileName;
    const fileNameMatcher = currentFileName.match(
      /(\d{4}-\d{2}-\d{2})?[_|-]?(.*).md/
    );
    if (fileNameMatcher != null) {
      date = fileNameMatcher[1];
      slug = fileNameMatcher[2];
    }
    const $ = cheerio.load(htmlFromMarkdown, {
      xmlMode: true
    });
    // Default page title to file name (slug)
    let title = slug;
    // Use first <h1/> (#) as the page title, if available
    const h1s = $("h1");
    if (h1s.length > 0) {
      const firstH1 = $("h1").first();
      title = firstH1.text();
      firstH1.remove();
    }
    // Use first <p/> (paragraph) as the page blurb
    const description = $("p")
      .first()
      .html();

    const page = <IPage>{
      date,
      slug,
      title,
      description
    };
    const html = $.html();
    const templatedOutput = applyTemplate(<ITemplateData>(
      Object.assign({}, templateData, { page }, { content: html })
    ));
    // TODO: support other variations of config.outPath like :title/ :year/:title
    const pageDirectory = path.join(destDirectory, config.outPath || "", slug);
    fse.emptyDirSync(pageDirectory);
    fs.writeFileSync(path.join(pageDirectory, "index.html"), templatedOutput);

    return page;
  }

  private registerTemplatePartials(layoutsDirectory: string) {
    // TODO: support partials in subdirectories
    const templatePartialsFiles = fs
      .readdirSync(layoutsDirectory)
      .filter(f => f.endsWith(".hbs"));

    for (let fileName of templatePartialsFiles) {
      const templateContent = fs.readFileSync(
        path.join(layoutsDirectory, fileName),
        { encoding: "utf-8" }
      );

      let templateName = path.parse(fileName).name;
      if (templateName.startsWith("_")) {
        templateName = templateName.substr(1);
      }
      handlebars.registerPartial(templateName, templateContent);
    }
  }

  private buildTemplateData(config: IConfig, styles: Array<IStyle>) {
    // Render styles and group by name
    const stylesData: {
      [partialName: string]: IStyle;
    } = styles.reduce(
      (root: { [partialName: string]: IStyle }, current: IStyle) => {
        root[current.name] = current;
        return root;
      },
      {} as { [partialName: string]: IStyle }
    );

    const templateData = <ITemplateData>{
      config,
      buildDate: getCurrentDateInISOFormat(),
      styles: stylesData
    };

    return templateData;
  }

  private initializeTemplate(templateFile: string) {
    const templateContent = fs.readFileSync(templateFile, {
      encoding: "utf-8"
    });
    const applyTemplate = handlebars.compile(templateContent);
    return applyTemplate;
  }
}
