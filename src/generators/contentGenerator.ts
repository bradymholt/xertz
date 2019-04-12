import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as handlebars from "handlebars";
import marked = require("marked");
import ampify = require("@bradymholt/ampify");
import pretty = require("pretty");
import matter = require("gray-matter");
import registerHbsHelpers from "../hbs-helpers";
import {
  IContentPage,
  IConfig,
  IStyle,
  ITemplateData,
  IContentSource,
  IPage
} from "../interfaces";
import { loadConfigFile } from "../configHelper";

export class ContentGenerator {
  readonly baseConfig: IConfig;
  readonly layoutsDirectory: string;
  readonly styles: Array<IStyle>;
  readonly ampPageName = "amp.html";
  readonly contentPageName = "index.html";
  readonly renderAmpPages = true;
  readonly prettyHtml = true;

  initialized = false;
  baseSourceDirectory = "";
  baseDestDirectory = "";

  constructor(
    baseConfig: IConfig,
    styles: Array<IStyle>,
    layoutsDirectory: string
  ) {
    this.baseConfig = baseConfig;
    this.styles = styles;
    this.layoutsDirectory = layoutsDirectory;
  }

  protected initialize(sourceDirectory: string, destDirectory: string) {
    if (!this.initialized) {
      this.registerTemplatePartials(this.layoutsDirectory);
      registerHbsHelpers();
      this.baseSourceDirectory = sourceDirectory;
      this.baseDestDirectory = destDirectory;

      this.initialized = true;
    }
  }

