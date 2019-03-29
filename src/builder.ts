import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as handlebars from "handlebars";
import * as sass from "node-sass";
import * as interfaces from "./interfaces";
import * as yaml from "js-yaml";
import { PagesRenderer } from "./pagesRenderer";
import { getCurrentDateInISOFormat } from "./dateHelper";

export class Builder {
  readonly baseDirectory: string;
  readonly constants: interfaces.IConstants;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;

    this.constants = {
      contentPath: path.join(baseDirectory, "content"),
      distDirectory: path.join(baseDirectory, "dist"),
      templatePath: path.join(__dirname, "../template"),

      postsDirectoryName: "posts"
    };
  }

  start() {
    this.registerTemplatePartials();
    fse.emptyDirSync(this.constants.distDirectory);

    const templateData = this.getTemplateData();
    const pagesRenderer = new PagesRenderer(
      this.constants,
      this.constants.contentPath,
      templateData
    );
    pagesRenderer.render();

    // robots.txt
    // feed.xml
    // sitemap.xml
  }

  private getTemplateData() {
    const configFileContent = fs.readFileSync(
      path.join(this.baseDirectory, "_config.yml"),
      "utf-8"
    );
    const config = yaml.safeLoad(configFileContent) as interfaces.IConfig;

    const site: interfaces.ITemplateDataSite = {
      name: config.title,
      description: config.description,
      baseurl: "/",
      buildTime: getCurrentDateInISOFormat()
    };

    const styles = this.getStyles();
    const templateData = <interfaces.ITemplateData>{
      site,
      template: { styles }
    };

    return templateData;
  }

  private getStyles() {
    const sassResult = sass.renderSync({
      file: path.join(this.constants.templatePath, "styles.scss"),
      outputStyle: "compressed"
    });
    return sassResult.css.toString();
  }

  private registerTemplatePartials() {
    const templatePartialsFiles = fs
      .readdirSync(this.constants.templatePath)
      .filter(f => f.startsWith("_") && f.endsWith(".html"));
    for (let fileName of templatePartialsFiles) {
      const templateContent = fs.readFileSync(
        path.join(this.constants.templatePath, fileName),
        { encoding: "utf-8" }
      );

      const applyTemplate = handlebars.compile(templateContent);
      const templateName = fileName.match(/_(.*).html/)![1];
      handlebars.registerPartial(templateName, applyTemplate);
    }
  }
}
