export function getHelloMessage(
  structuredContent: { greeting?: unknown } | undefined,
): string {
  return typeof structuredContent?.greeting === "string"
    ? structuredContent.greeting
    : "PawLensを準備しています…";
}
