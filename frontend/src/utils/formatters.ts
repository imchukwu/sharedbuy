/**
 * Format integer kobo into Nigerian Naira (₦) string
 * Example: 982500 -> "₦9,825"
 */
export function formatKobo(kobo: number): string {
  const naira = Math.floor(kobo / 100);
  return '₦' + naira.toLocaleString('en-NG');
}

/**
 * Format ISO date string into readable format
 * Example: "2026-10-30T10:00:00Z" -> "Fri, 30 Oct"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Calculate humanized time remaining until deadline
 */
export function formatTimeLeft(deadlineStr: string): string {
  if (!deadlineStr) return '';
  const now = new Date().getTime();
  const target = new Date(deadlineStr).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) return 'Closed';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    return `${diffHours}h left`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d left`;
}
