import { init } from "../src/cli";
import * as path from "path";
import * as fs from "fs";
import * as fse from "fs-extra";
import { getCurrentDateInISOFormat } from "../src/dateHelper";

describe("init", () => {
  it("errors when no targetDirectoryName is provided", () => {
    jest.mock("fs-extra");
    const mockError = jest
      .spyOn(console, "error")
      .mockImplementation(((message: string) => null) as any);
    const mockExit = jest
      .spyOn(process, "exit")
      .mockImplementation(((code: number) => null) as any);

    try {
      const cli = init(process.cwd(), ["init"]);
      cli.run();
      expect(mockError).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      mockError.mockReset();
      mockExit.mockReset();
    }
  });

  it("creates scaffold", () => {
    const folderName = "tmp_init";
    const initFolder = path.join(__dirname, folderName);

    try {
      const cli = init(path.join(__dirname), ["init", folderName]);
      cli.run();

      const expectedFiles = [
        "favicon.ico",
        `posts/${getCurrentDateInISOFormat()}-my-first-post.md`
      ];
      for (let file of expectedFiles) {
        try {
          expect(fs.existsSync(path.join(initFolder, file))).toBeTruthy();
        } catch (err) {
          throw new Error(`${file} not found after running init`);
        }
      }
    } finally {
      fse.removeSync(initFolder);
    }
  });
});