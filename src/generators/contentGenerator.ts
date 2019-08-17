import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";

import marked from "marked";
import matter from "gray-matter";
import prismjs from "prismjs";

import { loadConfigFile } from "../configHelper";
import * as interfaces from "../interfaces";
import { TemplateGenerator } from "./templateGenerator";
import { AmpGenerator } from "./ampGenerator";
import { TemplateManager } from "../templateManager";

export class ContentGenerator {
  readonly styles: Array<interfaces.IStyle>;
  readonly contentPageName = "index.html";
  readonly contentExtensionsToInclude = ["md"];

  // Options
  readonly renderAmpPages = true;
  readonly codeHighlight = true;

  initialized = false;
  baseSourceDirectory = "";
  baseDestDirectory = "";

  baseTemplateData: interfaces.ITemplateData | null = null;
  templateGenerator: TemplateGenerator | null = null;
  ampGenerator: AmpGenerator | null = null;
  readonly templateManager: TemplateManager;
  readonly markedRender: marked.Renderer;
  readonly markedHighlighter: ((code: string, lang: string) => string) | null;

  constructor(styles: Array<interfaces.IStyle>, layoutsDirectory: string) {
    this.styles = styles;

    this.templateManager = new TemplateManager(layoutsDirectory);
    this.markedRender = this.getMarkedRender();
    this.markedHighlighter = this.codeHighlight ? this.prismHighlighter : null;
  }

  protected initialize(
    config: interfaces.IConfig,
    sourceDirectory: string,
    destDirectory: string
  ) {
    if (!this.initialized) {
      this.baseSourceDirectory = sourceDirectory;
      this.baseDestDirectory = destDirectory;

      this.baseTemplateData = this.buildBaseTemplateData(config, this.styles);

      this.templateGenerator = new TemplateGenerator(
        this.baseTemplateData,
        this.templateManager
      );

      if (this.renderAmpPages) {
        this.ampGenerator = new AmpGenerator(
          this.baseSourceDirectory,
          this.baseDestDirectory,
          this.templateManager
        );
      }

      this.initialized = true;
    }
  }

