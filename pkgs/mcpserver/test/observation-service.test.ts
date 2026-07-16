import { describe, expect, it } from "vitest";

import { createObservationService } from "../src/observation-service.js";
import {
    createConversationScope,
    createProfileRepository,
} from "../src/repositories.js";

class InMemoryKv {
  readonly entries = new Map<string, string>();

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async get(key: string): Promise<string | null> {
    return this.entries.get(key) ?? null;
  }

  async list(options?: { prefix?: string }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: true;
  }> {
    return {
      keys: [...this.entries.keys()]
        .filter((key) => key.startsWith(options?.prefix ?? ""))
        .map((name) => ({ name })),
      list_complete: true,
    };
  }

  async put(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
  }
}

function createServices() {
  const kv = new InMemoryKv();
  const ids = ["dog-1", "log-1", "log-2"];
  const now = () => new Date("2026-07-16T00:00:00.000Z");
  const profiles = createProfileRepository({
    createId: () => ids.shift() ?? "unexpected-id",
    kv: kv as unknown as KVNamespace,
    now,
  });
  const observations = createObservationService({
    createId: () => ids.shift() ?? "unexpected-id",
    kv: kv as unknown as KVNamespace,
    now,
    profiles,
  });

  return { kv, observations, profiles };
}

describe("ObservationService", () => {
  it("確認済み観察、主行動、記録時刻だけを完全なObservationLogとして保存する", async () => {
    const { kv, observations, profiles } = createServices();
    const scope = createConversationScope(() => "scope-owner");
    const profile = await profiles.create(scope, {
      name: "ココ",
      temperamentNote: null,
    });

    await expect(
      observations.save(scope, {
        chosenAction: "玄関から距離を取る",
        dogId: profile.id,
        observedCues: ["耳が後ろを向いた", "体が硬くなった"],
      }),
    ).resolves.toEqual({
      chosenAction: "玄関から距離を取る",
      conversationId: "scope-owner",
      dogId: "dog-1",
      id: "log-1",
      observedCues: ["耳が後ろを向いた", "体が硬くなった"],
      recordedAt: "2026-07-16T00:00:00.000Z",
    });
    expect([...kv.entries.keys()]).toContain(
      "owner:scope-owner:dog:dog-1:observation:log-1",
    );
  });

  it("AIの仮説・確信度・限界・根拠を保存入力として構造的に拒否する", async () => {
    const { kv, observations, profiles } = createServices();
    const scope = createConversationScope(() => "scope-owner");
    const profile = await profiles.create(scope, {
      name: "ココ",
      temperamentNote: null,
    });

    await expect(
      observations.save(scope, {
        chosenAction: "玄関から距離を取る",
        confidence: "high",
        dogId: profile.id,
        evidenceSources: ["research"],
        limitations: "十分な根拠があります",
        observedCues: ["耳が後ろを向いた"],
        primaryHypothesis: "警戒",
      }),
    ).rejects.toThrow();
    expect([...kv.entries.keys()]).toEqual(["owner:scope-owner:dog:dog-1"]);
  });

  it("スコープ外の個体へ観察を書き込まない", async () => {
    const { observations, profiles } = createServices();
    const ownerScope = createConversationScope(() => "scope-owner");
    const otherScope = createConversationScope(() => "scope-other");
    const profile = await profiles.create(ownerScope, {
      name: "ココ",
      temperamentNote: null,
    });

    await expect(
      observations.save(otherScope, {
        chosenAction: "玄関から距離を取る",
        dogId: profile.id,
        observedCues: ["耳が後ろを向いた"],
      }),
    ).rejects.toThrow("Profile not found in this conversation scope.");
    await expect(observations.list(ownerScope, profile.id)).resolves.toEqual(
      [],
    );
  });

  it("プロフィールの確認済み削除時に同一スコープ・個体の観察を連鎖削除する", async () => {
    const { observations, profiles } = createServices();
    const scope = createConversationScope(() => "scope-owner");
    const profile = await profiles.create(scope, {
      name: "ココ",
      temperamentNote: null,
    });
    await observations.save(scope, {
      chosenAction: "玄関から距離を取る",
      dogId: profile.id,
      observedCues: ["耳が後ろを向いた"],
    });

    await expect(
      profiles.delete(scope, { confirmed: true, dogId: profile.id }),
    ).resolves.toBe(true);
    await expect(observations.list(scope, profile.id)).resolves.toEqual([]);
  });
});
