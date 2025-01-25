const pad = (value: number) => {
  if (value < 10) {
    return `0${value}`;
  }
  return value;
};

export const toDateString = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;

export const relativeDate = (date: Date, num: number) => {
  const newDate = new Date(date);
  newDate.setUTCDate(date.getUTCDate() + num);
  return newDate;
};
