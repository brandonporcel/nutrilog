import { type EntityTable } from "dexie";

import { db, type SyncEntity } from "@/lib/db/database";
import { createClient } from "@/lib/supabase/client";

/**
 * Sync loop (Epic 5 grows this; today it syncs units, products, categories and brands).
 *
 * Strategy — changes since last sync:
 *  - push: local rows with updated_at > lastSyncedAt → upsert to Supabase
 *  - pull: remote rows with updated_at >= lastSyncedAt → merge locally
 *  - conflicts: last-write-wins (the row with the newest updated_at wins)
 *  - if any request fails, lastSyncedAt is not advanced; the next trigger retries
 *
 * Triggers live in use-sync-triggers.ts; writes call scheduleSync().
 */

const TABLES = {
  units: db.units,
  products: db.products,
  categories: db.categories,
  brands: db.brands,
} as const;

type SyncableTable = keyof typeof TABLES;

/** Every syncable entity extends SyncEntity, so a single table type is enough here. */
type SyncTable = EntityTable<SyncEntity, "id">;

let syncInProgress = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function lastSyncedAtKey(entity: string) {
  return `${entity}:lastSyncedAt`;
}

async function getLastSyncedAt(entity: string): Promise<string | null> {
  const row = await db.meta.get(lastSyncedAtKey(entity));
  return row?.value ?? null;
}

async function setLastSyncedAt(entity: string, timestamp: string) {
  await db.meta.put({ key: lastSyncedAtKey(entity), value: timestamp });
}

/** Debounced trigger after local writes. */
export function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void sync();
  }, 2000);
}

export async function sync(): Promise<void> {
  if (typeof window === "undefined" || syncInProgress) return;
  syncInProgress = true;
  try {
    for (const entity of Object.keys(TABLES) as SyncableTable[]) {
      await syncTable(entity);
    }
  } finally {
    syncInProgress = false;
  }
}

async function syncTable(entity: SyncableTable) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  const userId = session.user.id;
  const table = TABLES[entity] as unknown as SyncTable;
  const lastSyncedAt = await getLastSyncedAt(entity);
  const startedAt = new Date().toISOString();

  // Push local changes.
  const localChanges = lastSyncedAt
    ? await table
        .where("user_id")
        .equals(userId)
        .filter((row) => row.updated_at > lastSyncedAt)
        .toArray()
    : await table.where("user_id").equals(userId).toArray();

  if (localChanges.length > 0) {
    const { error } = await supabase.from(entity).upsert(localChanges);
    if (error) return; // Push failed → retry on the next trigger.
  }

  // Pull remote changes.
  let query = supabase.from(entity).select("*").eq("user_id", userId);
  if (lastSyncedAt) {
    query = query.gte("updated_at", lastSyncedAt);
  }

  const { data: remoteChanges, error: pullError } = await query;
  if (pullError) return;

  if (remoteChanges && remoteChanges.length > 0) {
    for (const remote of remoteChanges as SyncEntity[]) {
      const local = await table.get(remote.id);
      if (!local || remote.updated_at > local.updated_at) {
        await table.put(remote);
      }
    }
  }

  await setLastSyncedAt(entity, startedAt);
}
