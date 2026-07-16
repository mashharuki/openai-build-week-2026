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

export const DogProfileSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  temperamentNote: z.string().trim().max(500).nullable(),
  updatedAt: z.string().datetime(),
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

export const HypothesisSchema = z.object({
  label: z.string().trim().min(1).max(300),
  rationale: z.string().trim().min(1).max(1_000),
});

export const AssessmentResultSchema = z.object({
  additionalQuestion: z.string().trim().min(1).max(500).nullable(),
  confidence: ConfidenceSchema,
  evidenceSources: z
    .array(z.enum(["research", "confirmed_observation"]))
    .min(1),
  limitations: z.string().trim().min(1).max(1_000),
  observationPoints: z.array(z.string().trim().min(1)).min(1).max(10),
  primaryHypothesis: HypothesisSchema,
  secondaryHypotheses: z.array(HypothesisSchema).max(3),
  status: z.enum(["success", "partial", "urgent", "error"]),
  suggestedAction: z.string().trim().min(1).max(500),
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

const ProfileDraftSchema = DogProfileSchema.pick({
  name: true,
  temperamentNote: true,
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

export const ProfileManagementResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("created"), profile: DogProfileSchema }),
  z.object({ status: z.literal("updated"), profile: DogProfileSchema }),
  z.object({ status: z.literal("deleted"), dogId: z.string().trim().min(1) }),
]);
