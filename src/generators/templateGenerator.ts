import * as fs from "fs";
import * as path from "path";

import matter from "gray-matter";
import * as handlebars from "handlebars";
import { IContentPage, ITemplateData, IPage } from "../interfaces";

export class TemplateGenerator {
  readonly extensionsToInclude = ["hbs"];

  public render(
    sourceDirectory: string,
    destDirectory: string,
    templateData: ITemplateData,
    pages: Array<IContentPage>
  ) {
    const sourceDirectoryFileNames = fs.readdirSync(sourceDirectory);
    const templateFileNamesToDProcess = sourceDirectoryFileNames.filter(f => {
      const extension = path.extname(f).substr(1);
      return (
        !f.startsWith("_") &&
        !fs.lstatSync(path.join(sourceDirectory, f)).isDirectory() &&
        this.extensionsToInclude.includes(extension)
      );
    });
    for (let currentFileName of templateFileNamesToDProcess) {
      this.renderTemplateFile(
        sourceDirectory,
        destDirectory,
        currentFileName,
        templateData,
        pages
      );
    }
  }

  private renderTemplateFile(
    sourceDirectory: string,
    destDirectory: string,
    currentFileName: string,
    templateData: ITemplateData,
    pages: Array<IContentPage>
  ) {
    // TODO: Move this to initializeTemplate but we need it because we need templateContent to extract title
    const { applyTemplate, frontMatter } = this.initializeTemplate(
      path.join(sourceDirectory, currentFileName)
    );

    const page = <IPage>{
      title: frontMatter.title || ""
    };

    // TODO: pages seems to be a magic object on template files; should be be standizied into a data container object?
    const templatedOutput = applyTemplate(<ITemplateData>(
      Object.assign({}, templateData, { page }, { pages })
    ));

    // TODO: config outPath is ignored for template files...I think this is ok but need to make obvious
    const currentFileExtension = path.extname(currentFileName);
    // Remove extension (i.e. foo.html.hbs => foo.html)
    const outFileNmae = currentFileName.replace(currentFileExtension, "");
    fs.writeFileSync(path.join(destDirectory, outFileNmae), templatedOutput);
  }

  private initializeTemplate(templateFile: string) {
    const templateContent = fs.readFileSync(templateFile, {
      encoding: "utf-8"
    });
    const parsedMatter = matter(templateContent);
    const frontMatter = parsedMatter.data;
    const applyTemplate = handlebars.compile(parsedMatter.content);
    return { applyTemplate, frontMatter };
  }
}
