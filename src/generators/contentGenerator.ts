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
  // Options
  readonly renderAmpPages = true;
  readonly codeHighlight = true;

  readonly styles: Array<interfaces.IStyle>;
  readonly contentPageName = "index.html";
  readonly ignorePrefixes = [".", "_"];
  readonly contentExtensionsToInclude = ["md"];
  readonly assetIgnoreExtensions = ["md", "hbs"];
  readonly templateManager: TemplateManager;
  readonly markedRender: marked.Renderer;
  readonly markedHighlighter: ((code: string, lang: string) => string) | null;

  readonly baseConfig: interfaces.IConfig;
  readonly stylesDirectory: string;
  readonly baseSourceDirectory: string;
  readonly baseDestDirectory: string;
  readonly baseTemplateData: interfaces.ITemplateData;
  readonly templateGenerator: TemplateGenerator;
  readonly ampGenerator: AmpGenerator;

  constructor(
    baseConfig: interfaces.IConfig,
    styles: Array<interfaces.IStyle>,
    stylesDirectory: string,
    layoutsDirectory: string,
    sourceDirectory: string,
    destDirectory: string
  ) {
    this.styles = styles;
    this.stylesDirectory = stylesDirectory;
    this.templateManager = new TemplateManager(layoutsDirectory);
    this.markedRender = this.getMarkedRender();
    this.markedHighlighter = this.codeHighlight ? this.prismHighlighter : null;

    this.baseConfig = baseConfig;
    this.baseSourceDirectory = sourceDirectory;
    this.baseDestDirectory = destDirectory;

    this.baseTemplateData = this.buildBaseTemplateData(baseConfig, this.styles);
    this.templateGenerator = new TemplateGenerator(
      this.baseTemplateData,
      this.templateManager
    );

    this.ampGenerator = new AmpGenerator(
      this.baseSourceDirectory,
      this.baseDestDirectory,
      this.templateManager
    );
  }

  public async generateAll() {
    await this.generate(
      this.baseConfig,
      this.baseSourceDirectory,
      this.baseDestDirectory
    );
  }

  public async generate(
    config: interfaces.IConfig,
    sourceDirectory: string,
    destDirectory: string
  ) {
    const originalDestDirectory = destDirectory;

    let sourceDirectoryConfig = loadConfigFile(sourceDirectory);
    // Merge any _config.yml file in current directory with baseConfig to gather config for current directory
    let currentDirectoryPageConfig = Object.assign(
      <interfaces.IPageConfig>{},
      config,
      sourceDirectoryConfig
    );

    // If this directory contains an index.md file, it is designated as a content package directory.
    const isContentPackageDirectory = fse.existsSync(
      path.join(sourceDirectory, "index.md")
    );

    if (isContentPackageDirectory) {
      const fileNameMatcher = path
        .basename(destDirectory)
        .match(/(\d{4}-\d{2}-\d{2})?[_|-]?(.*)/);
      if (fileNameMatcher != null) {
        currentDirectoryPageConfig.date = fileNameMatcher[1];
        currentDirectoryPageConfig.slug = (
          fileNameMatcher[2] || ""
        ).toLowerCase();
      }
    }

    if (currentDirectoryPageConfig.dist_path) {
      // dist_path is specified in config which will modify the destination folder
      destDirectory = path.join(
        this.baseDestDirectory,
        currentDirectoryPageConfig.dist_path.replace(/^\//, "")
      );

      if (isContentPackageDirectory) {
        destDirectory = path.join(
          destDirectory,
          currentDirectoryPageConfig.slug
        );
      }
    }

    fse.ensureDirSync(destDirectory);

    const sourceDirectoryFileNames = fs.readdirSync(sourceDirectory);

    // Process asset files
    this.processAssetFiles(
      sourceDirectory,
      sourceDirectoryFileNames,
      destDirectory,
      isContentPackageDirectory
    );

    // Process markdown content files
    const pages = await this.processContentFiles(
      sourceDirectory,
      sourceDirectoryFileNames,
      destDirectory,
      currentDirectoryPageConfig,
      isContentPackageDirectory
    );

    // Traverse subdirectories if this is not a content package directory
    if (!isContentPackageDirectory) {
      const subDirectoryNames = sourceDirectoryFileNames.filter(f => {
        return (
          this.ignorePrefixes.findIndex(i => f.startsWith(i)) == -1 &&
          path.join(sourceDirectory, f) != this.stylesDirectory &&
          fs.statSync(path.join(sourceDirectory, f)).isDirectory()
        );
      });

      for (let subDirectoryName of subDirectoryNames) {
        const subSourceDirectory = path.join(sourceDirectory, subDirectoryName);
        const subDestDirectory = path.join(destDirectory, subDirectoryName);
        const subContent = await this.generate(
          currentDirectoryPageConfig,
          subSourceDirectory,
          subDestDirectory
        );
        pages.push(...subContent);
      }
    }

    // Generate any template pages in the source directory using pages from current and all subdirectories
    // We do this last because we need the pages array with all the content for inclusion in the template pages.
    if (this.templateGenerator) {
      this.templateGenerator.generate(
        sourceDirectory,
        // TODO: This behavior is not obvious
        // Templates gen generated in the original destination directory and ignore any dist_path config;
        originalDestDirectory,
        currentDirectoryPageConfig,
        pages
      );
    }

    return pages;
  }

  private processAssetFiles(
    sourceDirectory: string,
    sourceDirectoryFileNames: string[],
    destDirectory: string,
    recursive = false
  ) {
    const assetFileNames = sourceDirectoryFileNames.filter(
      f =>
        this.ignorePrefixes.findIndex(i => f.startsWith(i)) == -1 &&
        !this.assetIgnoreExtensions.includes(path.extname(f).substr(1)) &&
        (!this.baseConfig.ignore_filenames ||
          !this.baseConfig.ignore_filenames.includes(f)) &&
        (recursive ||
          !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory())
    );
    for (let currentFileName of assetFileNames) {
      fse.copySync(
        path.join(sourceDirectory, currentFileName),
        path.join(destDirectory, currentFileName)
      );
    }
    return sourceDirectoryFileNames;
  }

  private async processContentFiles(
    sourceDirectory: string,
    sourceDirectoryFileNames: string[],
    destDirectory: string,
    currentDirectoryConfig: interfaces.IPageConfig,
    isContentPackageDirectory: boolean
  ) {
    const pages: Array<interfaces.IPageConfig> = [];
    const contentFileNames = sourceDirectoryFileNames.filter(
      f =>
        this.ignorePrefixes.findIndex(i => f.startsWith(i)) == -1 &&
        !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
        this.contentExtensionsToInclude.includes(path.extname(f).substr(1))
    );
    for (let currentFileName of contentFileNames) {
      const currentPageConfig = Object.assign({}, currentDirectoryConfig);
      currentPageConfig.filename = currentFileName;
      currentPageConfig.source = path.join(sourceDirectory, currentFileName);

      this.renderContentFile(
        currentPageConfig,
        destDirectory,
        isContentPackageDirectory
      );
      await this.renderAmpFile(currentPageConfig);

      pages.push(currentPageConfig);
    }
    return pages;
  }

  private renderContentFile(
    pageConfig: interfaces.IPageConfig,
    destDirectory: string,
    isContentPackageDirectory: boolean
  ) {
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

    // Ensure slug is lower case
    pageConfig.slug = pageConfig.slug.toLowerCase();

    if (!pageConfig.title) {
      // If page title not available use file name slug
      pageConfig.title = pageConfig.slug;
    }

    if (pageConfig.date) {
      pageConfig.year = pageConfig.date.substr(0, 4);
    }

    if (!isContentPackageDirectory) {
      destDirectory = path.join(destDirectory, pageConfig.slug);
    } else {
    }

    // path is set to directory relative to _dist/ folder in for format: "about-me/"
    pageConfig.path =
      destDirectory.replace(`${this.baseDestDirectory}/`, "") + "/";
    // path should always be lower case
    pageConfig.path = pageConfig.path.toLowerCase();

    if (this.renderAmpPages) {
      pageConfig.path_amp = pageConfig.path + AmpGenerator.ampPageName;
    }

    const contentFile = this.parseContentFile(pageConfig);

    // TODO: This is going to cause the full content to remain in memory during generation; circle back on how to improve this
    pageConfig.content_html = contentFile.html;

    const applyTemplate = this.templateManager.getTemplate(
      pageConfig.layout || "default"
    );
    // Apply template
    const templateData = Object.assign(
      <interfaces.ITemplateData>{},
      this.baseTemplateData,
      pageConfig
    );
    let templatedOutput = applyTemplate(templateData);

    // Write file
    console.log(path.join(pageConfig.path));
    destDirectory = path.join(this.baseDestDirectory, pageConfig.path);
    fse.ensureDirSync(destDirectory);
    fs.writeFileSync(
      path.join(destDirectory, this.contentPageName),
      templatedOutput
    );
  }

  private parseContentFile(
    pageConfig: interfaces.IPageConfig
  ): interfaces.IContentSource {
    const source = fs.readFileSync(pageConfig.source, { encoding: "utf-8" });

    const parsedMatter = matter(source);

    let markdownContent = parsedMatter.content;
    // Prepend relative image references with path
    markdownContent = markdownContent
      .replace(/!\[.+\]\(([^"\/\:!]+)\)/g, (match, filename) => {
        // Markdown format:
        //   ![Smile](smile.png) => ![Smile](my-most/smile.png)
        return match.replace(
          filename,
          path.join("/", pageConfig.path, filename)
        );
      })
      .replace(/(src|href)=\"([^"\/\:]+)\"/g, (match, attribute, filename) => {
        // html (href/src) format:
        //   <img src="smile.png" /> => <img src="/my-most/smile.png" />
        //   <a href="IMG_20130526_165208.jpg">Foo</a> => <a href="/my-most/IMG_20130526_165208.jpg">Foo</a>
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

  private async renderAmpFile(currentPageConfig: interfaces.IPageConfig) {
    if (this.renderAmpPages) {
      try {
        await this.ampGenerator.generate(
          currentPageConfig,
          this.baseTemplateData
        );
      } catch (err) {
        console.error(
          `Error generating AMP file for '${currentPageConfig.path_amp}' - ${err}`
        );
      }
    }
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
      const codeWithNewlineHints = code.replace(
        /\n/g,
        // Prepend each newline with a zero-width space character so we can signal to any upstream formatting to leave the formatted code alone.
        "\u200b\n"
      );

      return `
<pre class="${className}"><code class="${className}">${codeWithNewlineHints}</code></pre>
`;
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