  public async render(
    baseConfig: interfaces.IConfig,
    sourceDirectory: string,
    destDirectory: string
  ) {
    this.initialize(baseConfig, sourceDirectory, destDirectory);

    let sourceDirectoryConfig = loadConfigFile(sourceDirectory);
    let currentConfig = Object.assign(baseConfig, sourceDirectoryConfig);

    const pages: Array<interfaces.IPageConfig> = [];
    const sourceDirectoryFileNames = fs.readdirSync(sourceDirectory);
    const contentFileNames = sourceDirectoryFileNames.filter(
      f =>
        !f.startsWith("_") &&
        !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
        this.contentExtensionsToInclude.includes(path.extname(f).substr(1))
    );

    const currenPageConfig: interfaces.IPageConfig = <interfaces.IPageConfig>(
      Object.assign({}, currentConfig)
    );

    const isContentPackageDirectory = fse.existsSync(
      path.join(sourceDirectory, "index.md")
    );

    if (isContentPackageDirectory) {
      const fileNameMatcher = path
        .basename(destDirectory)
        .match(/(\d{4}-\d{2}-\d{2})?[_|-]?(.*)/);
      if (fileNameMatcher != null) {
        currenPageConfig.date = fileNameMatcher[1];
        currenPageConfig.slug = fileNameMatcher[2];
      }
    }

    // Determine actualDestDirectory
    let actualDestDirectory = destDirectory;
    if (currenPageConfig.dist_path) {
      actualDestDirectory = path.join(
        this.baseDestDirectory,
        currenPageConfig.dist_path.replace(/^\//, "")
      );
    }
    if (isContentPackageDirectory) {
      actualDestDirectory = path.join(
        actualDestDirectory,
        currenPageConfig.slug
      );
    }

    fse.ensureDirSync(actualDestDirectory);

    // copy assets
    const assetIgnoreExtensions = ["scss", "sass", "css", "md", "hbs"];
    const assetFileNames = sourceDirectoryFileNames.filter(
      f =>
        !f.startsWith("_") &&
        !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
        !assetIgnoreExtensions.includes(path.extname(f).substr(1))
    );
    for (let currentFileName of assetFileNames) {
      fse.copyFileSync(
        path.join(sourceDirectory, currentFileName),
        path.join(actualDestDirectory, currentFileName)
      );
    }

    for (let currentFileName of contentFileNames) {
      const contentFile = this.readContentFile(
        path.join(sourceDirectory, currentFileName)
      );

      const { pageConfig, templateData } = this.renderContentFile(
        currentFileName,
        contentFile,
        currenPageConfig,
        actualDestDirectory
      );

      if (this.renderAmpPages && this.ampGenerator) {
        try {
          await this.ampGenerator.render(pageConfig, templateData);
        } catch (err) {
          console.error(
            `Error generating AMP file for '${currentFileName}' - ${err}`
          );
        }
      }
      // templateData contains the content and we don't want this to stay in memory
      pages.push(pageConfig);
    }

    // Traverse subdirectories and render pages
    const subDirectoryNames = sourceDirectoryFileNames.filter(f => {
      return fs.statSync(path.join(sourceDirectory, f)).isDirectory();
    });

    for (let subDirectoryName of subDirectoryNames) {
      const subDirectorySource = path.join(sourceDirectory, subDirectoryName);
      const subDirectoryDest = path.join(destDirectory, subDirectoryName);
      const subContent = await this.render(
        currentConfig,
        subDirectorySource,
        subDirectoryDest
      );
      pages.push(...subContent);
    }

    // Generate any template pages in the source directory using pages from current and all subdirectories
    // We do this last because we need the pages array with all the content for inclusion in the template pages.
    if (this.templateGenerator) {
      this.templateGenerator.render(
        sourceDirectory,
        destDirectory,
        currentConfig,
        pages
      );
    }

    return pages;
  }

  private renderContentFile(
    currentFileName: string,
    content: interfaces.IContentSource,
    currentPageConfig: interfaces.IPageConfig,
    destDirectory: string
  ) {
    const pageConfig: interfaces.IPageConfig = Object.assign(
      currentPageConfig,
      {
        filename: currentFileName
      },
      content.data // front-matter,
    );

    const isContentPackageDirectory = currentFileName == "index.md";

    if (pageConfig.date && <any>pageConfig.date instanceof Date) {
      // pageConfig.date is a Date object so convert it to ISO format.
      // This happens because gray-matter parses unquoted ISO dates and converts them to date object
      const date: Date = <any>pageConfig.date;
      const isoDate = date.toISOString();
      pageConfig.date = isoDate.substr(0, 10);
    }

    if (!pageConfig.slug && pageConfig.permalink) {
      // Honor "permalink" alias for slug
      pageConfig.slug = pageConfig.permalink;
    }

    if (!pageConfig.date || !pageConfig.slug) {
      // date or slug is not specified so determine from filename or content package folder name
      const fileNameMatcher = currentFileName
        .replace(/\.[\w]+$/, "")
        .match(/(\d{4}-\d{2}-\d{2})?[_|-]?(.*)\.?/);
      if (fileNameMatcher != null) {
        if (!pageConfig.date) {
          pageConfig.date = fileNameMatcher[1];
        }

        if (!pageConfig.slug) {
          pageConfig.slug = fileNameMatcher[2];
        }
      }
    }

    if (!pageConfig.title) {
      // If page title not available use file name slug
      pageConfig.title = pageConfig.slug;
    }

    if (pageConfig.date) {
      pageConfig.year = pageConfig.date.substr(0, 4);
    }

    if (!isContentPackageDirectory) {
      destDirectory = path.join(destDirectory, pageConfig.slug);
    }

    // path is set to directory relative to _dist/ folder
    pageConfig.path = destDirectory
      .replace(this.baseDestDirectory, "")
      .replace(/^\//, "");

    if (this.renderAmpPages) {
      pageConfig.path_amp = pageConfig.path + "amp.html";
    }

    // Apply template
    const templateData = Object.assign(
      <interfaces.ITemplateData>{},
      this.baseTemplateData,
      pageConfig,
      { content: content.html }
    );

    const applyTemplate = this.templateManager.getTemplate(
      pageConfig.layout || "default"
    );
    let templatedOutput = applyTemplate(templateData);

    // Write file
    fse.ensureDirSync(destDirectory);
    fs.writeFileSync(
      path.join(destDirectory, this.contentPageName),
      templatedOutput
    );

    return { pageConfig, templateData };
  }

  private readContentFile(filePath: string): interfaces.IContentSource {
    const source = fs.readFileSync(filePath, { encoding: "utf-8" });

    const parsedMatter = matter(source);
    const data = parsedMatter.data as interfaces.IFrontMatter;
    let html = "";

    const fileExtension = path.extname(filePath).substr(1);
    switch (fileExtension) {
      case "md":
        // Parse markdown
        html = marked(parsedMatter.content, {
          smartypants: true,
          highlight: this.codeHighlight ? this.prismHighlighter : undefined,
          renderer: this.markedRender
        });
        break;
      default:
        throw new Error(`File extension not support: ${fileExtension}`);
    }

    // Extract exceprt as first <p/> if not already specified
    if (!data.excerpt) {
      const indexOfFirstParagraph = html.indexOf("<p>");
      if (indexOfFirstParagraph > -1) {
        const indexOfEndOfFirstParagraph = html.indexOf(
          "</p>",
          indexOfFirstParagraph
        );
        if (indexOfEndOfFirstParagraph > -1) {
          data.excerpt = html.substring(
            indexOfFirstParagraph + 3,
            indexOfEndOfFirstParagraph
          );
        }
      }
    }

    return {
      data,
      html
    };
  }

  private prismHighlighter(code: string, lang: string) {
    // Translate aliases
    if (lang == "shell") {
      lang = "bash";
    }

    if (!prismjs.languages[lang]) {
      try {
        require("prismjs/components/prism-" + lang + ".js");
      } catch (err) {
        console.error(`Unable to load Prism language: '${lang}' - ${err}`);
      }
    }
    return prismjs.highlight(
      code,
      prismjs.languages[lang] || prismjs.languages.markup,
      ""
    );
  }

  private getMarkedRender() {
    const renderer = new marked.Renderer();
    renderer.code = function(code: string, language: string) {
      const options = (<any>this).options;
      var lang = (language || "markup").match(/\S*/)![0];
      if (options.highlight) {
        var out = options.highlight(code, lang);
        if (out != null && out !== code) {
          code = out;
        }
      }

      const className = options.langPrefix + lang;
      return `<pre class="${className}"><code class="${className}">${code}</code></pre>`;
    };
    return renderer;
  }

  private buildBaseTemplateData(
    config: interfaces.IConfig,
    stylesList: Array<interfaces.IStyle>
  ) {
    // Structure styles as object (i.e. styles.default.content)
    const styles: {
      [partialName: string]: interfaces.IStyle;
    } = stylesList.reduce(
      (
        root: { [partialName: string]: interfaces.IStyle },
        current: interfaces.IStyle
      ) => {
        root[current.name] = current;
        return root;
      },
      {} as { [partialName: string]: interfaces.IStyle }
    );

    const templateData = Object.assign(<interfaces.ITemplateData>{}, config, {
      styles
    });

    return templateData;
  }
}
