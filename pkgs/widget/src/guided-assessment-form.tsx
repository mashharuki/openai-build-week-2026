import { useState } from "react";

import {
  AssessmentResultSchema,
  type DogProfile,
  type FileReference,
  type Locale,
  MAX_AUDIO_DURATION_SECONDS,
  ProfileManagementResultSchema,
  getErrorMessage,
} from "@pawlens/shared";

type ToolCaller = (name: string, input: unknown) => Promise<unknown>;
type AudioDurationReader = (file: File) => Promise<number | undefined>;

export interface GuidedAssessmentFormProps {
  audioSupported?: boolean;
  callTool: ToolCaller;
  getAudioDuration?: AudioDurationReader;
  locale: Locale;
  onAssessment: (
    assessment: ReturnType<typeof AssessmentResultSchema.parse>,
  ) => void;
  onDogId?: (dogId: string) => void;
  onProfileChange?: (profile: DogProfile) => void;
}

const contextOptions = [
  { label: "来客", value: "visitor" },
  { label: "チャイム", value: "doorbell" },
  { label: "状況不明", value: "unknown" },
  { label: "来客以外", value: "other" },
] as const;

export function GuidedAssessmentForm({
  audioSupported = false,
  callTool,
  getAudioDuration = readAudioDuration,
  locale,
  onAssessment,
  onDogId,
  onProfileChange,
}: GuidedAssessmentFormProps) {
  const [barkDescription, setBarkDescription] = useState("");
  const [context, setContext] =
    useState<(typeof contextOptions)[number]["value"]>("unknown");
  const [distanceToPerson, setDistanceToPerson] = useState("");
  const [audio, setAudio] = useState<FileReference | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [image, setImage] = useState<FileReference | null>(null);
  const [mediaNoticeVisible, setMediaNoticeVisible] = useState(false);
  const [precedingEvent, setPrecedingEvent] = useState("");
  const [profile, setProfile] = useState<DogProfile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [temperamentNote, setTemperamentNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const registerProfile = async () => {
    const name = profileName.trim();
    if (!name) return;

    try {
      const action = profile ? "update" : "create";
      const result = await callTool("manage_dog_profile", {
        action,
        ...(profile ? { dogId: profile.id } : {}),
        name,
        temperamentNote: temperamentNote.trim() || null,
      });
      const parsed = ProfileManagementResultSchema.safeParse(result);
      if (
        !parsed.success ||
        (parsed.data.status !== "created" && parsed.data.status !== "updated")
      ) {
        setStatus(getErrorMessage("generation_failed", locale));
        return;
      }
      setProfile(parsed.data.profile);
      setEditingProfile(false);
      onDogId?.(parsed.data.profile.id);
      onProfileChange?.(parsed.data.profile);
      setStatus(null);
    } catch {
      setStatus(getErrorMessage("generation_failed", locale));
    }
  };

  const requestAssessment = async () => {
    if (!profile || !barkDescription.trim()) return;

    try {
      const result = await callTool("analyze_dog_signal", {
        audio,
        barkDescription: barkDescription.trim(),
        context,
        distanceToPerson: distanceToPerson.trim() || null,
        dogId: profile.id,
        image,
        locale,
        precedingEvent: precedingEvent.trim() || null,
      });
      const parsed = AssessmentResultSchema.safeParse(result);
      if (!parsed.success) {
        setStatus(getErrorMessage("generation_failed", locale));
        return;
      }
      setStatus(null);
      onAssessment(parsed.data);
    } catch {
      setStatus(getErrorMessage("generation_failed", locale));
    }
  };

  const selectImage = (file: File | undefined) => {
    setMediaNoticeVisible(true);
    setImage(
      file
        ? {
            fileId: file.name,
            mimeType: file.type || "image/*",
          }
        : null,
    );
  };

  const selectAudio = async (file: File | undefined) => {
    setMediaNoticeVisible(true);
    if (!file) {
      setAudio(null);
      return;
    }

    const durationSeconds = await getAudioDuration(file);
    if (
      durationSeconds === undefined ||
      durationSeconds < 1 ||
      durationSeconds > MAX_AUDIO_DURATION_SECONDS
    ) {
      setAudio(null);
      setStatus(getErrorMessage("partial_evidence", locale));
      return;
    }

    setAudio({
      durationSeconds,
      fileId: file.name,
      mimeType: file.type || "audio/*",
    });
  };

  if (!profile || editingProfile) {
    return (
      <section aria-labelledby="profile-start-title">
        <p>
          {profile
            ? "プロフィールを更新します。"
            : "まず、この子のプロフィールを登録します。"}
        </p>
        <h2 id="profile-start-title">愛犬について教えてください</h2>
        <label>
          愛犬の名前
          <input
            onChange={(event) => setProfileName(event.target.value)}
            type="text"
            value={profileName}
          />
        </label>
        <label>
          性格メモ（任意）
          <textarea
            onChange={(event) => setTemperamentNote(event.target.value)}
            value={temperamentNote}
          />
        </label>
        <button
          disabled={!profileName.trim()}
          onClick={() => void registerProfile()}
          type="button"
        >
          {profile ? "プロフィールを更新" : "プロフィールを登録"}
        </button>
        {status ? <output aria-live="polite">{status}</output> : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="guided-assessment-title">
      <p>{profile.name}の見立てを始めます</p>
      <button onClick={() => setEditingProfile(true)} type="button">
        プロフィールを編集
      </button>
      <h2 id="guided-assessment-title">いまの反応を観察する</h2>
      <label>
        鳴き方の特徴
        <textarea
          onChange={(event) => setBarkDescription(event.target.value)}
          value={barkDescription}
        />
      </label>
      <label>
        直前の出来事（任意）
        <input
          onChange={(event) => setPrecedingEvent(event.target.value)}
          type="text"
          value={precedingEvent}
        />
      </label>
      <label>
        人との距離（任意）
        <input
          onChange={(event) => setDistanceToPerson(event.target.value)}
          type="text"
          value={distanceToPerson}
        />
      </label>
      <label>
        状況
        <select
          onChange={(event) =>
            setContext(
              event.target.value as (typeof contextOptions)[number]["value"],
            )
          }
          value={context}
        >
          {contextOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>任意の補助情報</legend>
        <label>
          写真を追加
          <input
            accept="image/*"
            onChange={(event) => selectImage(event.target.files?.[0])}
            onClick={() => setMediaNoticeVisible(true)}
            type="file"
          />
        </label>
        <label>
          音声を追加（対応時）
          <input
            accept="audio/*"
            disabled={!audioSupported}
            onChange={(event) => void selectAudio(event.target.files?.[0])}
            onClick={() => setMediaNoticeVisible(true)}
            type="file"
          />
        </label>
        {!audioSupported ? <p>この環境では音声入力を利用できません。</p> : null}
        {mediaNoticeVisible ? (
          <p>{getErrorMessage("media_privacy_notice", locale)}</p>
        ) : null}
      </fieldset>
      <button
        disabled={!barkDescription.trim()}
        onClick={() => void requestAssessment()}
        type="button"
      >
        見立てを依頼
      </button>
      {status ? <output aria-live="polite">{status}</output> : null}
    </section>
  );
}

function readAudioDuration(file: File): Promise<number | undefined> {
  if (
    typeof Audio === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    const finish = (duration: number | undefined) => {
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };

    audio.addEventListener("loadedmetadata", () => finish(audio.duration), {
      once: true,
    });
    audio.addEventListener("error", () => finish(undefined), { once: true });
    audio.src = objectUrl;
  });
}
