import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as interfaces from "./interfaces";
import { IStyle } from "./interfaces";
import { StylesGenerator } from "./generators/stylesGenerator";
import { AssetGenerator } from "./generators/assetGenerator";
import { ContentGenerator } from "./generators/contentGenerator";
import { loadConfigFile } from "./configHelper";
import { RedirectsGenerator } from "./generators/redirectsGenerator";

export class Builder {
  readonly baseDirectory: string;
  readonly constants: interfaces.IConstants;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;

    this.constants = {
      contentPath: baseDirectory,
      distDirectory: path.join(baseDirectory, "dist")
    };
  }

  start() {
    fse.emptyDirSync(this.constants.distDirectory);
    let baseConfig = loadConfigFile(this.constants.contentPath);
    if (!baseConfig) {
      throw Error("Config file not found.");
    }

    // Assets
    new AssetGenerator().render(
      path.join(this.constants.contentPath, "content"),
      path.join(this.constants.distDirectory)
    );

    // Styles
    const styles: Array<IStyle> = new StylesGenerator().render(
      path.join(this.constants.contentPath, "styles"),
      path.join(this.constants.distDirectory, "styles")
    );

    // Content
    const contentGenerator = new ContentGenerator(
      baseConfig,
      styles,
      path.join(this.constants.contentPath, "layouts")
    );
    contentGenerator.render(
      path.join(this.constants.contentPath, "content"),
      path.join(this.constants.distDirectory)
    );

    // Redirects
    const redirectGenerator = new RedirectsGenerator();
    redirectGenerator.render(
      baseConfig,
      path.join(this.constants.distDirectory),
      path.join(this.constants.contentPath, "layouts")
    );
  }
}
