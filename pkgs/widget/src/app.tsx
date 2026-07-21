import { useEffect, useState } from "react";

import {
  AssessmentResultSchema,
  type DogProfile,
  type Locale,
  ProfileManagementResultSchema,
} from "@pawlens/shared";

import { AssessmentCard } from "./assessment-card.js";
import { resolveToolInputLocale } from "./locale.js";
import {
  getStructuredContentFromBridgeMessage,
  startMcpAppsBridge,
} from "./openai-runtime.js";

import type { WidgetState } from "./widget-state.js";

export function WidgetStateView({
  dogName,
  locale = "ja",
  state,
}: {
  dogName?: string;
  locale?: Locale;
  state: WidgetState;
}) {
  if (state.kind === "empty") {
    return (
      <p className="conversation-state">
        {locale === "en"
          ? "Ready to begin an assessment."
          : "見立てを始める準備ができました。"}
      </p>
    );
  }

  if (state.kind === "loading") {
    return (
      <output className="conversation-state">
        {locale === "en"
          ? "Preparing the assessment."
          : "見立てを準備しています。"}
      </output>
    );
  }

  if (state.kind === "error") {
    return (
      <section
        aria-label={locale === "en" ? "System error" : "システムエラー"}
        data-state="error"
        className="conversation-alert"
        role="alert"
        style={{ color: "rgb(185, 28, 28)" }}
      >
        <span aria-hidden="true">!</span>
        <h2>{locale === "en" ? "System error" : "システムエラー"}</h2>
        <p>{state.message}</p>
      </section>
    );
  }

  return (
    <AssessmentCard
      assessment={state.assessment}
      dogName={dogName}
      locale={locale}
    />
  );
}

export function HelloWidget({ locale = "ja" }: { locale?: Locale }) {
  const [profile, setProfile] = useState<DogProfile>();
  const [profileDraft, setProfileDraft] = useState<
    Pick<DogProfile, "name" | "temperamentNote"> | undefined
  >();
  const [state, setState] = useState<WidgetState>({ kind: "empty" });
  const [widgetLocale, setWidgetLocale] = useState(locale);

  useEffect(() => {
    const applyStructuredContent = (
      nextContent: unknown,
      toolInput = window.openai?.toolInput,
    ) => {
      const requestedLocale = resolveToolInputLocale(toolInput);
      if (requestedLocale) setWidgetLocale(requestedLocale);

      const assessment = AssessmentResultSchema.safeParse(nextContent);
      if (assessment.success) {
        setState({ assessment: assessment.data, kind: "success" });
        return;
      }

      const profileResult =
        ProfileManagementResultSchema.safeParse(nextContent);
      if (
        profileResult.success &&
        (profileResult.data.status === "created" ||
          profileResult.data.status === "updated")
      ) {
        setProfile(profileResult.data.profile);
        return;
      }

      const draft = getProfileDraft(nextContent);
      if (draft) {
        setProfileDraft(draft);
      }
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      // Only the embedding MCP Apps host may update tool state or supply an
      // owner-selected dog ID; ignore messages from arbitrary frames.
      if (event.source !== window.parent) {
        return;
      }

      const nextContent = getStructuredContentFromBridgeMessage(event.data);
      applyStructuredContent(nextContent);
    };

    const onOpenAiGlobals = (event: Event) => {
      const globals = (
        event as CustomEvent<{
          globals?: { toolInput?: unknown; toolOutput?: unknown };
        }>
      ).detail?.globals;
      applyStructuredContent(globals?.toolOutput, globals?.toolInput);
    };

    window.addEventListener("message", onMessage, { passive: true });
    window.addEventListener("openai:set_globals", onOpenAiGlobals, {
      passive: true,
    });
    // The host may make the initial tool result available before the iframe's
    // bridge listener starts. Hydrating from the mirrored global prevents a
    // remounted widget from falling back to its blank intake screen.
    applyStructuredContent(window.openai?.toolOutput, window.openai?.toolInput);
    const stopBridge = startMcpAppsBridge(window);
    return () => {
      stopBridge();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("openai:set_globals", onOpenAiGlobals);
    };
  }, []);

  return (
    <main
      aria-live="polite"
      data-motion={
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "reduced"
          : "full"
      }
      lang={widgetLocale}
    >
      <header className="brand-header">
        <div aria-hidden="true" className="brand-mark">
          <svg aria-hidden="true" viewBox="0 0 48 48">
            <circle cx="11" cy="18" r="5" />
            <circle cx="24" cy="11" r="5" />
            <circle cx="37" cy="18" r="5" />
            <path d="M24 23c-7.4 0-12 5.1-12 10.6 0 4.2 3.8 6.4 7.1 4.1l2.2-1.5a4.9 4.9 0 0 1 5.4 0l2.2 1.5c3.3 2.3 7.1.1 7.1-4.1C36 28.1 31.4 23 24 23Z" />
          </svg>
        </div>
        <div>
          <p className="brand-eyebrow">OBSERVE · UNDERSTAND · CARE</p>
          <h1 translate="no">PawLens</h1>
          <p>
            {widgetLocale === "ja"
              ? "愛犬の「いつもと違う」を、落ち着いて観察するために。"
              : "A calm way to notice what is different for your dog."}
          </p>
        </div>
      </header>
      {state.kind === "success" ? (
        <AssessmentCard
          assessment={state.assessment}
          dogName={profile?.name}
          locale={widgetLocale}
          readOnly
        />
      ) : (
        <ConversationLedPanel
          locale={widgetLocale}
          profile={profile}
          profileDraft={profileDraft}
        />
      )}
    </main>
  );
}

function ConversationLedPanel({
  locale,
  profile,
  profileDraft,
}: {
  locale: Locale;
  profile?: DogProfile;
  profileDraft?: Pick<DogProfile, "name" | "temperamentNote">;
}) {
  const visibleProfile = profile ?? profileDraft;

  return (
    <section
      aria-label={locale === "ja" ? "PawLensの会話メモ" : "PawLens live notes"}
      className="conversation-led-panel"
    >
      <p className="section-eyebrow">PAWLENS / LIVE NOTES</p>
      {visibleProfile ? (
        <section
          aria-label={locale === "ja" ? "プロフィール" : "Profile"}
          className="profile-summary"
        >
          <p>{locale === "ja" ? "プロフィール" : "Profile"}</p>
          <h2>{visibleProfile.name}</h2>
          {visibleProfile.temperamentNote ? (
            <p>{visibleProfile.temperamentNote}</p>
          ) : null}
        </section>
      ) : null}
      <p className="conversation-led-copy">
        {locale === "ja"
          ? "画面下の入力欄、またはマイクで、愛犬の様子をそのまま話してください。会話から必要な情報だけをここに整理します。"
          : "Use the ChatGPT message box or microphone to describe what you notice. PawLens will organize only the information that matters here."}
      </p>
    </section>
  );
}

function getProfileDraft(
  content: unknown,
): Pick<DogProfile, "name" | "temperamentNote"> | undefined {
  if (!content || typeof content !== "object" || !("profileDraft" in content)) {
    return undefined;
  }

  const draft = content.profileDraft;
  if (!draft || typeof draft !== "object" || !("name" in draft)) {
    return undefined;
  }

  const name = draft.name;
  const temperamentNote =
    "temperamentNote" in draft ? draft.temperamentNote : null;
  if (
    typeof name !== "string" ||
    !name.trim() ||
    (temperamentNote !== null && typeof temperamentNote !== "string")
  ) {
    return undefined;
  }

  return { name, temperamentNote };
}
