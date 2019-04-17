import * as handlebars from "handlebars";
import moment = require("moment");

export default function register() {
  handlebars.registerHelper("limit", limit);
  handlebars.registerHelper("filter", filter);
  handlebars.registerHelper("iif", ternary);
  handlebars.registerHelper("dateFormat", dateFormat);
}

export function limit(arr: Array<any>, limit: number) {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.slice(0, limit);
}

export function filter(arr: Array<any>, key: string, val: any) {
  return arr.filter(i => i[key] == val);
}

export function ternary(test: boolean, trueValue: any, falseValue: any) {
  return test ? trueValue : falseValue;
}

export function dateFormat(isoDate: string, format: string) {
  return moment(isoDate).format(format);
}
