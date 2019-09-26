import { loadConfigFile } from "../src/configHelper";

jest.mock("fs-extra");
jest.mock("fs");

describe("loadConfigFile", () => {
  it("returns empty object if file does not exist", () => {
    expect(loadConfigFile("not-a-real-folder")).toEqual({});
  }); 
});
