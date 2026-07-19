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

import type { AppsSdkFileUploader, AppsSdkToolFile } from "./openai-runtime.js";

type ToolCaller = (name: string, input: unknown) => Promise<unknown>;
type AudioDurationReader = (file: File) => Promise<number | undefined>;

export interface GuidedAssessmentFormProps {
  audioSupported?: boolean;
  callTool: ToolCaller;
  fileUploader?: AppsSdkFileUploader;
  getAudioDuration?: AudioDurationReader;
  locale: Locale;
  onAssessment: (
    assessment: ReturnType<typeof AssessmentResultSchema.parse>,
  ) => void;
  onDogId?: (dogId: string) => void;
  onProfileChange?: (profile: DogProfile) => void;
}

const contextOptions = [
  { value: "visitor" },
  { value: "doorbell" },
  { value: "unknown" },
  { value: "other" },
] as const;

export function GuidedAssessmentForm({
  audioSupported = false,
  callTool,
  fileUploader,
  getAudioDuration = readAudioDuration,
  locale,
  onAssessment,
  onDogId,
  onProfileChange,
}: GuidedAssessmentFormProps) {
  const copy = formCopy[locale];
  const [barkDescription, setBarkDescription] = useState("");
  const [context, setContext] =
    useState<(typeof contextOptions)[number]["value"]>("unknown");
  const [distanceToPerson, setDistanceToPerson] = useState("");
  const [audio, setAudio] = useState<FileReference | AppsSdkToolFile | null>(
    null,
  );
  const [editingProfile, setEditingProfile] = useState(false);
  const [image, setImage] = useState<FileReference | AppsSdkToolFile | null>(
    null,
  );
  const [isRequesting, setIsRequesting] = useState(false);
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
        setStatus(getErrorMessage("profile_save_failed", locale));
        return;
      }
      setProfile(parsed.data.profile);
      setEditingProfile(false);
      onDogId?.(parsed.data.profile.id);
      onProfileChange?.(parsed.data.profile);
      setStatus(null);
    } catch {
      setStatus(getErrorMessage("profile_save_failed", locale));
    }
  };

  const requestAssessment = async () => {
    if (!profile || !barkDescription.trim()) return;

    setIsRequesting(true);
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
    } finally {
      setIsRequesting(false);
    }
  };

  const selectImage = async (file: File | undefined) => {
    setMediaNoticeVisible(true);
    if (!file) {
      setImage(null);
      return;
    }
    if (fileUploader) {
      try {
        // ChatGPT authorizes uploads and returns a short-lived download URL.
        // Never substitute a browser filename when that authorization fails.
        setImage((await fileUploader(file)) ?? null);
      } catch {
        setImage(null);
        setStatus(getErrorMessage("partial_evidence", locale));
      }
      return;
    }
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

    if (fileUploader) {
      try {
        // Audio needs the measured duration as well as host authorization so
        // the server can keep its evidence-duration guardrail deterministic.
        setAudio((await fileUploader(file, durationSeconds)) ?? null);
      } catch {
        setAudio(null);
        setStatus(getErrorMessage("partial_evidence", locale));
      }
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
      <section
        aria-labelledby="profile-start-title"
        className="intake-card conversation-panel profile-panel"
      >
        <p className="section-eyebrow">PAWLENS / PROFILE</p>
        <ol
          aria-label={locale === "ja" ? "見立ての手順" : "Assessment steps"}
          className="progress-steps"
        >
          <li className="is-active">
            <span aria-hidden="true">1</span>
            {locale === "ja" ? "愛犬を知る" : "Know your dog"}
          </li>
          <li>
            <span aria-hidden="true">2</span>
            {locale === "ja" ? "反応を観察する" : "Observe the response"}
          </li>
        </ol>
        <p className="section-intro assistant-prompt">
          {profile ? copy.updateProfileIntro : copy.createProfileIntro}
        </p>
        <h2 id="profile-start-title">{copy.profileTitle}</h2>
        <div className="form-grid profile-reply">
          <label className="form-field">
            <span>{copy.dogName}</span>
            <input
              autoComplete="off"
              name="dog-name"
              onChange={(event) => setProfileName(event.target.value)}
              placeholder={locale === "ja" ? "例：ノア" : "e.g. Noah"}
              required
              type="text"
              value={profileName}
            />
          </label>
          <label className="form-field">
            <span>{copy.temperamentNote}</span>
            <textarea
              autoComplete="off"
              name="temperament-note"
              onChange={(event) => setTemperamentNote(event.target.value)}
              placeholder={
                locale === "ja"
                  ? "人見知り、音に敏感 など"
                  : "Shy, sensitive to sounds…"
              }
              value={temperamentNote}
            />
          </label>
        </div>
        <div className="form-actions">
          <button
            disabled={!profileName.trim()}
            onClick={() => void registerProfile()}
            type="button"
          >
            {profile ? copy.updateProfile : copy.createProfile}
          </button>
          {status ? (
            <output aria-live="polite" className="form-feedback">
              {status}
            </output>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="guided-assessment-title"
      className="intake-card conversation-panel observation-panel"
    >
      <p className="section-eyebrow">PAWLENS / OBSERVATION</p>
      <p className="section-intro assistant-prompt">
        {copy.startAssessment(profile.name)}
      </p>
      <button
        className="button-secondary"
        onClick={() => setEditingProfile(true)}
        type="button"
      >
        {copy.editProfile}
      </button>
      <h2 id="guided-assessment-title">{copy.observationTitle}</h2>
      {/* A familiar chat composer keeps the observation, media, and request in one place. */}
      <div className="observation-composer">
        <label className="composer-message" htmlFor="observation-message">
          <span>{copy.barkDescription}</span>
          <textarea
            id="observation-message"
            onChange={(event) => setBarkDescription(event.target.value)}
            placeholder={copy.messagePlaceholder}
            value={barkDescription}
          />
        </label>
        <div className="composer-toolbar">
          <label className="composer-attachment">
            <span aria-hidden="true">＋</span>
            {copy.addPhoto}
            <input
              accept="image/*"
              aria-label={copy.addPhoto}
              onChange={(event) => void selectImage(event.target.files?.[0])}
              onClick={() => setMediaNoticeVisible(true)}
              type="file"
            />
          </label>
          <label
            className="composer-attachment"
            data-disabled={!audioSupported || undefined}
          >
            <span aria-hidden="true">⌁</span>
            {copy.addAudio}
            <input
              accept="audio/*"
              aria-label={copy.addAudio}
              disabled={!audioSupported}
              onChange={(event) => void selectAudio(event.target.files?.[0])}
              onClick={() => setMediaNoticeVisible(true)}
              type="file"
            />
          </label>
          <button
            aria-label={
              isRequesting ? copy.requestingAssessment : copy.requestAssessment
            }
            className="composer-submit"
            disabled={!barkDescription.trim() || isRequesting}
            onClick={() => void requestAssessment()}
            type="button"
          >
            {isRequesting ? "…" : "↑"}
          </button>
        </div>
        {image || audio ? (
          <p className="attachment-status">
            {copy.evidenceAttached(
              image ? copy.photoAttached : copy.audioAttached,
            )}
          </p>
        ) : null}
      </div>
      <details className="observation-details">
        <summary>{copy.addDetails}</summary>
        <div className="form-grid">
          <label className="form-field">
            {copy.precedingEvent}
            <input
              onChange={(event) => setPrecedingEvent(event.target.value)}
              type="text"
              value={precedingEvent}
            />
          </label>
          <label className="form-field">
            {copy.distance}
            <input
              onChange={(event) => setDistanceToPerson(event.target.value)}
              type="text"
              value={distanceToPerson}
            />
          </label>
          <label className="form-field form-field-wide">
            {copy.context}
            <select
              onChange={(event) =>
                setContext(
                  event.target
                    .value as (typeof contextOptions)[number]["value"],
                )
              }
              value={context}
            >
              {contextOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {formCopy[locale].contextOptions[option.value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
      {!audioSupported ? (
        <p className="composer-note">{copy.audioUnavailable}</p>
      ) : null}
      {mediaNoticeVisible ? (
        <p className="composer-note">
          {getErrorMessage("media_privacy_notice", locale)}
        </p>
      ) : null}
      {isRequesting ? (
        <output aria-live="polite">{copy.requestingAssessment}</output>
      ) : null}
      {status ? <output aria-live="polite">{status}</output> : null}
    </section>
  );
}

const formCopy = {
  en: {
    addAudio: "Add audio (during response)",
    addPhoto: "Add photo",
    addDetails: "Add context (optional)",
    audioUnavailable: "Audio input is unavailable in this environment.",
    audioAttached: "Audio attached",
    barkDescription: "How did the bark sound?",
    context: "Context",
    contextOptions: {
      doorbell: "Doorbell",
      other: "Other",
      unknown: "Unknown",
      visitor: "Visitor",
    },
    createProfile: "Create profile",
    createProfileIntro: "Start by creating this dog's profile.",
    distance: "Distance from people (optional)",
    dogName: "Dog's name",
    editProfile: "Edit profile",
    observationTitle: "Observe the current response",
    messagePlaceholder:
      "Tell us what you noticed. You can add a photo here, too.",
    optionalEvidence: "Optional supporting information",
    precedingEvent: "What happened just before? (optional)",
    profileTitle: "Tell us about your dog",
    requestAssessment: "Request assessment",
    requestingAssessment: "Preparing assessment…",
    startAssessment: (name: string) => `Begin ${name}'s assessment`,
    photoAttached: "Photo attached",
    evidenceAttached: (evidence: string) => `${evidence}. Ready to send.`,
    temperamentNote: "Temperament note (optional)",
    updateProfile: "Update profile",
    updateProfileIntro: "Update this profile.",
  },
  ja: {
    addAudio: "音声を追加（対応時）",
    addPhoto: "写真を追加",
    addDetails: "状況を補足する（任意）",
    audioUnavailable: "この環境では音声入力を利用できません。",
    audioAttached: "音声を添付しました",
    barkDescription: "鳴き方の特徴",
    context: "状況",
    contextOptions: {
      doorbell: "チャイム",
      other: "来客以外",
      unknown: "状況不明",
      visitor: "来客",
    },
    createProfile: "プロフィールを登録",
    createProfileIntro: "まず、この子のプロフィールを登録します。",
    distance: "人との距離（任意）",
    dogName: "愛犬の名前",
    editProfile: "プロフィールを編集",
    observationTitle: "いまの反応を観察する",
    messagePlaceholder:
      "気づいたことをそのまま書いてください。写真もここから添付できます。",
    optionalEvidence: "任意の補助情報",
    precedingEvent: "直前の出来事（任意）",
    profileTitle: "愛犬について教えてください",
    requestAssessment: "見立てを依頼",
    requestingAssessment: "見立てを準備しています…",
    startAssessment: (name: string) => `${name}の見立てを始めます`,
    photoAttached: "写真を添付しました",
    evidenceAttached: (evidence: string) => `${evidence}。このまま送れます。`,
    temperamentNote: "性格メモ（任意）",
    updateProfile: "プロフィールを更新",
    updateProfileIntro: "プロフィールを更新します。",
  },
} as const;

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
