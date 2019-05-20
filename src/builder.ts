import * as fse from "fs-extra";
import * as path from "path";

import { IStyle } from "./interfaces";
import { loadConfigFile } from "./configHelper";

import { StylesGenerator } from "./generators/stylesGenerator";
import { AssetGenerator } from "./generators/assetGenerator";
import { ContentGenerator } from "./generators/contentGenerator";

export class Builder {
  public static readonly distDirectoryName = "_dist";

  readonly baseDirectory: string;
  readonly contentDirectoryName = "content";
  readonly layoutsDirectoryName = "layouts";

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
    this.distDirectory = path.join(this.baseDirectory, Builder.distDirectoryName);
  }

  async start() {
    let baseConfig = loadConfigFile(this.baseDirectory);
    if (!baseConfig) {
      throw Error(`Config file not found in ${this.baseDirectory}.`);
    }    

    fse.emptyDirSync(this.distDirectory);

    // Assets - copy files that are not processed over to dist/ as-is.
    new AssetGenerator().render(this.contentDirectory, this.distDirectory);

    // Styles - process styles first so they are available to the content files later
    const styles: Array<IStyle> = new StylesGenerator().render(
      this.contentDirectory,
      this.distDirectory
    );

    // Content - process the content files
    const contentGenerator = new ContentGenerator(
      baseConfig,
      styles,
      this.layoutsDirectory
    );
    await contentGenerator.render(this.contentDirectory, this.distDirectory);
  }
}
