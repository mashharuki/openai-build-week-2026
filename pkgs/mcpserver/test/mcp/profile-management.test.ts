import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import { registerManageDogProfile } from "../../src/mcp/profile-management.js";
import {
  createConversationScope,
  createProfileRepository,
} from "../../src/repositories.js";

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

describe("registerManageDogProfile", () => {
  it("サーバー生成スコープ内だけで作成・更新・確認済み削除を公開する", async () => {
    const registerTool = vi.fn();
    const repository = createProfileRepository({
      createId: () => "dog-1",
      kv: new InMemoryKv() as unknown as KVNamespace,
      now: () => new Date("2026-07-16T00:00:00.000Z"),
    });
    const ownerScope = createConversationScope(() => "owner-scope");
    const otherScope = createConversationScope(() => "other-scope");

    registerManageDogProfile(
      { registerTool } as unknown as McpServer,
      repository,
      ownerScope,
    );
    const handler = registerTool.mock.calls[0]?.[2] as (
      input: unknown,
    ) => Promise<unknown>;

    expect(registerTool).toHaveBeenCalledWith(
      "manage_dog_profile",
      expect.objectContaining({
        annotations: {
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
          readOnlyHint: false,
        },
      }),
      expect.any(Function),
    );
    await expect(
      handler({
        action: "create",
        name: "ココ",
        temperamentNote: null,
      }),
    ).resolves.toMatchObject({
      structuredContent: {
        profile: { id: "dog-1", name: "ココ" },
        status: "created",
      },
    });
    await expect(
      handler({
        action: "update",
        dogId: "dog-1",
        name: "ココア",
        temperamentNote: "来客時は距離を取る",
      }),
    ).resolves.toMatchObject({
      structuredContent: {
        profile: { id: "dog-1", name: "ココア" },
        status: "updated",
      },
    });
    await expect(
      handler({ action: "delete", confirmed: false, dogId: "dog-1" }),
    ).rejects.toThrow();
    await expect(repository.get(ownerScope, "dog-1")).resolves.not.toBeNull();
    await expect(
      handler({ action: "delete", confirmed: true, dogId: "dog-1" }),
    ).resolves.toMatchObject({
      structuredContent: { dogId: "dog-1", status: "deleted" },
    });

    await repository.create(ownerScope, {
      name: "ココ",
      temperamentNote: null,
    });
    registerManageDogProfile(
      { registerTool } as unknown as McpServer,
      repository,
      otherScope,
    );
    const otherHandler = registerTool.mock.calls[1]?.[2] as (
      input: unknown,
    ) => Promise<unknown>;

    await expect(
      otherHandler({
        action: "update",
        dogId: "dog-1",
        name: "別の名前",
        temperamentNote: null,
      }),
    ).resolves.toMatchObject({ isError: true });
    await expect(repository.get(ownerScope, "dog-1")).resolves.toMatchObject({
      name: "ココ",
    });
  });
});
