export const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

export function getAbsoluteUrl(path: string) {
  const url = new URL(path, baseUrl);
  return url.toString();
}
