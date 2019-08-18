import * as fse from "fs-extra";
import * as path from "path";

import { IStyle } from "./interfaces";
import { loadConfigFile } from "./configHelper";

import { StylesGenerator } from "./generators/stylesGenerator";
import { ContentGenerator } from "./generators/contentGenerator";

export class Builder {
  public static readonly distDirectoryName = "_dist";
  public static readonly contentDirectoryName = "content";

  readonly baseDirectory: string;
  readonly layoutsDirectoryName = "layouts";
  readonly stylesDirectoryName = "styles";

  readonly contentDirectory: string;
  readonly layoutsDirectory: string;
  readonly stylesDirectory: string;
  readonly distDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;
    this.contentDirectory = path.join(
      this.baseDirectory,
      Builder.contentDirectoryName
    );
    this.layoutsDirectory = path.join(
      this.baseDirectory,
      this.layoutsDirectoryName
    );
    this.stylesDirectory = path.join(
      this.baseDirectory,
      this.stylesDirectoryName
    );
    this.distDirectory = path.join(
      this.baseDirectory,
      Builder.distDirectoryName
    );
  }

  async start() {
    let baseConfig = loadConfigFile(this.baseDirectory);
    if (!baseConfig) {
      throw Error(`Config file not found in ${this.baseDirectory}.`);
    }

    fse.emptyDirSync(this.distDirectory);

    // Styles - process styles first so they are available to the content files later
    const styles: Array<IStyle> = new StylesGenerator().generate(
      this.stylesDirectory,
      path.join(this.distDirectory, this.stylesDirectoryName)
    );

    // Content - process the content files
    const contentGenerator = new ContentGenerator(
      styles,
      this.layoutsDirectory
    );
    await contentGenerator.generate(
      baseConfig,
      this.contentDirectory,
      this.distDirectory
    );
  }
}
