import * as handlebars from "handlebars";

export default function register() {
  handlebars.registerHelper("limit", function limit(
    arr: Array<any>,
    limit: number
  ) {
    if (!Array.isArray(arr)) {
      return [];
    }
    return arr.slice(0, limit);
  });
}
