import type {
  Category,
  Project,
  ProjectIndicator,
  Record as SportRecord,
  Student,
} from "../store";

export function getStudentLabel(student: Student) {
  return `${student.grade}${student.className}`;
}

export function getIndicatorName(indicator?: ProjectIndicator) {
  if (!indicator) return "无指标";
  const typeName = {
    count: "次数",
    distance: "距离",
    time: "时长",
    custom: "指标",
  }[indicator.type];

  return `${typeName} ${indicator.reqValue}${indicator.unit}`;
}

export function getProjectIndicatorText(project: Project) {
  if (!project.indicators.length) return "无指标";
  return project.indicators.map(getIndicatorName).join(" / ");
}

export function getCategoryName(project: Project, categories: Category[]) {
  return categories.find((category) => category.id === project.categoryId)?.name || "未分类";
}

export function getProjectRecords(records: SportRecord[], projectId: string) {
  return records.filter((record) => record.projectId === projectId && !record.isInvalid);
}

export function getValidPassedRecords(records: SportRecord[]) {
  return records.filter((record) => record.isPassed && !record.isInvalid);
}

export function getTotalTimes(records: SportRecord[]) {
  return records.reduce((sum, record) => sum + (record.totalTimes || (record.isPassed ? 1 : 0)), 0);
}

export function getProjectStats(
  project: Project,
  records: SportRecord[],
  students: Student[],
) {
  const projectRecords = getProjectRecords(records, project.id);
  const passedRecords = getValidPassedRecords(projectRecords);
  const participantIds = new Set(projectRecords.map((record) => record.studentId));
  const passedIds = new Set(passedRecords.map((record) => record.studentId));
  const targetTimes = project.targetCompletionsPerPeriod || 1;

  return {
    totalRecords: projectRecords.length,
    passedRecords: passedRecords.length,
    participants: participantIds.size,
    passedStudents: passedIds.size,
    totalTimes: getTotalTimes(passedRecords),
    completionRate:
      students.length > 0 ? Math.round((passedIds.size / students.length) * 100) : 0,
    targetTimes,
  };
}

export function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<{ [key: string]: T[] }>((groups, item) => {
    const key = getKey(item);
    groups[key] = [...(groups[key] || []), item];
    return groups;
  }, {});
}

export function getStudentTotalTimes(studentId: string, records: SportRecord[]) {
  return getTotalTimes(
    records.filter(
      (record) => record.studentId === studentId && record.isPassed && !record.isInvalid,
    ),
  );
}
