import { z } from "zod";

import {
  CONFIDENCE_LEVELS,
  MAX_AUDIO_DURATION_SECONDS,
  SIGNAL_CONTEXTS,
  SUPPORTED_LOCALES,
} from "./constants.js";

export const LocaleSchema = z.enum(SUPPORTED_LOCALES);
export const SignalContextSchema = z.enum(SIGNAL_CONTEXTS);
export const ConfidenceSchema = z.enum(CONFIDENCE_LEVELS);

export const FileReferenceSchema = z.object({
  downloadUrl: z.string().url().optional(),
  durationSeconds: z
    .number()
    .positive()
    .max(MAX_AUDIO_DURATION_SECONDS)
    .optional(),
  fileId: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
});

/**
 * The documented Apps SDK representation for a file passed through
 * `openai/fileParams`. This remains separate from FileReferenceSchema so the
 * application service never needs to depend on host-specific field names.
 */
export const OpenAiFileReferenceToolSchema = z
  .object({
    download_url: z
      .string()
      .url()
      .describe("Temporary HTTPS URL from ChatGPT for downloading this file."),
    duration_seconds: z
      .number()
      .positive()
      .max(MAX_AUDIO_DURATION_SECONDS)
      .optional()
      .describe("Audio duration in seconds, when ChatGPT provides it."),
    file_id: z
      .string()
      .trim()
      .min(1)
      .describe("ChatGPT file identifier for the uploaded evidence."),
    file_name: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Original file name, when available."),
    mime_type: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("MIME type such as audio/wav or image/jpeg."),
  })
  .strict();

export const OpenAiFileReferenceSchema =
  OpenAiFileReferenceToolSchema.transform((file) =>
    FileReferenceSchema.parse({
      downloadUrl: file.download_url,
      durationSeconds: file.duration_seconds,
      fileId: file.file_id,
      // Apps SDK permits this field to be absent. Treat the unknown content
      // type as unusable evidence rather than guessing that it is audio/image.
      mimeType: file.mime_type ?? "application/octet-stream",
    }),
  );

export const DogProfileSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  temperamentNote: z.string().trim().max(500).nullable(),
  updatedAt: z.string().datetime(),
});

export const ProfileDraftSchema = DogProfileSchema.pick({
  name: true,
  temperamentNote: true,
});

export const ObservationLogSchema = z.object({
  chosenAction: z.string().trim().min(1).max(500),
  conversationId: z.string().trim().min(1),
  dogId: z.string().trim().min(1),
  id: z.string().trim().min(1),
  observedCues: z.array(z.string().trim().min(1)).min(1).max(10),
  recordedAt: z.string().datetime(),
});

export const SignalInputSchema = z.object({
  audio: FileReferenceSchema.nullable(),
  barkDescription: z.string().trim().min(1).max(2_000),
  context: SignalContextSchema,
  distanceToPerson: z.string().trim().max(500).nullable(),
  dogId: z.string().trim().min(1),
  image: FileReferenceSchema.nullable(),
  locale: LocaleSchema,
  precedingEvent: z.string().trim().max(500).nullable(),
});

export const OpenAiSignalToolInputSchema = z
  .object({
    audio: OpenAiFileReferenceToolSchema.nullable().describe(
      "Optional audio recording of the dog's reaction. Use null when no recording is available.",
    ),
    barkDescription: z
      .string()
      .trim()
      .min(1)
      .max(2_000)
      .describe(
        "Owner's factual description of the bark or reaction, including tone, repetition, and duration when known.",
      ),
    context: SignalContextSchema.describe(
      "Situation in which the reaction occurred, such as visitor, doorbell, or unknown.",
    ),
    distance_to_trigger_meters: z
      .number()
      .finite()
      .min(0)
      .max(1_000)
      .nullable()
      .optional()
      .describe(
        "Straight-line distance in meters from the dog to the immediate trigger (for example, a person, another dog, a door, or a sound source). Use a number such as 2.5; use null when unknown. Do not pass a text value such as '2m'.",
      ),
    dogId: z
      .string()
      .trim()
      .min(1)
      .describe(
        "ID of the existing PawLens dog profile to which this observation belongs.",
      ),
    image: OpenAiFileReferenceToolSchema.nullable().describe(
      "Optional image that shows the dog's body language or the situation. Use null when no image is available.",
    ),
    locale: LocaleSchema.describe("Language for the returned owner guidance."),
    precedingEvent: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .describe(
        "What happened immediately before the reaction; null if unknown.",
      ),
  })
  // A previous widget release sends distanceToPerson. MCP validates this
  // schema before the tool handler can normalize that legacy field, so retain
  // unrecognised fields until the handler performs the compatibility mapping.
  .passthrough();

export const OpenAiSignalInputSchema = OpenAiSignalToolInputSchema.transform(
  (input) =>
    SignalInputSchema.parse({
      ...input,
      audio: input.audio ? OpenAiFileReferenceSchema.parse(input.audio) : null,
      distanceToPerson:
        input.distance_to_trigger_meters == null
          ? null
          : `${input.distance_to_trigger_meters} m`,
      image: input.image ? OpenAiFileReferenceSchema.parse(input.image) : null,
    }),
);

