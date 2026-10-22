export interface QualityRow {
  id: string;
  acceptedIds: string[];
  ranking: { id: string; score: number }[];
}
export interface AbstentionPolicy {
  minimumScore: number;
  minimumMargin: number;
}
export function accepts(row: QualityRow, policy: AbstentionPolicy): boolean {
  if (row.ranking.length < 2) return false;
  const [first, second] = row.ranking;
  return (
    Number.isFinite(first.score) &&
    Number.isFinite(second.score) &&
    first.score >= policy.minimumScore &&
    first.score - second.score >= policy.minimumMargin
  );
}
export function quality(rows: QualityRow[], policy: AbstentionPolicy) {
  let covered = 0,
    top1 = 0,
    top4 = 0,
    accepted = 0,
    correctAccepted = 0,
    coveredAccepted = 0,
    unsupportedAccepted = 0;
  const confusion: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const coveredRow = row.acceptedIds.length > 0;
    const correct = row.acceptedIds.includes(row.ranking[0]?.id);
    if (coveredRow) {
      covered++;
      if (correct) top1++;
      if (row.ranking.slice(0, 4).some((p) => row.acceptedIds.includes(p.id)))
        top4++;
    }
    const truth = row.acceptedIds[0] ?? "unsupported",
      prediction = row.ranking[0]?.id ?? "none";
    confusion[truth] ??= {};
    confusion[truth][prediction] = (confusion[truth][prediction] ?? 0) + 1;
    if (accepts(row, policy)) {
      accepted++;
      if (correct) correctAccepted++;
      if (coveredRow) coveredAccepted++;
      else unsupportedAccepted++;
    }
  }
  return {
    total: rows.length,
    covered,
    unsupported: rows.length - covered,
    top1,
    top4,
    coveredTop1: covered ? top1 / covered : null,
    coveredTop4: covered ? top4 / covered : null,
    accepted,
    correctAccepted,
    acceptedPrecision: accepted ? correctAccepted / accepted : null,
    coveredAccepted,
    coveredCoverage: covered ? coveredAccepted / covered : null,
    unsupportedAccepted,
    abstained: rows.length - accepted,
    confusion,
  };
}
/** Calibrate only on the declared calibration split. Finite 2 rejects all cosine rows. */
export function calibrate(rows: QualityRow[]): AbstentionPolicy {
  const scores = [2, ...new Set(rows.map((r) => r.ranking[0].score))];
  const margins = [
    0,
    ...new Set(rows.map((r) => r.ranking[0].score - r.ranking[1].score)),
  ];
  let best = { minimumScore: 2, minimumMargin: 2 };
  let bestCorrect = 0,
    bestWrong = 0;
  for (const minimumScore of scores)
    for (const minimumMargin of margins) {
      const policy = { minimumScore, minimumMargin },
        q = quality(rows, policy),
        wrong = q.accepted - q.correctAccepted;
      if (
        q.unsupportedAccepted ||
        q.acceptedPrecision === null ||
        q.acceptedPrecision < 0.9
      )
        continue;
      if (
        q.correctAccepted > bestCorrect ||
        (q.correctAccepted === bestCorrect &&
          (wrong < bestWrong ||
            (wrong === bestWrong &&
              (minimumScore > best.minimumScore ||
                (minimumScore === best.minimumScore &&
                  minimumMargin > best.minimumMargin)))))
      ) {
        best = policy;
        bestCorrect = q.correctAccepted;
        bestWrong = wrong;
      }
    }
  return best;
}
