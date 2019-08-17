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

  public async generate(
    baseConfig: interfaces.IConfig,
    sourceDirectory: string,
    destDirectory: string
  ) {
    this.initialize(baseConfig, sourceDirectory, destDirectory);

    let sourceDirectoryConfig = loadConfigFile(sourceDirectory);
    let currentConfig: interfaces.IPageConfig = <interfaces.IPageConfig>(
      Object.assign({}, baseConfig, sourceDirectoryConfig, {})
    );

    // The following config cannot be inherited and must be determined for each content file.
    currentConfig.date = "";
    currentConfig.slug = "";
    currentConfig.filename = "";

    const pages: Array<interfaces.IPageConfig> = [];
    const sourceDirectoryFileNames = fs.readdirSync(sourceDirectory);
    const contentFileNames = sourceDirectoryFileNames.filter(
      f =>
        !f.startsWith("_") &&
        !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
        this.contentExtensionsToInclude.includes(path.extname(f).substr(1))
    );

    const isContentPackageDirectory = fse.existsSync(
      path.join(sourceDirectory, "index.md")
    );

    if (isContentPackageDirectory) {
      const fileNameMatcher = path
        .basename(destDirectory)
        .match(/(\d{4}-\d{2}-\d{2})?[_|-]?(.*)/);
      if (fileNameMatcher != null) {
        currentConfig.date = fileNameMatcher[1];
        currentConfig.slug = fileNameMatcher[2];
      }
    }

    // Determine actualDestDirectory
    let actualDestDirectory = destDirectory;
    if (currentConfig.dist_path) {
      actualDestDirectory = path.join(
        this.baseDestDirectory,
        currentConfig.dist_path.replace(/^\//, "")
      );

      if (isContentPackageDirectory) {
        actualDestDirectory = path.join(
          actualDestDirectory,
          currentConfig.slug
        );
      }
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
      const currentPageConfig = Object.assign({}, currentConfig);
      currentPageConfig.filename = currentFileName;
      currentPageConfig.source = path.join(sourceDirectory, currentFileName);

      const { pageConfig, templateData } = this.renderContentFile(
        currentPageConfig,
        actualDestDirectory
      );

      if (this.renderAmpPages && this.ampGenerator) {
        try {
          await this.ampGenerator.generate(templateData);
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
      const subSourceDirectory = path.join(sourceDirectory, subDirectoryName);
      const subDestDirectory = path.join(destDirectory, subDirectoryName);
      const subContent = await this.generate(
        currentConfig,
        subSourceDirectory,
        subDestDirectory
      );
      pages.push(...subContent);
    }

    // Generate any template pages in the source directory using pages from current and all subdirectories
    // We do this last because we need the pages array with all the content for inclusion in the template pages.
    if (this.templateGenerator) {
      this.templateGenerator.generate(
        sourceDirectory,
        destDirectory,
        currentConfig,
        pages
      );
    }

    return pages;
  }

  private renderContentFile(
    pageConfig: interfaces.IPageConfig,
    actualDestDirectory: string
  ) {
    const isContentPackageDirectory = pageConfig.filename == "index.md";

    if (!pageConfig.slug && pageConfig.permalink) {
      // Honor "permalink" alias for slug
      pageConfig.slug = pageConfig.permalink;
    }

    if (!pageConfig.date || !pageConfig.slug) {
      // date or slug is not specified so determine from filename or content package folder name
      const fileNameMatcher = pageConfig.filename
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
      actualDestDirectory = path.join(actualDestDirectory, pageConfig.slug);
    }

    // path is set to directory relative to _dist/ folder
    pageConfig.path = actualDestDirectory
      .replace(this.baseDestDirectory, "")
      .replace(/^\//, "");

    if (this.renderAmpPages) {
      pageConfig.path_amp = pageConfig.path + "amp.html";
    }

    const contentFile = this.parseContentFile(pageConfig);

    // Apply template
    const templateData = Object.assign(
      <interfaces.ITemplateData>{},
      this.baseTemplateData,
      pageConfig,
      { content: contentFile.html }
    );

    const applyTemplate = this.templateManager.getTemplate(
      pageConfig.layout || "default"
    );
    let templatedOutput = applyTemplate(templateData);

    // Write file
    console.log(path.join(pageConfig.path));
    const destDirectory = path.join(this.baseDestDirectory, pageConfig.path);
    fse.ensureDirSync(destDirectory);
    fs.writeFileSync(
      path.join(destDirectory, this.contentPageName),
      templatedOutput
    );

    return { pageConfig, templateData };
  }

  private parseContentFile(
    pageConfig: interfaces.IPageConfig
  ): interfaces.IContentSource {
    const source = fs.readFileSync(pageConfig.source, { encoding: "utf-8" });

    const parsedMatter = matter(source);

    let markdownContent = parsedMatter.content;
    // Prepend relative image references with path
    markdownContent = markdownContent
      .replace(/!\[.+\]\((\w+.*)\)/, (match, filename) => {
        // Markdown format (![Smile](smile.png) => ![Smile](my-most/smile.png))
        return match.replace(
          filename,
          path.join("/", pageConfig.path, filename)
        );
      })
      .replace(/<img\s.*\ssrc=\"([^"]+)\"/g, (match, filename) => {
        // html format (<img src="smile.png" /> => <img src="my-most/smile.png" />)
        return match.replace(
          filename,
          path.join("/", pageConfig.path, filename)
        );
      });

    const frontMatter = parsedMatter.data as interfaces.IFrontMatter;
    // Add front matter config
    pageConfig = Object.assign(pageConfig, frontMatter);
    if (pageConfig.date && <any>pageConfig.date instanceof Date) {
      // pageConfig.date is a Date object so convert it to ISO format.
      // This happens because gray-matter parses unquoted ISO dates and converts them to date object
      const date: Date = <any>pageConfig.date;
      const isoDate = date.toISOString();
      pageConfig.date = isoDate.substr(0, 10);
    }

    let html = "";
    const fileExtension = path.extname(pageConfig.filename).substr(1);
    switch (fileExtension) {
      case "md":
        // Parse markdown
        html = marked(markdownContent, {
          smartypants: true,
          highlight: this.codeHighlight ? this.prismHighlighter : undefined,
          renderer: this.markedRender
        });
        break;
      default:
        throw new Error(`File extension not support: ${fileExtension}`);
    }

    // Extract exceprt as first <p/> if not already specified
    if (!pageConfig.excerpt) {
      const indexOfFirstParagraph = html.indexOf("<p>");
      if (indexOfFirstParagraph > -1) {
        const indexOfEndOfFirstParagraph = html.indexOf(
          "</p>",
          indexOfFirstParagraph
        );
        if (indexOfEndOfFirstParagraph > -1) {
          pageConfig.excerpt = html.substring(
            indexOfFirstParagraph + 3,
            indexOfEndOfFirstParagraph
          );
        }
      }
    }

    return {
      data: frontMatter,
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