  public render(sourceDirectory: string, destDirectory: string) {
    this.initialize(sourceDirectory, destDirectory);

    let config = this.baseConfig;
    let sourceDirectoryConfig = loadConfigFile(sourceDirectory);
    config = Object.assign(config, sourceDirectoryConfig);

    const templateData = this.buildTemplateData(config, this.styles);

    // TODO: Make this configurable
    // TODO: Cache these compile templates b/c we are doing this in every directory
    const applyTemplate = this.initializeTemplate(
      path.join(this.layoutsDirectory, "content.hbs")
    );

    const ampApplyTemplate = this.initializeTemplate(
      path.join(this.layoutsDirectory, "amp.hbs")
    );

    const pages: Array<IContentPage> = [];
    const sourceDirectoryFileNames = fs.readdirSync(sourceDirectory);
    const contentFileNames = sourceDirectoryFileNames
      .filter(
        f =>
          !f.startsWith("_") &&
          !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
          ["md"].includes(path.extname(f).substr(1))
      )
      // Sort by filename
      .sort((first: string, second: string) => {
        return first.localeCompare(second, "en", { numeric: true });
      });

    for (let currentFileName of contentFileNames) {
      const contentFile = this.readContentFile(
        path.join(sourceDirectory, currentFileName)
      );

      const pageContent = this.renderContentFile(
        currentFileName,
        contentFile,
        applyTemplate,
        templateData,
        config,
        destDirectory
      );

      if (this.renderAmpPages) {
        this.renderAmpContentFile(
          pageContent,
          contentFile,
          ampApplyTemplate,
          templateData
        );
      }

      pages.push(pageContent);
    }

    // Traverse subdirectories and render pages
    const subDirectoryNames = sourceDirectoryFileNames.filter(f => {
      return fs.statSync(path.join(sourceDirectory, f)).isDirectory();
    });

    for (let subDirectoryName of subDirectoryNames) {
      const subDirectorySource = path.join(sourceDirectory, subDirectoryName);
      const subDirectoryDest = path.join(destDirectory, subDirectoryName);
      const subContent = this.render(subDirectorySource, subDirectoryDest);
      pages.push(...subContent);
    }

    // Now that we've render pages in sourceDirectory and all subdirectories...
    // Render templates
    const indexFileNames = sourceDirectoryFileNames.filter(
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

  private renderContentFile(
    currentFileName: string,
    content: IContentSource,
    applyTemplate: handlebars.TemplateDelegate<any>,
    templateData: ITemplateData,
    config: IConfig,
    destDirectory: string
  ) {
    // Defaults
    let date = content.data.date;
    let slug = content.data.slug;
    let title = content.data.title;

    const fileNameMatcher = currentFileName.match(
      /(\d{4}-\d{2}-\d{2})?[_|-]?(.*).md/
    );
    if (fileNameMatcher != null) {
      if (!date) {
        date = fileNameMatcher[1];
      }

      if (!slug) {
        slug = fileNameMatcher[2];
      }
    }

    if (!title) {
      // Default page title to file name (slug)
      title = slug;
    }

    const destDirectorRelativeToBase = destDirectory
      .replace(this.baseDestDirectory, "")
      .replace(/^\//, "");
    const pagePath = path.join(
      destDirectorRelativeToBase,
      config.outPath || "",
      slug
    );
    const pagePathFull = path.join(this.baseDestDirectory, pagePath);

    const ampPath = this.renderAmpPages ? `${pagePath}/amp.html` : null;
    const page = <IContentPage>{
      date,
      path: pagePath,
      path_amp: ampPath,
      title,
      excerpt: content.excerpt
    };

    const templatedOutput = applyTemplate(<ITemplateData>(
      Object.assign({}, templateData, { page }, { content: content.html })
    ));
    // TODO: support other variations of config.outPath like :title/ :year/:title

    fse.emptyDirSync(pagePathFull);
    const prettyOutput = pretty(templatedOutput, { ocd: true });
    fs.writeFileSync(
      path.join(pagePathFull, this.contentPageName),
      prettyOutput
    );

    return page;
  }

  private async renderAmpContentFile(
    page: IContentPage,
    content: IContentSource,
    applyTemplate: handlebars.TemplateDelegate<any>,
    templateData: ITemplateData
  ) {
    if (!this.baseSourceDirectory) {
      throw new Error("baseSourceDirectory not set");
    }

    const templatedOutput = applyTemplate(<ITemplateData>(
      Object.assign({}, templateData, { page }, { content: content.html })
    ));

    const ampOutput = await ampify(templatedOutput, {
      cwd: this.baseSourceDirectory.replace(/\/$/, "")
    });

    const prettyOutput = pretty(ampOutput);
    fs.writeFileSync(
      path.join(this.baseDestDirectory, page.path, this.ampPageName),
      prettyOutput
    );
  }

  private renderTemplateFile(
    sourceDirectory: string,
    destDirectory: string,
    currentFileName: string,
    templateData: ITemplateData,
    pages: Array<IContentPage>
  ) {
    // TODO: Move this to initializeTemplate but we need it because we need templateContent to extract title
    const templateContent = fs.readFileSync(
      path.join(sourceDirectory, currentFileName),
      {
        encoding: "utf-8"
      }
    );
    const parsedMatter = matter(templateContent);
    const applyTemplate = handlebars.compile(parsedMatter.content);

    const page = <IPage>{
      title: parsedMatter.data.title || ""
    };

    const templatedOutput = applyTemplate(<ITemplateData>(
      Object.assign({}, templateData, { page }, { pages })
    ));

    // TODO: don't hardcode .hbs extension
    // TODO: config outPath is ignored for template files...I think this is ok but need to make obvious
    const name = currentFileName.replace(".hbs", "");
    fs.writeFileSync(path.join(destDirectory, name), templatedOutput);
  }

  private readContentFile(filePath: string): IContentSource {
    const source = fs.readFileSync(filePath, { encoding: "utf-8" });

    const parsedMatter = matter(source, {
      excerpt: (input: matter.GrayMatterFile<string>, options) => {
        // Except will be content after front matter and preceeding first line break
        const trimmedContent = input.content.trim();
        const indexOfFirstLineBreak = trimmedContent.indexOf("\n");
        input.excerpt = trimmedContent.substring(
          0,
          indexOfFirstLineBreak > -1 ? indexOfFirstLineBreak : undefined
        );
      }
    });

    const data = parsedMatter.data;
    let excerpt = "";
    let html = "";

    const fileExtension = path.extname(filePath).substr(1);
    switch (fileExtension) {
      case "md":
        // Parse markdown
        html = marked(parsedMatter.content);
        if (parsedMatter.excerpt) {
          excerpt = marked(parsedMatter.excerpt);
        }
        break;
      case "htm":
      case "html":
        html = parsedMatter.content;
        excerpt = parsedMatter.excerpt || "";
        break;
      default:
        throw new Error(`File extension not support: ${fileExtension}`);
    }

    return {
      data,
      html,
      excerpt
    };
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
