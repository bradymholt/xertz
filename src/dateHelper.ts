export function getCurrentDateInISOFormat(currentDate = new Date()) {
  let isoLocalDateString = new Date(
    currentDate.getTime() - currentDate.getTimezoneOffset() * 60000
  ).toISOString();
  return isoLocalDateString.substring(0,10);
}