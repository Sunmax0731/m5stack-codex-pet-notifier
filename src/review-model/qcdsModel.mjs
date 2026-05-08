export const allowedGrades = ['S+', 'S-', 'A+', 'A-', 'B+', 'B-', 'C+', 'C-', 'D+', 'D-'];

const gradeRank = new Map(allowedGrades.map((grade, index) => [grade, allowedGrades.length - index]));
const aMinusRank = gradeRank.get('A-');

export function assertValidGrades(metrics) {
  for (const [area, grade] of Object.entries(metrics.grades ?? {})) {
    if (!allowedGrades.includes(grade)) {
      throw new Error(`invalid QCDS grade for ${area}: ${grade}`);
    }
  }
}

export function allAtLeastAMinus(metrics) {
  return Object.values(metrics.grades ?? {}).every((grade) => gradeRank.get(grade) >= aMinusRank);
}

export function enforceManualTestCap(metrics) {
  assertValidGrades(metrics);
  if (metrics.manualTestStatus !== 'passed') {
    for (const [area, grade] of Object.entries(metrics.grades ?? {})) {
      if (grade === 'S+') {
        throw new Error(`manual test cap violated by ${area}=S+`);
      }
    }
  }
  if (!allAtLeastAMinus(metrics)) {
    throw new Error('QCDS has an area below A-');
  }
  return true;
}
