/**
 * Formats sequential maintenance record numbers: MNT-000001
 */
export function formatMaintenanceNumber(sequence: number): string {
  if (sequence < 1 || sequence > 999999) {
    throw new Error('Maintenance sequence out of range');
  }
  return `MNT-${String(sequence).padStart(6, '0')}`;
}
