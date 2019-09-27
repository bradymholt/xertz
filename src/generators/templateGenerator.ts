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

  constructor(
    baseTemplateData: ITemplateData,
    templateManager: TemplateManager
  ) {
    this.baseTemplateData = baseTemplateData;
    this.templateManager = templateManager;
  }

  public generate(
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
        // by date
        return second.date.localeCompare(first.date, "en", { numeric: true });
      } else {
        // by filename
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
    // Apply template
    // TODO: pages seems to be a magic object on template files; should be be standizied into a data container object?
    const templateData = Object.assign(
      <ITemplateData>{},
      this.baseTemplateData,
      currentConfig,
      { pages }
    );

    const templateSource = this.templateManager.initializeTemplateFromFile(
      path.join(sourceDirectory, currentFileName)
    );
    const templateOutput = templateSource(templateData);

    // Write file
    // TODO: config dist_path is ignored for template files...I think this is ok but need to make obvious.
    const currentFileExtension = path.extname(currentFileName);
    // Remove extension (i.e. foo.html.hbs => foo.html)
    const outFileNmae = currentFileName.replace(currentFileExtension, "");
    fse.ensureDirSync(destDirectory);
    fs.writeFileSync(path.join(destDirectory, outFileNmae), templateOutput);
  }
}
