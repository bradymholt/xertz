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
import { getCurrentDateInISOFormat } from "./dateHelper";

export class Builder {
  readonly baseDirectory: string;
  readonly contentDirectoryName = "content";
  readonly layoutsDirectoryName = "layouts";
  readonly distDirectoryName = "dist";

  readonly contentDirectory: string;
  readonly layoutsDirectory: string;
  readonly distDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;
    this.contentDirectory = path.join(
      this.baseDirectory,
      this.contentDirectoryName
    );
    this.layoutsDirectory = path.join(
      this.baseDirectory,
      this.layoutsDirectoryName
    );
    this.distDirectory = path.join(this.baseDirectory, this.distDirectoryName);
  }

  start() {
    let baseConfig = loadConfigFile(this.baseDirectory);
    baseConfig.build_timestamp = getCurrentDateInISOFormat();
    if (!baseConfig) {
      throw Error("Config file not found.");
    }

    fse.emptyDirSync(this.distDirectory);

    // Assets
    // This is easy, we just need to copy files ovet to dist/ that do not need additional processing 
    new AssetGenerator().render(this.contentDirectory, this.distDirectory);

    // Styles
    // We need to process styles first so they are available to the content files in the next step
    const styles: Array<IStyle> = new StylesGenerator().render(
      this.contentDirectory,
      this.distDirectory
    );

    // Content
    // This is where we do the primary work of parsing, processing and copying the content files over to dist/
    const contentGenerator = new ContentGenerator(
      baseConfig,
      styles,
      this.layoutsDirectory
    );
    contentGenerator.render(this.contentDirectory, this.distDirectory);

    // Redirects
    const redirectGenerator = new RedirectsGenerator();
    redirectGenerator.render(
      baseConfig,
      this.distDirectory,
      this.layoutsDirectory
    );
  }
}
