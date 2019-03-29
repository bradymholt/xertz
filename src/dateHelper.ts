export function getCurrentDateInISOFormat() {
  let currentDate = new Date();
  let isoLocalDateString = new Date(
    currentDate.getTime() - currentDate.getTimezoneOffset() * 60000
  ).toISOString();
  return isoLocalDateString;
}