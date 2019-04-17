import * as fs from "fs";
import * as path from "path";

import pretty from "pretty";
import * as handlebars from "handlebars";
import ampify = require("@bradymholt/ampify");

import { IContentPage, ITemplateData, IContentSource } from "../interfaces";

export class AmpGenerator {
  readonly ampPageName = "amp.html";
  readonly ampLayout = "amp.hbs";

  readonly baseSourceDirectory: string;
  readonly baseDestDirectory: string;

  readonly applyTemplate: handlebars.TemplateDelegate<any>;

  constructor(
    baseSourceDirectory: string,
    baseDestDirectory: string,
    layoutsDirectory: string
  ) {
    this.baseSourceDirectory = baseSourceDirectory;
    this.baseDestDirectory = baseDestDirectory;

    this.applyTemplate = this.initializeTemplate(
      path.join(layoutsDirectory, this.ampLayout)
    );
  }

  public async render(
    page: IContentPage,
    content: IContentSource,
    templateData: ITemplateData
  ) {
    const templatedOutput = this.applyTemplate(<ITemplateData>(
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

  // TODO: Dry this up - it is in contentGenerator as well
  private initializeTemplate(templateFile: string) {
    const templateContent = fs.readFileSync(templateFile, {
      encoding: "utf-8"
    });
    const applyTemplate = handlebars.compile(templateContent);
    return applyTemplate;
  }
}
