import * as handlebars from "handlebars";
import dateformat = require("dateformat");

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

/**
 * dateFormat
 * @param dateString The data represented in ISO format.  "now" can be used as a shortcut for the current date.
 * @param format See http://blog.stevenlevithan.com/archives/date-time-format for supported formats.
 */
export function dateFormat(dateString: string, format: string = "mm/dd/yyyy") {
  if (!dateString) {
    return "";
  }

  const date = dateString == "now" ? new Date() : new Date(dateString);
  if (!format.startsWith("UTC:") && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // dateString had no time component (e.g. 2019-01-01) so we'll convert to UTC to make the date stable.
    format = "UTC:" + format;
  }
  return dateformat(date, format);
}
