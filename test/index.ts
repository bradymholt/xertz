import { Amplog } from "../src/index";

describe('index', function() {
  it('instantiates', function() {
    expect(new Amplog().constants.distPath).toBeTruthy();
  })
});