import {
  type ObservationLog,
  ObservationLogSchema,
  SaveObservationInputSchema,
} from "@pawlens/shared";

import type { ConversationScope, ProfileRepository } from "./repositories.js";

export interface ObservationServiceDependencies {
  createId: () => string;
  kv: KVNamespace;
  now: () => Date;
  profiles: ProfileRepository;
}

export interface ObservationService {
  list(scope: ConversationScope, dogId: string): Promise<ObservationLog[]>;
  save(scope: ConversationScope, input: unknown): Promise<ObservationLog>;
}

function observationPrefix(scope: ConversationScope, dogId: string): string {
  return `owner:${scope}:dog:${dogId}:observation:`;
}

export function createObservationService(
  dependencies: ObservationServiceDependencies,
): ObservationService {
  async function observationKeys(
    scope: ConversationScope,
    dogId: string,
  ): Promise<string[]> {
    const keys: string[] = [];
    const prefix = observationPrefix(scope, dogId);
    let cursor: string | undefined;

    while (true) {
      const page = await dependencies.kv.list({ cursor, prefix });
      keys.push(...page.keys.map((key) => key.name));
      if (page.list_complete) {
        break;
      }

      cursor = page.cursor;
    }

    return keys;
  }

  async function list(
    scope: ConversationScope,
    dogId: string,
  ): Promise<ObservationLog[]> {
    const keys = await observationKeys(scope, dogId);
    const stored = await Promise.all(
      keys.map((key) => dependencies.kv.get(key)),
    );

    return stored
      .filter((entry): entry is string => entry !== null)
      .map((entry) => ObservationLogSchema.parse(JSON.parse(entry)));
  }

  async function removeForProfile(
    scope: ConversationScope,
    dogId: string,
  ): Promise<void> {
    const keys = await observationKeys(scope, dogId);
    await Promise.all(keys.map((key) => dependencies.kv.delete(key)));
  }

  dependencies.profiles.registerDeletionHandler(removeForProfile);

  return {
    list,

    async save(scope, input) {
      const observation = SaveObservationInputSchema.parse(input);
      const profile = await dependencies.profiles.get(scope, observation.dogId);

      if (!profile) {
        throw new Error("Profile not found in this conversation scope.");
      }

      const log = ObservationLogSchema.parse({
        ...observation,
        conversationId: scope,
        id: dependencies.createId(),
        recordedAt: dependencies.now().toISOString(),
      });

      await dependencies.kv.put(
        `${observationPrefix(scope, log.dogId)}${log.id}`,
        JSON.stringify(log),
      );

      return log;
    },
  };
}
