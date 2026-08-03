import { publicUrl } from "./WorldSpec.js";


const SUPPORTED_SCHEMA_VERSION = "echo-assets.v1";

export class AssetCatalog {
  constructor(records) {
    this.records = records;
  }

  static async load(assetStore, url) {
    const data = await assetStore.loadJson(url);
    if (data.schema_version !== SUPPORTED_SCHEMA_VERSION) {
      throw new Error(`Unsupported AssetCatalog schema: ${data.schema_version}`);
    }
    if (!Array.isArray(data.assets)) {
      throw new Error("AssetCatalog assets must be an array");
    }

    const records = new Map();
    for (const asset of data.assets) {
      if (!asset?.asset_id || !asset?.kind || !asset?.url) {
        throw new Error("AssetCatalog entries require asset_id, kind, and url");
      }
      if (records.has(asset.asset_id)) {
        throw new Error(`Duplicate asset_id: ${asset.asset_id}`);
      }
      records.set(asset.asset_id, Object.freeze({ ...asset }));
    }
    return new AssetCatalog(records);
  }

  resolve(assetId, expectedKind) {
    const record = this.records.get(assetId);
    if (!record) throw new Error(`Unknown asset_id: ${assetId}`);
    if (expectedKind && record.kind !== expectedKind) {
      throw new Error(
        `Asset kind mismatch for ${assetId}: ${record.kind} != ${expectedKind}`,
      );
    }
    return {
      ...record,
      resolvedUrl: publicUrl(record.url),
    };
  }
}
