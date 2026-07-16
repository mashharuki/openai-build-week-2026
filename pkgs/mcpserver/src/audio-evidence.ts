import {
  type FileReference,
  type Locale,
  MAX_AUDIO_DURATION_SECONDS,
  getErrorMessage,
} from "@pawlens/shared";

export interface EvidenceInput {
  audio: FileReference | null;
  image: FileReference | null;
  locale: Locale;
  supportsAudio?: boolean;
}
export interface EvidenceResult {
  audio: FileReference | null;
  image: FileReference | null;
  kind: "ready" | "partial";
  messages: string[];
}

export interface AudioCapability {
  available: boolean;
}

const AUDIO_RETRY_GUIDANCE = {
  en: "Please record the bark again, or add a bark description and context.",
  ja: "音声を録り直すか、吠え方の記述と状況を補足してください。",
} as const;

export function probeAudioEvidence(supportsAudio?: boolean): AudioCapability {
  return { available: supportsAudio === true };
}

export function adaptEvidence(input: EvidenceInput): EvidenceResult {
  const messages: string[] = [];
  let hasUnavailableEvidence = false;
  if (input.image || input.audio)
    messages.push(getErrorMessage("media_privacy_notice", input.locale));
  const image = input.image?.mimeType.startsWith("image/") ? input.image : null;
  if (input.image && !image) {
    hasUnavailableEvidence = true;
    messages.push(getErrorMessage("unusable_image", input.locale));
  }
  const validAudio =
    input.audio &&
    probeAudioEvidence(input.supportsAudio).available &&
    input.audio.mimeType.startsWith("audio/") &&
    input.audio.durationSeconds !== undefined &&
    input.audio.durationSeconds >= 1 &&
    input.audio.durationSeconds <= MAX_AUDIO_DURATION_SECONDS
      ? input.audio
      : null;
  if (input.audio && !validAudio) {
    hasUnavailableEvidence = true;
    messages.push(
      getErrorMessage("partial_evidence", input.locale),
      AUDIO_RETRY_GUIDANCE[input.locale],
    );
  }
  return {
    audio: validAudio,
    image,
    kind: hasUnavailableEvidence ? "partial" : "ready",
    messages,
  };
}
