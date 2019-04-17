import * as handlebars from "handlebars";
import moment = require("moment");

export default function register() {
  handlebars.registerHelper("limit", limit);
  handlebars.registerHelper("iif", ternary);
  handlebars.registerHelper("dateFormat", dateFormat);
}

export function limit(arr: Array<any>, limit: number) {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.slice(0, limit);
}

export function ternary(test: boolean, trueValue: any, falseValue: any) {
  return test ? trueValue : falseValue;
}

export function dateFormat(isoDate: string, format: string) {
  return moment(isoDate).format(format);
}
