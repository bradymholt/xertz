import * as path from "path";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as yaml from "js-yaml";
import { IConfig } from "./interfaces";

const cachedConfigFiles: { [sourceDirectory: string]: IConfig } = {};

export function loadConfigFile(sourceDirectory: string) {
  if (!cachedConfigFiles[sourceDirectory]) {
    const configFilePath = path.join(sourceDirectory, "_config.yml");
    if (fse.existsSync(configFilePath)) {
      const configFileContent = fs.readFileSync(
        path.join(sourceDirectory, "_config.yml"),
        "utf-8"
      );
      const config = yaml.load(configFileContent) as IConfig;
      cachedConfigFiles[sourceDirectory] = config;
    } else {
      cachedConfigFiles[sourceDirectory] = {} as IConfig;
    }
  }

  return cachedConfigFiles[sourceDirectory];
}
