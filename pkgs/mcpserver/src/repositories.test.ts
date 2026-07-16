import { describe, expect, it } from "vitest";

import {
  createConversationScope,
  createProfileRepository,
} from "./repositories.js";

class InMemoryKv {
  readonly entries = new Map<string, string>();

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async get(key: string): Promise<string | null> {
    return this.entries.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
  }
}

describe("ProfileRepository", () => {
  it("サーバー生成スコープ内で最小プロフィールを作成・更新・読取できる", async () => {
    const kv = new InMemoryKv();
    const repository = createProfileRepository({
      createId: () => "dog-1",
      kv: kv as unknown as KVNamespace,
      now: () => new Date("2026-07-16T00:00:00.000Z"),
    });
    const scope = createConversationScope(() => "scope-owner");

    const created = await repository.create(scope, {
      name: "ココ",
      temperamentNote: "来客時は距離を取りたがる",
    });
    const updated = await repository.update(scope, created.id, {
      name: "ココア",
      temperamentNote: null,
    });

    expect(created).toEqual({
      createdAt: "2026-07-16T00:00:00.000Z",
      id: "dog-1",
      name: "ココ",
      temperamentNote: "来客時は距離を取りたがる",
      updatedAt: "2026-07-16T00:00:00.000Z",
    });
    expect(updated).toEqual({
      ...created,
      name: "ココア",
      temperamentNote: null,
    });
    await expect(repository.get(scope, created.id)).resolves.toEqual(updated);
    expect([...kv.entries.keys()]).toEqual(["owner:scope-owner:dog:dog-1"]);
  });

  it("別スコープの読取・更新・削除を不成立にする", async () => {
    const kv = new InMemoryKv();
    const repository = createProfileRepository({
      createId: () => "dog-1",
      kv: kv as unknown as KVNamespace,
      now: () => new Date("2026-07-16T00:00:00.000Z"),
    });
    const ownerScope = createConversationScope(() => "scope-owner");
    const otherScope = createConversationScope(() => "scope-other");
    const profile = await repository.create(ownerScope, {
      name: "ココ",
      temperamentNote: null,
    });

    await expect(repository.get(otherScope, profile.id)).resolves.toBeNull();
    await expect(
      repository.update(otherScope, profile.id, {
        name: "別の名前",
        temperamentNote: null,
      }),
    ).resolves.toBeNull();
    await expect(
      repository.delete(otherScope, { confirmed: true, dogId: profile.id }),
    ).resolves.toBe(false);
    await expect(repository.get(ownerScope, profile.id)).resolves.toEqual(
      profile,
    );
  });

  it("削除確認が有効な場合だけプロフィールを削除する", async () => {
    const kv = new InMemoryKv();
    const repository = createProfileRepository({
      createId: () => "dog-1",
      kv: kv as unknown as KVNamespace,
      now: () => new Date("2026-07-16T00:00:00.000Z"),
    });
    const scope = createConversationScope(() => "scope-owner");
    const profile = await repository.create(scope, {
      name: "ココ",
      temperamentNote: null,
    });

    await expect(
      repository.delete(scope, { confirmed: false, dogId: profile.id }),
    ).rejects.toThrow();
    await expect(repository.get(scope, profile.id)).resolves.toEqual(profile);
    await expect(
      repository.delete(scope, { confirmed: true, dogId: profile.id }),
    ).resolves.toBe(true);
    await expect(repository.get(scope, profile.id)).resolves.toBeNull();
  });
});
