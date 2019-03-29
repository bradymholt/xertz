import { Builder } from "../src/builder";

describe('index', function() {
  it('instantiates', function() {
    expect(new Builder().constants.distDirectory).toBeTruthy();
  })
});