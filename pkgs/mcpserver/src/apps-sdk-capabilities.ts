export interface AppsSdkProbeInput {
  audioAvailable?: boolean;
  conversationStable?: boolean;
  fileInputsAvailable?: boolean;
}

export interface AppsSdkCapabilities {
  audioEvidence: boolean;
  conversationStable: boolean;
}

/**
 * Capability assertions are supplied only after an integration probe. Defaults
 * deliberately fail closed: a server-generated transport session does not by
 * itself prove a stable ChatGPT conversation identifier.
 */
export function probeAppsSdkCapabilities(
  input: AppsSdkProbeInput,
): AppsSdkCapabilities {
  return {
    audioEvidence:
      input.audioAvailable === true && input.fileInputsAvailable === true,
    conversationStable: input.conversationStable === true,
  };
}
