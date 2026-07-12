/**
 * Formats sequential asset codes: AST-000001
 */
export function formatAssetCode(sequence: number): string {
  if (sequence < 1 || sequence > 999999) {
    throw new Error('Asset sequence out of range');
  }
  return `AST-${String(sequence).padStart(6, '0')}`;
}

export function buildPublicAssetUrl(publicAppUrl: string, assetId: string): string {
  return `${publicAppUrl.replace(/\/$/, '')}/public/assets/${assetId}`;
}
