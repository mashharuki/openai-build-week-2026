import type { z } from "zod";
import type {
  CONFIDENCE_LEVELS,
  SIGNAL_CONTEXTS,
  SUPPORTED_LOCALES,
} from "./constants.js";
import type {
  AssessmentResultSchema,
  DeleteProfileInputSchema,
  DogProfileSchema,
  FileReferenceSchema,
  HistoryComparisonSchema,
  ObservationLogSchema,
  SaveObservationInputSchema,
  SignalInputSchema,
} from "./schemas.js";

export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;
export type DeleteProfileInput = z.infer<typeof DeleteProfileInputSchema>;
export type DogProfile = z.infer<typeof DogProfileSchema>;
export type FileReference = z.infer<typeof FileReferenceSchema>;
export type HistoryComparison = z.infer<typeof HistoryComparisonSchema>;
export type ObservationLog = z.infer<typeof ObservationLogSchema>;
export type SaveObservationInput = z.infer<typeof SaveObservationInputSchema>;
export type SignalInput = z.infer<typeof SignalInputSchema>;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type SignalContext = (typeof SIGNAL_CONTEXTS)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];
