import * as fs from "fs";
import * as path from "path";

import * as handlebars from "handlebars";
import ampify from "@bradymholt/ampify";

import { ITemplateData, IPageConfig } from "../interfaces";
import { TemplateManager } from "../templateManager";

export class AmpGenerator {
  readonly ampPageName = "amp.html";
  readonly ampLayout = "amp";

  // Options
  
  readonly baseSourceDirectory: string;
  readonly baseDestDirectory: string;
  readonly templateManager: TemplateManager;

  constructor(
    baseSourceDirectory: string,
    baseDestDirectory: string,
    templateManager: TemplateManager
  ) {
    this.baseSourceDirectory = baseSourceDirectory;
    this.baseDestDirectory = baseDestDirectory;
    this.templateManager = templateManager;
  }

  public async render(pageConfig: IPageConfig, templateData: ITemplateData) {
    const applyTemplate = this.templateManager.getTemplate(this.ampLayout);
    const templatedOutput = applyTemplate(templateData);

    let ampOutput = await ampify(templatedOutput, {
      cwd: this.baseSourceDirectory.replace(/\/$/, "")
    });   

    fs.writeFileSync(
      path.join(this.baseDestDirectory, pageConfig.path, this.ampPageName),
      ampOutput
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
