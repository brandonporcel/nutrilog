import { type EntityTable } from "dexie";

import { db, type SyncEntity } from "@/lib/db/database";
import { setSyncStatus } from "@/lib/sync/sync-status";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/ui/toast-store";

/**
 * Sync loop (Epic 5 grows this; today it syncs units, products, categories and brands).
 *
 * Strategy — changes since last sync:
 *  - push: local rows with updated_at > lastSyncedAt → upsert to Supabase
 *  - pull: remote rows with updated_at >= lastSyncedAt → merge locally
 *  - conflicts: last-write-wins (the row with the newest updated_at wins)
 *  - if any request fails, lastSyncedAt is not advanced; the next trigger retries
 *  - self-heal: a push failing with a foreign key violation means the remote
 *    lost rows this local table references (e.g. a dev reset wiped Supabase
 *    while local watermarks survived, so changes-since skips old rows). In
 *    that case every watermark is cleared and the sync runs a second pass:
 *    a full, idempotent re-push in FK order heals the remote.
 *  - failures are logged: a silent sync is a broken sync
 *
 * Triggers live in use-sync-triggers.ts (including a periodic retry);
 * writes call scheduleSync(). TABLES order follows FK dependencies
 * (products reference units, categories and brands; template_items reference
 * templates and products; daily_log_items reference daily_logs and products)
 * so pushed rows never violate foreign keys on a first pass.
 */

const TABLES = {
  units: db.units,
  categories: db.categories,
  brands: db.brands,
  products: db.products,
  templates: db.templates,
  template_items: db.template_items,
  daily_logs: db.daily_logs,
  daily_log_items: db.daily_log_items,
} as const;

type SyncableTable = keyof typeof TABLES;

/** Every syncable entity extends SyncEntity, so a single table type is enough here. */
type SyncTable = EntityTable<SyncEntity, "id">;

let syncInProgress = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
/** Set when a push failed with an FK violation: the sync needs a second, full pass. */
let healRequested = false;

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
    // Pass 2 runs only after a foreign key violation asked for a heal:
    // pass 1 retries in FK order, and on failure clears the watermarks so
    // pass 2 re-pushes every local row (idempotent upsert).
    for (let pass = 0; pass < 2; pass++) {
      healRequested = false;
      setSyncStatus(navigator.onLine ? "syncing" : "offline");
      for (const entity of Object.keys(TABLES) as SyncableTable[]) {
        await syncTable(entity);
      }
      if (!healRequested) break;
    }
    if (navigator.onLine) setSyncStatus("synced");
  } finally {
    syncInProgress = false;
  }
}

async function syncTable(entity: SyncableTable) {
  try {
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
      if (error) {
        if (/violates foreign key constraint/.test(error.message)) {
          // Remote lost rows this table references (e.g. dev reset while the
          // local watermark survived): heal instead of alarming the user.
          console.error(
            `[sync] push ${entity} (${localChanges.length} rows) failed:`,
            error.message
          );
          await requestFullRePush();
        } else {
          reportFailure(
            `push ${entity} (${localChanges.length} rows)`,
            error.message
          );
        }
        return; // Push failed → retry on the next trigger (or pass 2).
      }
    }

    // Pull remote changes.
    let query = supabase.from(entity).select("*").eq("user_id", userId);
    if (lastSyncedAt) {
      query = query.gte("updated_at", lastSyncedAt);
    }

    const { data: remoteChanges, error: pullError } = await query;
    if (pullError) {
      reportFailure(`pull ${entity}`, pullError.message);
      return;
    }

    if (remoteChanges && remoteChanges.length > 0) {
      for (const remote of remoteChanges as SyncEntity[]) {
        const local = await table.get(remote.id);
        if (!local || remote.updated_at > local.updated_at) {
          await table.put(remote);
        }
      }
    }

    await setLastSyncedAt(entity, startedAt);
  } catch (error) {
    // e.g. a Dexie read failing mid-loop; surface it instead of hiding it.
    reportFailure(entity, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Clears every sync watermark so the next pass re-pushes ALL local rows.
 * Idempotent (upsert), and FK order makes pass 2 safe even after a remote
 * wipe. Without this, a reset remote would stay empty forever because
 * changes-since sync never re-uploads rows older than the watermark.
 */
async function requestFullRePush() {
  const keys = (Object.keys(TABLES) as SyncableTable[]).map(lastSyncedAtKey);
  await db.meta.bulkDelete(keys);
  healRequested = true;
  console.info("[sync] foreign key violation → full re-push on pass 2");
}

/**
 * A failed pass must be visible: the chip shows the state and, when online,
 * a real error deserves a toast (a network cut does not — the retry loop
 * and the chip cover that case).
 */
function reportFailure(step: string, message: string) {
  console.error(`[sync] ${step} failed:`, message);
  if (navigator.onLine) {
    setSyncStatus("error");
    toast("No se pudo sincronizar los cambios.", "error");
  } else {
    setSyncStatus("offline");
  }
}
