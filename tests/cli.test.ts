import cli from "../src/cli";
import * as path from "path";
import * as fs from "fs";
import * as fse from "fs-extra";
import { getCurrentDateInISOFormat } from "../src/dateHelper";

describe("init", () => {
  it("errors when no targetDirectoryName is provided", async () => {
    jest.mock("fs-extra");
    const mockError = jest
      .spyOn(console, "error")
      .mockImplementation(((message: string) => null) as any);
    const mockExit = jest
      .spyOn(process, "exit")
      .mockImplementation(((code: number) => null) as any);

    try {
      const cliInstance = new cli(process.cwd(), ["init"]);
      await cliInstance.run();
      expect(mockError).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      mockError.mockReset();
      mockExit.mockReset();
    }
  });

  it("creates scaffold", async () => {
    const logSpy = jest
      .spyOn(console, "log")
      .mockImplementation(((message: string) => null) as any);

    const folderName = "tmp_init";
    const initFolder = path.join(__dirname, folderName);

    try {
      const cliInstance = new cli(path.join(__dirname), ["init", folderName]);
      await cliInstance.run();

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
      logSpy.mockReset();
    }
  });
});

describe("new", () => {
  it("creates new post directory", async () => {
    const logSpy = jest
      .spyOn(console, "log")
      .mockImplementation(((message: string) => null) as any);

    const expectedPostDirectory = `posts/${getCurrentDateInISOFormat()}-my-new-post`;
    try {
      const cliInstance = new cli(path.join(__dirname, "scaffold"), [
        "new",
        "My New Post"
      ]);
      await cliInstance.run();

      expect(
        fs.existsSync(
          path.join(__dirname, "scaffold", expectedPostDirectory, "index.md")
        )
      ).toBeTruthy();
    } finally {
      fse.removeSync(path.join(__dirname, "scaffold", expectedPostDirectory));
      logSpy.mockReset();
    }
  });
});

describe("help", () => {
  it("prints help", async () => {
    let foo = "";
    const logSpy = jest
      .spyOn(console, "log")
      .mockImplementation(((message: string) => null) as any);
    try {
      const cliInstance = new cli(path.join(__dirname, "scaffold"), ["help"]);
      await cliInstance.run();

      const lastLogCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(lastLogCall[0]).toContain("xertz COMMAND");
    } finally {
      logSpy.mockReset();
    }
  });

  it("notifies when an update is available", async () => {
    const logSpy = jest
      .spyOn(console, "log")
      .mockImplementation(((message: string) => null) as any);
    try {
      const cliInstance = new cli(path.join(__dirname, "scaffold"), ["help"]);
      await cliInstance.run();
      expect(logSpy).toHaveBeenCalled();
      expect(logSpy.mock.calls[1][1]).toContain("New version is available");
    } finally {
      logSpy.mockReset();
    }
  });
});
