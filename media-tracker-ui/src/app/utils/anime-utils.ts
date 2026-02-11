export function getScoreColorClass(score: number): string {
  if (score >= 1 && score <= 3) return 'score-red';
  if (score >= 4 && score <= 5) return 'score-pink';
  if (score == 6) return 'score-purple';
  return '';
}

export function getScoreColor(score: number): string {
  if (score >= 1 && score <= 3) return '#ef4444';
  if (score >= 4 && score <= 5) return '#ec4899';
  if (score == 6) return '#a855f7';
  return 'var(--app-text-muted)';
}

export function formatDate(date: any): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB'); // DD/MM/YYYY format
}
