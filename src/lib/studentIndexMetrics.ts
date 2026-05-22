export type SportsParticipationInput = {
  participationRate: number;
  passRate: number;
  monthlyExerciseTimes: number;
  continuityDays: number;
  absenceRate: number;
};

export type SportMotivationInput = {
  activeChoiceRate: number;
  activeBookingRate: number;
  challengeRate: number;
  interestScore: number;
  achievementScore: number;
  minimumOnlyRate: number;
};

export type LearningLoadInput = {
  homeworkMinutes: number;
  tutoringHoursPerWeek: number;
  lateHomeworkRate: number;
  homeworkPressureScore: number;
  sleepCompressionRate: number;
};

export type SleepRecoveryInput = {
  sleepHours: number;
  sleepQualityScore: number;
  daytimeSleepinessScore: number;
  bedtimeHour: number;
  recoveryImprovementRate: number;
};

export type AcademicChangeInput = {
  totalScoreDelta: number;
  rankImprovement: number;
  homeworkAccuracyRate: number;
  quizScoreDelta: number;
  attentionScore: number;
};

export type EmotionPressureInput = {
  stressScore: number;
  examAnxietyScore: number;
  fatigueScore: number;
  moodScore: number;
  confidenceScore: number;
};

export type HealthRiskInput = {
  bmiRiskRate: number;
  injuryRate: number;
  restrictedRate: number;
  highFatigueRate: number;
  abnormalHeartRateRate: number;
};

export type ClassActivityInput = {
  participationRate: number;
  groupActivityTimes: number;
  classAtmosphereScore: number;
  continuityDays: number;
  projectCoverageRate: number;
};

export type GradeSportsDevelopmentInput = {
  participationRate: number;
  passRate: number;
  projectCoverageRate: number;
  improvementRate: number;
  classBalanceRate: number;
};

export type StudentGrowthInput = {
  sportsParticipationIndex: number;
  sportMotivationIndex: number;
  learningLoadIndex: number;
  sleepRecoveryIndex: number;
  academicChangeIndex: number;
  emotionPressureIndex: number;
  healthRiskIndex: number;
  classActivityIndex: number;
  gradeDevelopmentIndex: number;
};

export function clampIndex(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)));
}

export function toPercent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function calculateSportsParticipationIndex(input: SportsParticipationInput) {
  return weightedScore([
    [input.participationRate, 0.35],
    [input.passRate, 0.25],
    [scoreTarget(input.monthlyExerciseTimes, 12), 0.2],
    [scoreTarget(input.continuityDays, 7), 0.1],
    [scoreInversePercent(input.absenceRate), 0.1],
  ]);
}

export function calculateSportMotivationIndex(input: SportMotivationInput) {
  return weightedScore([
    [input.activeChoiceRate, 0.22],
    [input.activeBookingRate, 0.18],
    [input.challengeRate, 0.16],
    [scoreQuestion10(input.interestScore), 0.2],
    [scoreQuestion10(input.achievementScore), 0.16],
    [scoreInversePercent(input.minimumOnlyRate), 0.08],
  ]);
}

export function calculateLearningLoadIndex(input: LearningLoadInput) {
  return weightedScore([
    [scoreTarget(input.homeworkMinutes, 180), 0.32],
    [scoreTarget(input.tutoringHoursPerWeek, 10), 0.18],
    [input.lateHomeworkRate, 0.16],
    [scoreQuestion10(input.homeworkPressureScore), 0.22],
    [input.sleepCompressionRate, 0.12],
  ]);
}

export function calculateSleepRecoveryIndex(input: SleepRecoveryInput) {
  return weightedScore([
    [scoreSleepHours(input.sleepHours), 0.34],
    [scoreQuestion10(input.sleepQualityScore), 0.24],
    [scoreQuestion10(10 - input.daytimeSleepinessScore), 0.16],
    [scoreBedtime(input.bedtimeHour), 0.14],
    [input.recoveryImprovementRate, 0.12],
  ]);
}

