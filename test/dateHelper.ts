import { getCurrentDateInISOFormat } from "../src/dateHelper";

describe("getCurrentDateInISOFormat", function() {
  it("returns correct date format", function() {
    expect(getCurrentDateInISOFormat(new Date(2019, 3, 2))).toEqual(
      "2019-04-02"
    );
  });
});
