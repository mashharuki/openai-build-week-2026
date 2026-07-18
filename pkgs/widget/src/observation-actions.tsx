import { useState } from "react";

import {
  type AssessmentResult,
  type HistoryComparison,
  HistoryComparisonSchema,
  type Locale,
  type ObservationLog,
  ObservationLogSchema,
  ProfileManagementResultSchema,
  getErrorMessage,
} from "@pawlens/shared";

export interface ObservationActionsProps {
  assessment: AssessmentResult;
  callTool: (name: string, input: unknown) => Promise<unknown>;
  dogId: string;
  dogName?: string;
  locale: Locale;
  onHistoryComparison?: (comparison: HistoryComparison) => void;
}

export function ObservationActions({
  assessment,
  callTool,
  dogId,
  dogName,
  locale,
  onHistoryComparison,
}: ObservationActionsProps) {
  const copy = observationCopy[locale];
  const [confirmedCues, setConfirmedCues] = useState<string[]>([]);
  const [deletionConfirmed, setDeletionConfirmed] = useState(false);
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false);
  const [recentLogs, setRecentLogs] = useState<ObservationLog[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const toggleCue = (cue: string) => {
    setConfirmedCues((current) =>
      current.includes(cue)
        ? current.filter((value) => value !== cue)
        : [...current, cue],
    );
  };

  const saveObservation = async () => {
    if (!privacyConfirmed || confirmedCues.length === 0) return;

    let result: unknown;
    try {
      result = await callTool("save_observation", {
        chosenAction: assessment.suggestedAction,
        dogId,
        observedCues: confirmedCues,
      });
    } catch {
      setStatus(getErrorMessage("generation_failed", locale));
      return;
    }

    const parsed = ObservationLogSchema.safeParse(result);
    if (!parsed.success) {
      setStatus(getErrorMessage("generation_failed", locale));
      return;
    }

    // Workers KV may not reflect the write immediately. Keep its validated
    // response locally so HistoryDiff can perform a read-your-writes merge.
    const nextLogs = [
      ...recentLogs.filter((log) => log.id !== parsed.data.id),
      parsed.data,
    ];
    setRecentLogs(nextLogs);
    let comparison: unknown;
    try {
      comparison = await callTool("get_dog_history", {
        dogId,
        recentLogs: nextLogs,
      });
    } catch {
      setStatus(getErrorMessage("generation_failed", locale));
      return;
    }

    const parsedComparison = HistoryComparisonSchema.safeParse(comparison);
    if (!parsedComparison.success) {
      setStatus(copy.saved);
      return;
    }
    onHistoryComparison?.(parsedComparison.data);
    setStatus(parsedComparison.data.summary);
  };

  const deleteProfile = async () => {
    if (!deletionConfirmed) return;

    let result: unknown;
    try {
      result = await callTool("manage_dog_profile", {
        action: "delete",
        confirmed: true,
        dogId,
      });
    } catch {
      setStatus(getErrorMessage("generation_failed", locale));
      return;
    }

    const parsed = ProfileManagementResultSchema.safeParse(result);
    if (
      !parsed.success ||
      parsed.data.status !== "deleted" ||
      parsed.data.dogId !== dogId
    ) {
      setStatus(getErrorMessage("generation_failed", locale));
      return;
    }

    // Clear client-held facts only after the server confirms the cascading
    // deletion, avoiding a misleading success state after a failed request.
    setRecentLogs([]);
    setConfirmedCues([]);
    setStatus(copy.deleted);
  };

  return (
    <section aria-label={copy.sectionLabel}>
      {dogName ? <h2>{copy.recordTitle(dogName)}</h2> : null}
      <p>{getErrorMessage("privacy_notice", locale)}</p>
      <label>
        <input
          checked={privacyConfirmed}
          onChange={(event) => setPrivacyConfirmed(event.target.checked)}
          type="checkbox"
        />
        {copy.privacyConfirmed}
      </label>
      <p>{getErrorMessage("media_privacy_notice", locale)}</p>
      <fieldset>
        <legend>{copy.confirmedObservations}</legend>
        {assessment.observationPoints.map((cue) => (
          <label key={cue}>
            <input
              checked={confirmedCues.includes(cue)}
              onChange={() => toggleCue(cue)}
              type="checkbox"
            />
            {cue}
          </label>
        ))}
      </fieldset>
      <button
        disabled={!privacyConfirmed || confirmedCues.length === 0}
        onClick={() => void saveObservation()}
        type="button"
      >
        {dogName ? copy.saveNamed(dogName) : copy.save}
      </button>
      <label>
        <input
          checked={deletionConfirmed}
          onChange={(event) => setDeletionConfirmed(event.target.checked)}
          type="checkbox"
        />
        {copy.deletionConfirmed}
      </label>
      <button
        disabled={!deletionConfirmed}
        onClick={() => void deleteProfile()}
        type="button"
      >
        {copy.deleteProfile}
      </button>
      {status ? <output aria-live="polite">{status}</output> : null}
      {recentLogs.length > 0 && dogName ? (
        <p>{copy.savedDisplay(dogName)}</p>
      ) : null}
    </section>
  );
}

const observationCopy = {
  en: {
    confirmedObservations: "Observations confirmed by the owner",
    deleted: "The profile and saved observations have been deleted.",
    deletionConfirmed:
      "I understand that this dog's saved observations will also be deleted",
    deleteProfile: "Delete profile",
    privacyConfirmed: "I have reviewed what is saved and how to delete it",
    recordTitle: (name: string) => `${name}'s observation record`,
    save: "Save observation",
    sectionLabel: "Confirmed observation actions",
    saved: "Observation saved.",
    savedDisplay: (name: string) => `Showing ${name}'s saved observations.`,
    saveNamed: (name: string) => `Save ${name}'s observation`,
  },
  ja: {
    confirmedObservations: "飼い主が確認した観察",
    deleted: "プロフィールと保存済み観察を削除しました。",
    deletionConfirmed: "この犬の保存済み観察も削除されることを確認しました",
    deleteProfile: "プロフィールを削除",
    privacyConfirmed: "保存内容と削除方法を確認しました",
    recordTitle: (name: string) => `${name}の観察記録`,
    save: "観察を保存",
    sectionLabel: "確認済み観察の操作",
    saved: "観察を保存しました。",
    savedDisplay: (name: string) => `${name}の保存済み観察を表示しています。`,
    saveNamed: (name: string) => `${name}の観察を保存`,
  },
} as const;
