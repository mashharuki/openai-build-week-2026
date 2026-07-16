export const SUPPORTED_LOCALES = ["ja", "en"] as const;
export const SIGNAL_CONTEXTS = [
  "visitor",
  "doorbell",
  "unknown",
  "other",
] as const;
export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export const MAX_AUDIO_DURATION_SECONDS = 10;

export const CAPABILITY_FLAGS = {
  audioEvidence: "audio_evidence",
  conversationIdentity: "conversation_identity",
} as const;
