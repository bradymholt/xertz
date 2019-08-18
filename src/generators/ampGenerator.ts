import * as fs from "fs";
import * as path from "path";
import ampify from "@bradymholt/ampify";
import { ITemplateData } from "../interfaces";
import { TemplateManager } from "../templateManager";

/**
 * Generates an AMP page given ITemplateData
 */
export class AmpGenerator {
  public static readonly ampPageName = "amp.html";
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
    const html = applyTemplate(templateData);

    let ampOutput = await ampify(html, {
      cwd: this.baseSourceDirectory
    });

    fs.writeFileSync(
      path.join(
        this.baseDestDirectory,
        templateData.path,
        AmpGenerator.ampPageName
      ),
      ampOutput
    );
  }
}
