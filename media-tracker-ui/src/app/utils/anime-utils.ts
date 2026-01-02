export function getScoreColorClass(score: number): string {
  if (score >= 1 && score <= 5) return 'score-red';
  if (score >= 6 && score <= 10) return 'score-pink';
  if (score === 11) return 'score-purple';
  return '';
}
