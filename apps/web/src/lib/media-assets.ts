import Dexie, { type EntityTable } from "dexie";

export interface StoredMediaAsset {
  id: string;
  mimeType: string;
  name: string;
  blob: Blob;
  createdAt: number;
}

class MediaAssetsDB extends Dexie {
  assets!: EntityTable<StoredMediaAsset, "id">;

  constructor() {
    super("svg-animator-media");
    this.version(1).stores({
      assets: "id, name, createdAt",
    });
  }
}

const mediaDb = new MediaAssetsDB();

const blobUrlCache = new Map<string, string>();

export function createMediaAssetId(): string {
  return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function storeMediaAsset(
  file: File,
  id = createMediaAssetId()
): Promise<string> {
  await mediaDb.assets.put({
    id,
    mimeType: file.type,
    name: file.name,
    blob: file,
    createdAt: Date.now(),
  });
  return id;
}

export async function resolveMediaHref(assetId: string): Promise<string | null> {
  const cached = blobUrlCache.get(assetId);
  if (cached) return cached;

  const asset = await mediaDb.assets.get(assetId);
  if (!asset) return null;

  const url = URL.createObjectURL(asset.blob);
  blobUrlCache.set(assetId, url);
  return url;
}

export async function hydrateProjectMediaHrefs(
  elements: { attrs: Record<string, string | number> }[]
): Promise<void> {
  for (const el of elements) {
    const assetId = el.attrs.assetId as string | undefined;
    if (assetId && !String(el.attrs.href ?? "").startsWith("data:")) {
      const href = await resolveMediaHref(assetId);
      if (href) el.attrs.href = href;
    }
  }
}

export function revokeMediaHref(assetId: string): void {
  const url = blobUrlCache.get(assetId);
  if (url) {
    URL.revokeObjectURL(url);
    blobUrlCache.delete(assetId);
  }
}
