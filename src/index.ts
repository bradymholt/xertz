import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as handlebars from "handlebars";
import marked from "marked";
import * as sass from "node-sass";
import {
  ITemplateData,
  ITemplateDataSite,
  IConstants  
} from "./interfaces";
import { PagesRenderer } from "./pagesRenderer";

export class Amplog {
  readonly constants: IConstants;

  constructor() {
    this.constants = {
      distPath: path.join(__dirname, "../dist"),
      templatePath: path.join(__dirname, "../template"),
      contentPath: path.join(__dirname, "../content"),
      postsDirectoryName: "posts"
    };
  }

  private getTemplateData() {
    const site: ITemplateDataSite = {
      name: "Foo",
      description: "FooDescription",
      baseurl: "FooBaseUrl",
      buildTime: "2019-XX-XX"
    };

    const styles = this.getStyles();
    const templateData = <ITemplateData>{
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

  start() {
    fse.emptyDirSync(this.constants.distPath);

    this.registerTemplatePartials();

    const templateData = this.getTemplateData();
    const pagesRenderer = new PagesRenderer(
      this.constants,
      this.constants.contentPath,
      templateData
    );
    pagesRenderer.render();
  }
}

new Amplog().start();
