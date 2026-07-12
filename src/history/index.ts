/**
 * Immutable asset history timeline — append-only.
 * Writes go through assetHistoryRepository.append; this module exposes the read API.
 */
export const historyModule = {
  name: 'history',
  status: 'active' as const,
  appendOnly: true,
};
