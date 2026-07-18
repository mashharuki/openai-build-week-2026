import { describe, expect, it } from "vitest";

import { probeAppsSdkCapabilities } from "../src/apps-sdk-capabilities.js";

describe("Apps SDK capability probe", () => {
  it("keeps audio and comparison disabled until their independent probes pass", () => {
    expect(probeAppsSdkCapabilities({})).toEqual({
      audioEvidence: false,
      conversationStable: false,
    });
    expect(
      probeAppsSdkCapabilities({
        audioAvailable: true,
        fileInputsAvailable: false,
        conversationStable: true,
      }),
    ).toEqual({ audioEvidence: false, conversationStable: true });
    expect(
      probeAppsSdkCapabilities({
        audioAvailable: true,
        fileInputsAvailable: true,
        conversationStable: true,
      }),
    ).toEqual({ audioEvidence: true, conversationStable: true });
  });
});
