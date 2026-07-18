export const ERROR_MESSAGES = {
  delete_confirmation: {
    en: "Confirm deletion of this dog's saved observations before continuing.",
    ja: "この犬の保存済み観察を削除することを確認してから続けてください。",
  },
  generation_failed: {
    en: "We could not prepare an assessment. Please try again after reviewing the input.",
    ja: "見立てを準備できませんでした。入力を見直してからもう一度お試しください。",
  },
  profile_save_failed: {
    en: "We could not save the dog's profile. Please check your connection and try again.",
    ja: "プロフィールを保存できませんでした。接続を確認してからもう一度お試しください。",
  },
  media_privacy_notice: {
    en: "Photos and audio may contain personal information. They are used only as temporary assessment evidence.",
    ja: "写真や音声には個人情報が含まれる可能性があります。見立ての一時的な根拠としてのみ扱います。",
  },
  missing_input: {
    en: "Please add a description of the bark or more context before continuing.",
    ja: "続ける前に、吠え方の記述または状況を補足してください。",
  },
  partial_evidence: {
    en: "We used the available evidence only. Check the limitations before deciding what to do next.",
    ja: "利用できた根拠だけで見立てました。次の行動を選ぶ前に限界を確認してください。",
  },
  privacy_notice: {
    en: "We store only the profile and owner-confirmed observations needed for this feature. The retention period is until you delete them. You can delete them at any time, and we do not provide them to third parties.",
    ja: "この機能に必要なプロフィールと飼い主が確認した観察だけを保存します。保存期間は削除するまでです。いつでも削除でき、第三者には提供しません。",
  },
  urgency: {
    en: "Prioritize safety and contact a veterinarian or behavior professional if the signs worsen.",
    ja: "安全を優先し、兆候が悪化する場合は獣医師または行動専門家へ相談してください。",
  },
  unusable_image: {
    en: "We could not use visual cues from this photo. The assessment can continue with the other information.",
    ja: "この写真から視覚的な手がかりを使えませんでした。ほかの情報で見立てを続けられます。",
  },
} as const;

export type SystemErrorKey = keyof typeof ERROR_MESSAGES;

export function getErrorMessage(key: SystemErrorKey, locale: Locale): string {
  return ERROR_MESSAGES[key][locale];
}
import type { Locale } from "./contracts.js";
