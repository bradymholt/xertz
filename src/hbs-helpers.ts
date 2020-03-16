import * as handlebars from "handlebars";
import dateformat from "dateformat";

export default function register() {
  handlebars.registerHelper("limit", limit);
  handlebars.registerHelper("filter", filter);
  handlebars.registerHelper("iif", iif);
  handlebars.registerHelper("dateFormat", dateFormat);
  handlebars.registerHelper("group", group);
  handlebars.registerHelper("indent", indent);
  handlebars.registerHelper("encodeURI", encodeURI);
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

export function iif(testValue: any, falsyValue: any) {
  return testValue ? testValue : falsyValue;
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

/**
 * indent - Intents each newline in a string by a specified witdh
 * @param input  - The string to be indented on each line
 * @param width
 * @param indeentationChar
 */
export function indent(input: string, width: number, indeentationChar: string) {
  if (!input) {
    return input;
  }

  const intendation = new Array(
    width === undefined || isNaN(width) ? 0 : Number(width) + 1
  ).join(
    indeentationChar === undefined || typeof indeentationChar !== "string"
      ? " "
      : indeentationChar
  );
  // If newline is not preceeded by a zero width character (\u200b) then add indention
  let indented = input.replace(/[^\u200b]\n/g, match =>
    match.replace(/\n/, `\n${intendation}`)
  );

  // Remove zero width characters
  indented = indented.replace(/\u200b\n/g, "\n");

  //return indented;
  return indented;
}

/**
 * @method group
 * @param {Array} list
 * @param {Object} options
 * @param {Object} options.hash
 * @param {String} options.hash.by
 * @return {String} Rendered partial.
 */
export function group(list: Array<any>, options: any) {
  // Source: https://github.com/shannonmoeller/handlebars-group-by
  function get(obj: any, prop: any) {
    var parts = prop.split("."),
      last = parts.pop();

    while ((prop = parts.shift())) {
      obj = obj[prop];

      if (obj == null) {
        return;
      }
    }

    return obj[last];
  }

  options = options || {};

  const fn = options.fn,
    hash = options.hash,
    prop = hash && hash.by,
    keys: Array<any> = [],
    groups: { [name: string]: any } = {};

  if (!prop || !list || !list.length) {
    return null;
  }

  function groupKey(item: any) {
    var key = get(item, prop);

    if (keys.indexOf(key) === -1) {
      keys.push(key);
    }

    if (!groups[key]) {
      groups[key] = {
        value: key,
        items: []
      };
    }

    groups[key].items.push(item);
  }

  function renderGroup(buffer: any, key: string) {
    return buffer + fn(groups[key]);
  }

  list.forEach(groupKey);

  return keys.reduce(renderGroup, "");
}

/**
 * @method encodeURI
 * @param {String} uri
 */
export function encodeURI(uri: string) {
  return encodeURIComponent(uri);
}