export const HypothesisSchema = z.object({
  label: z.string().trim().min(1).max(300),
  rationale: z.string().trim().min(1).max(1_000),
});

export const EvidenceAvailabilitySchema = z.enum([
  "included",
  "not_provided",
  "unavailable",
]);

export const EvidenceSummaryItemSchema = z.object({
  kind: z.enum([
    "confirmed_observations",
    "owner_description",
    "photo",
    "research",
    "audio",
  ]),
  status: EvidenceAvailabilitySchema,
});

export const ObservationTimelineItemSchema = z.object({
  kind: z.enum(["preceding_event", "reaction", "distance"]),
  value: z.string().trim().min(1).max(2_000),
});

export const SupportResourceSchema = z.object({
  description: z.string().trim().min(1).max(300),
  href: z.string().url(),
  kind: z.enum(["education", "professional"]),
  label: z.string().trim().min(1).max(120),
});

export const AssessmentResultSchema = z.object({
  additionalQuestion: z.string().trim().min(1).max(500).nullable(),
  confidence: ConfidenceSchema,
  evidenceSources: z
    .array(z.enum(["research", "confirmed_observation"]))
    .min(1),
  evidenceSummary: z.array(EvidenceSummaryItemSchema).max(5).optional(),
  limitations: z.string().trim().min(1).max(1_000),
  observationPoints: z.array(z.string().trim().min(1)).min(1).max(10),
  observationTimeline: z.array(ObservationTimelineItemSchema).max(3).optional(),
  primaryHypothesis: HypothesisSchema,
  secondaryHypotheses: z.array(HypothesisSchema).max(3),
  resources: z.array(SupportResourceSchema).max(2).optional(),
  status: z.enum(["success", "partial", "urgent", "error"]),
  suggestedAction: z.string().trim().min(1).max(500),
});

export const WidgetGreetingSchema = z.object({
  greeting: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Short message confirming that the PawLens widget is ready."),
  profileDraft: ProfileDraftSchema.optional().describe(
    "Optional profile details supplied by the owner. The owner must explicitly save this draft before it becomes a stored profile.",
  ),
});

export const SaveObservationInputSchema = z
  .object({
    chosenAction: z.string().trim().min(1).max(500),
    dogId: z.string().trim().min(1),
    observedCues: z.array(z.string().trim().min(1)).min(1).max(10),
  })
  .strict();

export const HistoryComparisonSchema = z.object({
  currentLog: ObservationLogSchema.nullable(),
  previousLog: ObservationLogSchema.nullable(),
  status: z.enum(["available", "unavailable"]),
  summary: z.string().trim().min(1).max(1_000),
});

export const GetDogHistoryInputSchema = z
  .object({
    dogId: z.string().trim().min(1),
    recentLogs: z.array(ObservationLogSchema),
  })
  .strict();

export const DeleteProfileInputSchema = z.object({
  confirmed: z.literal(true),
  dogId: z.string().trim().min(1),
});

export const ManageDogProfileInputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    ...ProfileDraftSchema.shape,
  }),
  z.object({
    action: z.literal("update"),
    dogId: z.string().trim().min(1),
    ...ProfileDraftSchema.shape,
  }),
  z.object({
    action: z.literal("delete"),
    ...DeleteProfileInputSchema.shape,
  }),
]);

/**
 * Object-shaped MCP descriptor for manage_dog_profile. The handler still
 * validates the action-specific union above, while this schema lets MCP
 * clients see every argument and its purpose in tools/list.
 */
export const ManageDogProfileToolInputSchema = z
  .object({
    action: z
      .enum(["create", "update", "delete"])
      .describe(
        "Operation to perform: create a profile, update a profile, or delete a profile.",
      ),
    confirmed: z
      .boolean()
      .optional()
      .describe(
        "Must be true when action is delete. Omit for create and update.",
      ),
    dogId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        "Existing profile ID. Required for update and delete; omit for create.",
      ),
    name: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .optional()
      .describe("Dog's name. Required for create and update; omit for delete."),
    temperamentNote: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .describe(
        "Optional owner-provided temperament note. Use null to clear it during update.",
      ),
  })
  .strict();

export const ProfileManagementResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("created"), profile: DogProfileSchema }),
  z.object({ status: z.literal("updated"), profile: DogProfileSchema }),
  z.object({ status: z.literal("deleted"), dogId: z.string().trim().min(1) }),
]);

/** Object-shaped output descriptor required for reliable MCP tools/list metadata. */
export const ProfileManagementToolOutputSchema = z
  .object({
    dogId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Deleted profile ID. Present only when status is deleted."),
    profile: DogProfileSchema.optional().describe(
      "Created or updated dog profile. Present only when status is created or updated.",
    ),
    status: z
      .enum(["created", "updated", "deleted"])
      .describe("Result of the requested profile operation."),
  })
  .strict();
