import type { Locale } from "@pawlens/shared";

/**
 * ChatGPT supplies an RFC 4647 locale such as `ja-JP`, while the widget's
 * translated copy uses the smaller `ja` and `en` key set.
 */
export function resolveWidgetLocale(locale: string | undefined): Locale {
  return locale?.toLowerCase().startsWith("en") ? "en" : "ja";
}

/** The tool input specifies the language requested for owner guidance. */
export function resolveToolInputLocale(input: unknown): Locale | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }

  const locale = (input as { locale?: unknown }).locale;
  if (typeof locale !== "string") return undefined;

  const normalized = locale.toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja")) return "ja";
  return undefined;
}
