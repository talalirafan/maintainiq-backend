/**
 * Formats sequential issue numbers: ISS-000001
 */
export function formatIssueNumber(sequence: number): string {
  if (sequence < 1 || sequence > 999999) {
    throw new Error('Issue sequence out of range');
  }
  return `ISS-${String(sequence).padStart(6, '0')}`;
}
