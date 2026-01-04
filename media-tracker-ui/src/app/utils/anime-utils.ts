export function getScoreColorClass(score: number): string {
  if (score >= 1 && score <= 5) return 'score-red';
  if (score >= 6 && score <= 10) return 'score-pink';
  if (score === 11) return 'score-purple';
  return '';
}

export function getScoreColor(score: number): string {
  if (score >= 8) return 'var(--app-success)';
  if (score >= 6) return 'var(--app-accent-yellow)';
  return 'var(--app-danger)';
}

export function formatDate(date: any): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB'); // DD/MM/YYYY format
}
