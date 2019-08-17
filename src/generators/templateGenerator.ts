import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";

import matter from "gray-matter";
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

    // Sort pages
    pages.sort((first, second) => {
      if (!!first.date && !!second.date) {
        return second.date.localeCompare(first.date, "en", { numeric: true });
      } else {
        return second.filename.localeCompare(first.filename, "en", {
          numeric: true
        });
      }
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
    const isHtmlFile = currentFileName.match(/\.html?/) != null;
    const source = fs.readFileSync(
      path.join(sourceDirectory, currentFileName),
      { encoding: "utf-8" }
    );

    const parsedMatter = matter(source);
    const pageConfig: IPageConfig = Object.assign(
      {
        base_path: "",
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
    if (!layout && isHtmlFile) {
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

    // Write file
    // TODO: config dist_path is ignored for template files...I think this is ok but need to make obvious.
    const currentFileExtension = path.extname(currentFileName);
    // Remove extension (i.e. foo.html.hbs => foo.html)
    const outFileNmae = currentFileName.replace(currentFileExtension, "");
    fse.ensureDirSync(destDirectory);
    fs.writeFileSync(
      path.join(destDirectory, outFileNmae),
      templateLayoutOutput
    );
  }
}
