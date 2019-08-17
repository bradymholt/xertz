import * as fs from "fs";
import * as path from "path";
import ampify from "@bradymholt/ampify";
import { ITemplateData, IPageConfig } from "../interfaces";
import { TemplateManager } from "../templateManager";

/**
 * Generates an AMP page given ITemplateData
 */
export class AmpGenerator {
  readonly ampPageName = "amp.html";
  readonly ampLayout = "amp";

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

  public async generate(templateData: ITemplateData) {
    const applyTemplate = this.templateManager.getTemplate(this.ampLayout);
    const templatedOutput = applyTemplate(templateData);

    let ampOutput = await ampify(templatedOutput, {
      cwd: this.baseSourceDirectory.replace(/\/$/, "")
    });

    fs.writeFileSync(
      path.join(this.baseDestDirectory, templateData.path, this.ampPageName),
      ampOutput
    );
  }
}