export function calculateAcademicChangeIndex(input: AcademicChangeInput) {
  return weightedScore([
    [scoreDelta(input.totalScoreDelta, 20), 0.3],
    [scoreDelta(input.rankImprovement, 20), 0.2],
    [input.homeworkAccuracyRate, 0.2],
    [scoreDelta(input.quizScoreDelta, 15), 0.15],
    [scoreQuestion10(input.attentionScore), 0.15],
  ]);
}

export function calculateEmotionPressureIndex(input: EmotionPressureInput) {
  return weightedScore([
    [scoreQuestion10(input.stressScore), 0.28],
    [scoreQuestion10(input.examAnxietyScore), 0.24],
    [scoreQuestion10(input.fatigueScore), 0.18],
    [scoreQuestion10(10 - input.moodScore), 0.15],
    [scoreQuestion10(10 - input.confidenceScore), 0.15],
  ]);
}

export function calculateHealthRiskIndex(input: HealthRiskInput) {
  return weightedScore([
    [input.bmiRiskRate, 0.22],
    [input.injuryRate, 0.24],
    [input.restrictedRate, 0.2],
    [input.highFatigueRate, 0.18],
    [input.abnormalHeartRateRate, 0.16],
  ]);
}

export function calculateClassActivityIndex(input: ClassActivityInput) {
  return weightedScore([
    [input.participationRate, 0.34],
    [scoreTarget(input.groupActivityTimes, 8), 0.18],
    [scoreQuestion10(input.classAtmosphereScore), 0.2],
    [scoreTarget(input.continuityDays, 7), 0.14],
    [input.projectCoverageRate, 0.14],
  ]);
}

export function calculateGradeSportsDevelopmentIndex(
  input: GradeSportsDevelopmentInput,
) {
  return weightedScore([
    [input.participationRate, 0.26],
    [input.passRate, 0.24],
    [input.projectCoverageRate, 0.18],
    [input.improvementRate, 0.18],
    [input.classBalanceRate, 0.14],
  ]);
}

export function calculateStudentGrowthIndex(input: StudentGrowthInput) {
  return weightedScore([
    [input.sportsParticipationIndex, 0.16],
    [input.sportMotivationIndex, 0.12],
    [scoreInversePercent(input.learningLoadIndex), 0.1],
    [input.sleepRecoveryIndex, 0.12],
    [input.academicChangeIndex, 0.14],
    [scoreInversePercent(input.emotionPressureIndex), 0.12],
    [scoreInversePercent(input.healthRiskIndex), 0.1],
    [input.classActivityIndex, 0.07],
    [input.gradeDevelopmentIndex, 0.07],
  ]);
}

export function calculatePearsonCorrelation(xValues: number[], yValues: number[]) {
  const length = Math.min(xValues.length, yValues.length);
  if (length < 2) return 0;

  const x = xValues.slice(0, length);
  const y = yValues.slice(0, length);
  const xMean = average(x);
  const yMean = average(y);
  const numerator = x.reduce(
    (sum, value, index) => sum + (value - xMean) * (y[index] - yMean),
    0,
  );
  const xVariance = x.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  const yVariance = y.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  const denominator = Math.sqrt(xVariance * yVariance);

  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(2));
}

function weightedScore(items: Array<[number, number]>) {
  const weightTotal = items.reduce((sum, [, weight]) => sum + weight, 0);
  if (weightTotal <= 0) return 0;
  const score = items.reduce(
    (sum, [value, weight]) => sum + clampIndex(value) * weight,
    0,
  );
  return clampIndex(score / weightTotal);
}

function scoreTarget(value: number, target: number) {
  return target > 0 ? clampIndex((value / target) * 100) : 0;
}

function scoreInversePercent(value: number) {
  return clampIndex(100 - value);
}

function scoreQuestion10(value: number) {
  return clampIndex(value * 10);
}

function scoreSleepHours(hours: number) {
  const idealHours = 8;
  const distance = Math.abs(hours - idealHours);
  return clampIndex(100 - distance * 25);
}

function scoreBedtime(bedtimeHour: number) {
  const idealBedtime = 22.5;
  const lateDistance = Math.max(0, bedtimeHour - idealBedtime);
  return clampIndex(100 - lateDistance * 24);
}

function scoreDelta(delta: number, expectedPositiveDelta: number) {
  return clampIndex(50 + (delta / expectedPositiveDelta) * 50);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
