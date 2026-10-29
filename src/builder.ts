import * as fse from "fs-extra";
import * as path from "path";

import { IStyle } from "./interfaces";
import { clearConfigFileCache, loadConfigFile } from "./configHelper";

import { StylesGenerator } from "./generators/stylesGenerator";
import { ContentGenerator } from "./generators/contentGenerator";

export class Builder {
  public static readonly distDirectoryName = "_dist";
  public static readonly layoutsDirectoryName = "_layouts";
  public static readonly stylesDirectoryName = "styles";

  readonly baseDirectory: string;
  readonly contentDirectory: string;
  readonly layoutsDirectory: string;
  readonly stylesDirectory: string;
  readonly distDirectory: string;

  private contentGenerator?: ContentGenerator;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;
    this.contentDirectory = this.baseDirectory;
    this.layoutsDirectory = path.join(
      this.baseDirectory,
      Builder.layoutsDirectoryName
    );
    this.stylesDirectory = path.join(
      this.baseDirectory,
      Builder.stylesDirectoryName
    );
    this.distDirectory = path.join(
      this.baseDirectory,
      Builder.distDirectoryName
    );
  }

  async start() {
    this.contentGenerator = undefined;
    clearConfigFileCache();
    let baseConfig = loadConfigFile(this.baseDirectory);
    if (!baseConfig) {
      throw Error(`Config file not found in ${this.baseDirectory}.`);
    }

    fse.emptyDirSync(this.distDirectory);

    // Styles - process styles first so they are available to the content files later
    const styles: Array<IStyle> = new StylesGenerator().generate(
      this.stylesDirectory,
      path.join(this.distDirectory, Builder.stylesDirectoryName)
    );

    // Content - process the content files
    const contentGenerator = new ContentGenerator(
      baseConfig,
      styles,
      this.stylesDirectory,
      this.layoutsDirectory,
      this.contentDirectory,
      this.distDirectory
    );
    await contentGenerator.generateAll();
    this.contentGenerator = contentGenerator;
  }

  /**
   * Returns true if the rebuild was incremental
   */
  async rebuild(changedFilePaths: string[]) {
    const requiresFullBuild = changedFilePaths.some(
      f =>
        f.startsWith(this.layoutsDirectory + path.sep) ||
        f.startsWith(this.stylesDirectory + path.sep) ||
        path.basename(f) == "_config.yml"
    );

    if (
      !requiresFullBuild &&
      this.contentGenerator &&
      (await this.contentGenerator.regenerate(changedFilePaths))
    ) {
      return true;
    }

    await this.start();
    return false;
  }
}
