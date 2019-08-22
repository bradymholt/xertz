import * as fs from "fs";
import * as path from "path";
import * as handlebars from "handlebars";
import registerHbsHelpers from "./hbs-helpers";

export class TemplateManager {
  readonly layoutsDirectory: string;
  readonly layouts: { [name: string]: handlebars.TemplateDelegate<any> };

  initialized = false;

  constructor(layoutDirectory: string) {
    this.layoutsDirectory = layoutDirectory;
    this.layouts = {};
  }

  public getTemplate(name: string, useCache: boolean = true) {
    if (!this.initialized) {
      this.initialize();
    }

    let template = null;
    if (useCache) {
      template = this.layouts[name];
    }

    if (!template) {
      template = this.initializeTemplateFromFile(
        path.join(this.layoutsDirectory, name + ".hbs")
      );
    }

    if (useCache) {
      this.layouts[name] = template;
    }

    return template;
  }

  public initializeTemplate(templateContent: string) {
    const applyTemplate = handlebars.compile(templateContent, { preventIndent: true });
    return applyTemplate;
  }

  private initialize() {
    if (!this.initialized) {
      this.registerTemplatePartials();
      registerHbsHelpers();

      this.initialized = true;
    }
  }

  private registerTemplatePartials() {
    // TODO: support partials in subdirectories
    const templatePartialsFiles = fs
      .readdirSync(this.layoutsDirectory)
      .filter(f => f.endsWith(".hbs"));

    for (let fileName of templatePartialsFiles) {
      const templateContent = fs.readFileSync(
        path.join(this.layoutsDirectory, fileName),
        { encoding: "utf-8" }
      );

      let templateName = path.parse(fileName).name;
      if (templateName.startsWith("_")) {
        templateName = templateName.substr(1);
      }
      handlebars.registerPartial(templateName, templateContent);
    }
  }

  private initializeTemplateFromFile(templateFile: string) {
    const templateContent = fs.readFileSync(templateFile, {
      encoding: "utf-8"
    });
    return this.initializeTemplate(templateContent);
  }
}
