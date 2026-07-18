import type { Locale } from "@pawlens/shared";

/**
 * ChatGPT supplies an RFC 4647 locale such as `ja-JP`, while the widget's
 * translated copy uses the smaller `ja` and `en` key set.
 */
export function resolveWidgetLocale(locale: string | undefined): Locale {
  return locale?.toLowerCase().startsWith("en") ? "en" : "ja";
}
