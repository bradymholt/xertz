import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as handlebars from "handlebars";
import * as interfaces from "./interfaces";
import * as yaml from "js-yaml";
import { ContentRenderer } from "./contentRenderer";
import { getCurrentDateInISOFormat } from "./dateHelper";
import { IStyle } from "./interfaces";
import registerHbsHelpers from "./hbs-helpers"

export class Builder {
  readonly baseDirectory: string;
  readonly constants: interfaces.IConstants;
  

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;

    this.constants = {
      contentPath: path.join(baseDirectory, "content"),
      templatePath: path.join(baseDirectory, "template"),
      distDirectory: path.join(baseDirectory, "dist")
    };
  }

  start() {
    fse.emptyDirSync(this.constants.distDirectory);

    this.registerTemplatePartials();
    registerHbsHelpers();

    const config = this.loadConfig();
    const templateData = this.getTemplateData(config);

    const contentRenderer = new ContentRenderer(
      this.constants.contentPath,
      this.constants.distDirectory,
      this.constants,      
      templateData
    );
    contentRenderer.render();
  }

  private loadConfig() {
    const configFileContent = fs.readFileSync(
      path.join(this.baseDirectory, "_config.yml"),
      "utf-8"
    );
    const config = yaml.safeLoad(configFileContent) as interfaces.IConfig;
    return config;
  }

  private getTemplateData(config: interfaces.IConfig) {
    // Render styles and group by name
    const styles = this.renderAssets(config);
    const assets: {
      [partialName: string]: IStyle;
    } = styles.reduce(
      (root: { [partialName: string]: IStyle }, current: IStyle) => {
        root[current.name] = current;
        return root;
      },
      {} as { [partialName: string]: IStyle }
    );

    const templateData = <interfaces.ITemplateData>{
      config,
      buildDate: getCurrentDateInISOFormat(),
      template: { assets }
    };

    return templateData;
  }

  private renderAssets(config: interfaces.IConfig) {
    const contentRenderer = new ContentRenderer(
      path.join(this.constants.templatePath, "assets"),
      path.join(this.constants.distDirectory, "assets"),
      this.constants,
      { config, buildDate: getCurrentDateInISOFormat() }
    );
    contentRenderer.render();
    return contentRenderer.renderedStyles;
  }

  private registerTemplatePartials() {
    const layoutsDirectory = path.join(this.constants.templatePath, "layouts");
    // TODO: support partials in subdirectories
    const templatePartialsFiles = fs
      .readdirSync(layoutsDirectory)
      .filter(f => f.startsWith("_") && f.endsWith(".hbs"));

    for (let fileName of templatePartialsFiles) {
      const templateContent = fs.readFileSync(
        path.join(layoutsDirectory, fileName),
        { encoding: "utf-8" }
      );

      const templateName = path.parse(fileName).name.substr(1);
      handlebars.registerPartial(templateName, templateContent); 
    }
  }
}
