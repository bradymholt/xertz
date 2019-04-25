import * as fs from "fs";
import * as path from "path";

import pretty = require("pretty");
import matter = require("gray-matter");
import * as handlebars from "handlebars";
import {
  IConfig,
  ITemplateData,
  IPageConfig,
  IFrontMatter
} from "../interfaces";
import { TemplateManager } from "../templateManager";

export class TemplateGenerator {
  readonly extensionsToInclude = ["hbs"];
  readonly baseTemplateData: ITemplateData;
  readonly templateManager: TemplateManager;

  // Options
  readonly prettyHtml = true;

  constructor(
    baseTemplateData: ITemplateData,
    templateManager: TemplateManager
  ) {
    this.baseTemplateData = baseTemplateData;
    this.templateManager = templateManager;
  }

  public render(
    sourceDirectory: string,
    destDirectory: string,
    currentConfig: IConfig,
    pages: Array<IPageConfig>
  ) {
    const sourceDirectoryFileNames = fs.readdirSync(sourceDirectory);
    const templateFileNamesToProcess = sourceDirectoryFileNames.filter(f => {
      const extension = path.extname(f).substr(1);
      return (
        !f.startsWith("_") &&
        !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
        this.extensionsToInclude.includes(extension)
      );
    });

    // Sort pages by filename
    pages.sort((first, second) => {
      return second.filename.localeCompare(first.filename, "en", {
        numeric: true
      });
    });

    for (let currentFileName of templateFileNamesToProcess) {
      this.renderTemplateFile(
        sourceDirectory,
        destDirectory,
        currentFileName,
        currentConfig,
        pages
      );
    }
  }

  private renderTemplateFile(
    sourceDirectory: string,
    destDirectory: string,
    currentFileName: string,
    currentConfig: IConfig,
    pages: Array<IPageConfig>
  ) {
    const source = fs.readFileSync(
      path.join(sourceDirectory, currentFileName),
      { encoding: "utf-8" }
    );

    const parsedMatter = matter(source);
    const pageConfig: IPageConfig = Object.assign(
      {
        filename: currentFileName
      },
      currentConfig,
      parsedMatter.data as IFrontMatter // front-matter
    );

    // Apply template
    // TODO: pages seems to be a magic object on template files; should be be standizied into a data container object?
    const templateData = Object.assign(
      <ITemplateData>{},
      this.baseTemplateData,
      pageConfig,
      { pages }
    );

    const templatePartial = this.templateManager.initializeTemplate(
      parsedMatter.content
    );
    const templatePartialOutput = templatePartial(templateData);

    let layout = pageConfig.layout;
    if (!layout && currentFileName.match(/\.html?/) != null) {
      // If layout not specified and the filename has .htm(l) in it we will use the default template
      layout = "default";
    }

    let templateLayoutOutput = "";
    if (!layout) {
      // No layout (e.g. xml files)
      templateLayoutOutput = templatePartialOutput;
    } else {
      const templateLayout = this.templateManager.getTemplate(layout);
      templateLayoutOutput = templateLayout(
        Object.assign(templateData, { content: templatePartialOutput })
      );
    }

    templateLayoutOutput = pretty(templateLayoutOutput, { ocd: true });

    // Write file
    // TODO: config base_path is ignored for template files...I think this is ok but need to make obvious.
    const currentFileExtension = path.extname(currentFileName);
    // Remove extension (i.e. foo.html.hbs => foo.html)
    const outFileNmae = currentFileName.replace(currentFileExtension, "");
    fs.writeFileSync(
      path.join(destDirectory, outFileNmae),
      templateLayoutOutput
    );
  }
}
