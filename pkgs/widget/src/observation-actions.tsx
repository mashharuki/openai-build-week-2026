import { useState } from "react";

import {
  type AssessmentResult,
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
  locale: Locale;
}

export function ObservationActions({
  assessment,
  callTool,
  dogId,
  locale,
}: ObservationActionsProps) {
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

    setStatus(
      comparison &&
        typeof comparison === "object" &&
        "summary" in comparison &&
        typeof comparison.summary === "string"
        ? comparison.summary
        : "観察を保存しました。",
    );
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

    setRecentLogs([]);
    setConfirmedCues([]);
    setStatus("プロフィールと保存済み観察を削除しました。");
  };

  return (
    <section aria-label="confirmed observation actions">
      <p>{getErrorMessage("privacy_notice", locale)}</p>
      <label>
        <input
          checked={privacyConfirmed}
          onChange={(event) => setPrivacyConfirmed(event.target.checked)}
          type="checkbox"
        />
        保存内容と削除方法を確認しました
      </label>
      <p>{getErrorMessage("media_privacy_notice", locale)}</p>
      <fieldset>
        <legend>飼い主が確認した観察</legend>
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
        観察を保存
      </button>
      <label>
        <input
          checked={deletionConfirmed}
          onChange={(event) => setDeletionConfirmed(event.target.checked)}
          type="checkbox"
        />
        この犬の保存済み観察も削除されることを確認しました
      </label>
      <button
        disabled={!deletionConfirmed}
        onClick={() => void deleteProfile()}
        type="button"
      >
        プロフィールを削除
      </button>
      {status ? <output aria-live="polite">{status}</output> : null}
    </section>
  );
}
