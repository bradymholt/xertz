import { IConfig } from "../interfaces";
import * as fs from "fs";
import * as path from "path";
import * as fse from "fs-extra";
import * as handlebars from "handlebars";

export class RedirectsGenerator {
  readonly redirectLayoutName = "redirect.hbs";

  public render(
    config: IConfig,
    destDirectory: string,
    layoutsDirectory: string
  ) {
    const templateContent = fs.readFileSync(
      path.join(layoutsDirectory, this.redirectLayoutName),
      { encoding: "utf-8" }
    );
    const applyTemplate = handlebars.compile(templateContent);

    for (let redirectPath in config.redirects) {
      const output = applyTemplate({ path: config.redirects[redirectPath] });
      const outFile = path.join(destDirectory, redirectPath);
      fse.ensureFileSync(outFile);
      fs.writeFileSync(outFile, output);
    }
  }
}
