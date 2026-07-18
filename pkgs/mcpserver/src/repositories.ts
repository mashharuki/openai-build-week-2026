import {
  DeleteProfileInputSchema,
  type DogProfile,
  DogProfileSchema,
} from "@pawlens/shared";

declare const conversationScopeBrand: unique symbol;

export type ConversationScope = string & {
  readonly [conversationScopeBrand]: "server-generated";
};

export type ProfileDraft = Pick<DogProfile, "name" | "temperamentNote">;
export type ProfileDeletionHandler = (
  scope: ConversationScope,
  dogId: string,
) => Promise<void>;

export interface ProfileRepositoryDependencies {
  createId: () => string;
  kv: KVNamespace;
  now: () => Date;
}

export interface ProfileRepository {
  create(scope: ConversationScope, profile: ProfileDraft): Promise<DogProfile>;
  delete(scope: ConversationScope, input: unknown): Promise<boolean>;
  get(scope: ConversationScope, dogId: string): Promise<DogProfile | null>;
  registerDeletionHandler(handler: ProfileDeletionHandler): void;
  update(
    scope: ConversationScope,
    dogId: string,
    profile: ProfileDraft,
  ): Promise<DogProfile | null>;
}

export function createConversationScope(
  createId: () => string = () => crypto.randomUUID(),
): ConversationScope {
  return createId() as ConversationScope;
}

function profileKey(scope: ConversationScope, dogId: string): string {
  // Scope precedes dog ID so identical user-provided IDs cannot cross the
  // server-owned conversation boundary in KV.
  return `owner:${scope}:dog:${dogId}`;
}

function parseProfileDraft(profile: ProfileDraft): ProfileDraft {
  return DogProfileSchema.pick({
    name: true,
    temperamentNote: true,
  }).parse(profile);
}

export function createProfileRepository(
  dependencies: ProfileRepositoryDependencies,
): ProfileRepository {
  let deletionHandler: ProfileDeletionHandler | undefined;

  async function get(
    scope: ConversationScope,
    dogId: string,
  ): Promise<DogProfile | null> {
    const stored = await dependencies.kv.get(profileKey(scope, dogId));

    return stored === null ? null : DogProfileSchema.parse(JSON.parse(stored));
  }

  return {
    async create(scope, profile) {
      const now = dependencies.now().toISOString();
      const dogProfile = DogProfileSchema.parse({
        ...parseProfileDraft(profile),
        createdAt: now,
        id: dependencies.createId(),
        updatedAt: now,
      });

      await dependencies.kv.put(
        profileKey(scope, dogProfile.id),
        JSON.stringify(dogProfile),
      );

      return dogProfile;
    },

    async delete(scope, input) {
      const deletion = DeleteProfileInputSchema.parse(input);
      const profile = await get(scope, deletion.dogId);

      if (!profile) {
        return false;
      }

      await deletionHandler?.(scope, deletion.dogId);
      await dependencies.kv.delete(profileKey(scope, deletion.dogId));
      return true;
    },

    get,

    registerDeletionHandler(handler) {
      deletionHandler = handler;
    },

    async update(scope, dogId, profile) {
      const existing = await get(scope, dogId);

      if (!existing) {
        return null;
      }

      const updated = DogProfileSchema.parse({
        ...existing,
        ...parseProfileDraft(profile),
        updatedAt: dependencies.now().toISOString(),
      });

      await dependencies.kv.put(
        profileKey(scope, dogId),
        JSON.stringify(updated),
      );
      return updated;
    },
  };
}
