export interface ScoreResult {
  baseScore: number;
  adjustment: number;
  finalScore: number;
  isValidated: boolean;
  isLate: boolean;
  lateDays: number;
}

/**
 * Calculates the score with exact bonus/malus business rules:
 * - Base score: 1 point per correct answer (0..10)
 * - Bonus: +2 if submitted before session deadline (16:00 on Day J)
 * - Malus: -1 if submitted after 16:00 on Day J
 * - Extra Malus: -1 for each additional calendar day delay
 *   Calculation: adjustment = -(1 + lateDays)
 * - Final score: baseScore + adjustment
 * - Validation threshold: finalScore >= 6
 */
export function calculateBonusMalusScore(
  answers: number[],
  correctAnswers: number[],
  sessionDateStr: string, // YYYY-MM-DD
  sessionEndTimeStr: string = "16:00",
  submissionDate: Date = new Date()
): ScoreResult {
  // 1. Calculate Base Score
  let baseScore = 0;
  for (let i = 0; i < correctAnswers.length; i++) {
    if (answers[i] === correctAnswers[i]) {
      baseScore += 1;
    }
  }

  // 2. Parse session deadline
  const [year, month, day] = sessionDateStr.split("-").map(Number);
  const [endHour, endMinute] = sessionEndTimeStr.split(":").map(Number);

  // Session deadline Date object
  const deadline = new Date(year, month - 1, day, endHour, endMinute, 0);

  let adjustment = 0;
  let isLate = false;
  let lateDays = 0;

  if (submissionDate.getTime() <= deadline.getTime()) {
    // Submitted on time before deadline!
    adjustment = 2; // +2 bonus
    isLate = false;
    lateDays = 0;
  } else {
    isLate = true;
    // Calculate calendar days difference
    const deadlineDay = new Date(year, month - 1, day, 0, 0, 0);
    const subDay = new Date(
      submissionDate.getFullYear(),
      submissionDate.getMonth(),
      submissionDate.getDate(),
      0, 0, 0
    );

    const diffTime = subDay.getTime() - deadlineDay.getTime();
    lateDays = Math.max(0, Math.floor(diffTime / (1000 * 3600 * 24)));

    // Same day after 16:00 -> lateDays = 0 -> adjustment = -(1 + 0) = -1
    // 1 day late -> lateDays = 1 -> adjustment = -(1 + 1) = -2
    // 2 days late -> lateDays = 2 -> adjustment = -(1 + 2) = -3
    adjustment = -(1 + lateDays);
  }

  const finalScore = baseScore + adjustment;
  const isValidated = finalScore >= 6;

  return {
    baseScore,
    adjustment,
    finalScore,
    isValidated,
    isLate,
    lateDays,
  };
}
