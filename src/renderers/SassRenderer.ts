import * as sass from "node-sass";
import * as path from "path";
import * as fs from "fs";
import { IStyle, IConfig } from "../interfaces";

export class SassRenderer {
  readonly baseDirectory: string;
  readonly file: string;
  readonly fileName: string;
  readonly destinationDirectory: string;
  readonly config: IConfig;

  constructor(
    baseDirectory: string,
    fileName: string,
    destinationDirectory: string,
    config: IConfig
  ) {
    this.file = path.join(baseDirectory, fileName);
    this.baseDirectory = baseDirectory;
    this.fileName = fileName;
    this.destinationDirectory = destinationDirectory;
    this.config = config;
  }

  render() {
    const content = sass
      .renderSync({
        file: this.file,
        outputStyle: "compressed"
      }).css.toString();

    const outFileName = this.fileName
      .replace(".sass", "")
      .replace(".scss", "");
    fs.writeFileSync(
      path.join(this.destinationDirectory, outFileName),
      content
    );

    const style = <IStyle>{
      name: path.basename(this.fileName),
      content,
      url: `${this.config.url}/${outFileName}`
    };

    return style;
  }
}
