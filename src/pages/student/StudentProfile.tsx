import { type ReactNode, useMemo, useState } from "react";
import { format, startOfWeek, subWeeks } from "date-fns";
import {
  Activity,
  BellRing,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  Footprints,
  HeartPulse,
  Moon,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/ui/Header";
import {
  DUMMY_STUDENTS,
  type Category,
  type Project,
  type Record as SportRecord,
  type Student,
  useAppStore,
} from "../../store";
import {
  getCategoryName,
  getStudentLabel,
  getTotalTimes,
} from "../../lib/sportMetrics";

const WEEK_TARGET = 5;
const STUDENT_THEME_STORAGE_KEY = "student-profile-theme";
const STUDENT_THEME_CHANGED_EVENT = "student-profile-theme-change";
const STUDENT_GOAL_STORAGE_KEY = "student-profile-goal";
const DEFAULT_STUDENT_GOAL: StudentGoal = {
  title: "本周主动加练",
  weeklyTarget: 5,
  focusCategoryId: "all",
};

type StudentTheme = "dark" | "light";
type StudentGoal = {
  title: string;
  weeklyTarget: number;
  focusCategoryId: string;
};

function getInitialStudentTheme(): StudentTheme {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(STUDENT_THEME_STORAGE_KEY) === "dark"
    ? "dark"
    : "light";
}

function getInitialStudentGoal(): StudentGoal {
  if (typeof window === "undefined") return DEFAULT_STUDENT_GOAL;

  try {
    const rawGoal = window.localStorage.getItem(STUDENT_GOAL_STORAGE_KEY);
    if (!rawGoal) return DEFAULT_STUDENT_GOAL;
    const parsedGoal = JSON.parse(rawGoal) as Partial<StudentGoal>;
    const weeklyTarget = Number(parsedGoal.weeklyTarget);

    return {
      title: parsedGoal.title?.trim() || DEFAULT_STUDENT_GOAL.title,
      weeklyTarget:
        Number.isFinite(weeklyTarget) && weeklyTarget > 0
          ? Math.min(30, Math.round(weeklyTarget))
          : DEFAULT_STUDENT_GOAL.weeklyTarget,
      focusCategoryId: parsedGoal.focusCategoryId || DEFAULT_STUDENT_GOAL.focusCategoryId,
    };
  } catch {
    return DEFAULT_STUDENT_GOAL;
  }
}

const studentThemeStyles = {
  dark: {
    page: "relative flex min-h-screen flex-col overflow-hidden bg-[#070b16] pb-24 text-white",
    headerBg: "border-b border-white/10 bg-[#07101f]/55 backdrop-blur-2xl",
    headerTitle: "text-white",
    headerIcon: "text-white active:bg-white/10",
    settingsButton: "border border-white/15 bg-white/10 text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl active:bg-white/15",
    card: "relative overflow-hidden rounded-[30px] border border-white/15 bg-white/[0.08] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-white/35",
    splitCard: "relative overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.08] p-4 shadow-[0_20px_55px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl",
    quietPanel: "rounded-[20px] border border-white/10 bg-white/[0.08] px-3 py-2 text-[13px] leading-5 text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl",
    mutedText: "text-white/55",
    softText: "text-white/65",
    faintText: "text-white/40",
    titleText: "text-white",
    input:
      "h-9 w-[116px] rounded-full border border-white/15 bg-white/10 pl-8 pr-2 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] outline-none backdrop-blur-xl",
    inputIcon: "text-white/60",
    actionButton:
      "flex flex-col items-center justify-center rounded-[22px] border border-lime-200/55 bg-lime-300/85 px-3 text-[#071006] shadow-[0_18px_36px_rgba(190,242,100,0.22),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl active:bg-lime-300",
    actionAccent: "text-cyan-200",
    divider: "divide-y divide-white/10",
    empty: "py-8 text-center text-[14px] text-white/35",
    listTitle: "truncate text-[14px] font-bold text-white",
    listMeta: "mt-1 text-[11px] text-white/40",
    bestValue: "shrink-0 text-right text-[16px] font-bold text-lime-300",
    recentValue: "text-[15px] font-bold text-sky-300",
    unitText: "ml-1 text-[11px] font-medium text-white/40",
  },
  light: {
    page: "relative flex min-h-screen flex-col overflow-hidden bg-[#eef5ff] pb-24 text-slate-950",
    headerBg: "border-b border-white/45 bg-white/40 backdrop-blur-2xl",
    headerTitle: "text-[#142033]",
    headerIcon: "text-slate-700 active:bg-white/45",
    settingsButton: "border border-white/60 bg-white/45 text-slate-700 shadow-[0_8px_22px_rgba(55,93,142,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl active:bg-white/65",
    card: "relative overflow-hidden rounded-[30px] border border-white/60 bg-white/45 p-4 shadow-[0_24px_70px_rgba(79,112,154,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-white/95",
    splitCard: "relative overflow-hidden rounded-[28px] border border-white/60 bg-white/45 p-4 shadow-[0_20px_55px_rgba(79,112,154,0.16),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl",
    quietPanel: "rounded-[20px] border border-white/55 bg-white/40 px-3 py-2 text-[13px] leading-5 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl",
    mutedText: "text-slate-500",
    softText: "text-slate-600",
    faintText: "text-slate-400",
    titleText: "text-gray-950",
    input:
      "h-9 w-[116px] rounded-full border border-white/70 bg-white/45 pl-8 pr-2 text-[12px] font-medium text-gray-900 shadow-[0_8px_22px_rgba(55,93,142,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] outline-none backdrop-blur-xl",
    inputIcon: "text-slate-400",
    actionButton:
      "flex flex-col items-center justify-center rounded-[22px] border border-white/50 bg-[#1677ff]/90 px-3 text-white shadow-[0_18px_38px_rgba(22,119,255,0.28),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl active:bg-[#1677ff]",
    actionAccent: "text-[#0b73ff]",
    divider: "divide-y divide-white/55",
    empty: "py-8 text-center text-[14px] text-gray-400",
    listTitle: "truncate text-[14px] font-bold text-gray-950",
    listMeta: "mt-1 text-[11px] text-gray-400",
    bestValue: "shrink-0 text-right text-[16px] font-bold text-[#1677ff]",
    recentValue: "text-[15px] font-bold text-[#1677ff]",
    unitText: "ml-1 text-[11px] font-medium text-gray-400",
  },
} as const;

type StudentThemeStyle = (typeof studentThemeStyles)[StudentTheme];

function getRecordTime(record: SportRecord) {
  return new Date(record.datetime).getTime();
}

function getWeekRange(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function isInRange(record: SportRecord, start: Date, end: Date) {
  const time = getRecordTime(record);
  return time >= start.getTime() && time < end.getTime();
}

function getDayKey(record: SportRecord) {
  return record.date || record.datetime.slice(0, 10);
}

function getAttemptTimes(records: SportRecord[]) {
  return records.reduce(
    (sum, record) =>
      sum + Math.max(1, record.totalTimes ?? (record.isPassed ? 1 : 0)),
    0,
  );
}

function getRecentDays(endDate: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - (count - index - 1));

    return {
      key: format(date, "yyyy-MM-dd"),
      label: format(date, "MM-dd"),
    };
  });
}

function getTrendEndDate(selectedMonth: string, fallbackDate: Date) {
  if (selectedMonth === format(fallbackDate, "yyyy-MM")) return fallbackDate;

  const [year, month] = selectedMonth.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return fallbackDate;

  return new Date(year, month, 0);
}

function getDurationMinutes(records: SportRecord[]) {
  return Math.round(
    records.reduce(
      (sum, record) => sum + Math.max(0, record.durationSeconds || 0) / 60,
      0,
    ),
  );
}

function getStreakLevel(days: number) {
  if (days >= 7) return { level: 5, title: "运动之星" };
  if (days >= 5) return { level: 4, title: "自律选手" };
  if (days >= 3) return { level: 3, title: "坚持达人" };
  if (days >= 2) return { level: 2, title: "活力学生" };
  return { level: 1, title: "运动萌新" };
}

function getStreakDays(records: SportRecord[], baseDate = new Date()) {
  const daySet = new Set(records.map(getDayKey));
  let streak = 0;
  const cursor = new Date(baseDate);

  while (true) {
    const key = format(cursor, "yyyy-MM-dd");
    if (!daySet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getProjectActionUrl(project?: Project) {
  if (!project) return "/checkin/select";
  return project.mode === "register"
    ? `/checkin/register/${project.id}`
    : `/checkin/face-scan/${project.id}`;
}

function isProjectAssignedToStudent(project: Project, student: Student) {
  return (
    (project.targetGrades.length === 0 || project.targetGrades.includes(student.grade)) &&
    (project.targetClasses.length === 0 ||
      project.targetClasses.includes(student.className) ||
      project.targetClasses.includes(getStudentLabel(student)))
  );
}

function getProjectPeriodLabel(project: Project) {
  if (project.limitPeriod === "weekly") return "本周";
  if (project.limitPeriod === "monthly") return "本月";
  return "当前目标";
}

function getTrendText(delta: number) {
  if (delta > 0) return `+${delta}次`;
  if (delta < 0) return `${delta}次`;
  return "持平";
}

function getPercentileText(rank: number | string, total: number) {
  if (typeof rank !== "number" || total <= 0) return "-";
  return `前${Math.max(1, Math.round((rank / total) * 100))}%`;
}

function formatDurationSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  if (safeSeconds < 60) return `${safeSeconds}秒`;

  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;
  return `${minutes}分${restSeconds.toString().padStart(2, "0")}秒`;
}

function getRecordPerformance(record: SportRecord, project?: Project) {
  const indicator = project?.indicators?.[0];

  if (project?.mode === "timer" && record.durationSeconds > 0) {
    return {
      value: formatDurationSeconds(record.durationSeconds),
      unit: "",
    };
  }

  return {
    value: `${record.achievedValue}`,
    unit: indicator?.unit || "",
  };
}

function isBetterRecordForProject(
  nextRecord: SportRecord,
  currentRecord: SportRecord | undefined,
  project?: Project,
) {
  if (!currentRecord) return true;

  if (project?.mode === "timer" && nextRecord.durationSeconds > 0) {
    const currentSeconds =
      currentRecord.durationSeconds > 0
        ? currentRecord.durationSeconds
        : Number.POSITIVE_INFINITY;

    if (nextRecord.durationSeconds !== currentSeconds) {
      return nextRecord.durationSeconds < currentSeconds;
    }

    if (nextRecord.achievedValue !== currentRecord.achievedValue) {
      return nextRecord.achievedValue > currentRecord.achievedValue;
    }

    return getRecordTime(nextRecord) > getRecordTime(currentRecord);
  }

  if (nextRecord.achievedValue !== currentRecord.achievedValue) {
    return nextRecord.achievedValue > currentRecord.achievedValue;
  }

  if (nextRecord.durationSeconds > 0 && currentRecord.durationSeconds > 0) {
    return nextRecord.durationSeconds < currentRecord.durationSeconds;
  }

  return getRecordTime(nextRecord) > getRecordTime(currentRecord);
}

export function StudentProfile() {
  const navigate = useNavigate();
  const { categories, projects, records, reducedPersonnel } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [studentTheme, setStudentThemeState] = useState<StudentTheme>(
    getInitialStudentTheme,
  );
  const [studentGoal, setStudentGoalState] = useState<StudentGoal>(
    getInitialStudentGoal,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = studentThemeStyles[studentTheme];

  const setStudentTheme = (nextTheme: StudentTheme) => {
    setStudentThemeState(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STUDENT_THEME_STORAGE_KEY, nextTheme);
      window.dispatchEvent(new Event(STUDENT_THEME_CHANGED_EVENT));
    }
  };

  const setStudentGoal = (nextGoal: StudentGoal) => {
    const normalizedGoal = {
      ...nextGoal,
      title: nextGoal.title,
      weeklyTarget: Math.max(1, Math.min(30, Math.round(nextGoal.weeklyTarget || 1))),
    };
    setStudentGoalState(normalizedGoal);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        STUDENT_GOAL_STORAGE_KEY,
        JSON.stringify(normalizedGoal),
      );
    }
  };

  // In the real login flow, this will come from the current student account.
  const student = DUMMY_STUDENTS[0];
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const currentWeek = getWeekRange(now);
  const previousWeek = getWeekRange(subWeeks(now, 1));
  const trendDays = getRecentDays(getTrendEndDate(selectedMonth, now), 12);

  const studentRecords = useMemo(
    () =>
      records
        .filter(
          (record) =>
            record.studentId === student.id &&
            !record.isInvalid &&
            record.datetime.startsWith(selectedMonth),
        )
        .slice()
        .sort((a, b) => getRecordTime(b) - getRecordTime(a)),
    [records, selectedMonth, student.id],
  );

  const allStudentRecords = useMemo(
    () =>
      records
        .filter((record) => record.studentId === student.id && !record.isInvalid)
        .slice()
        .sort((a, b) => getRecordTime(b) - getRecordTime(a)),
    [records, student.id],
  );

  const passedRecords = studentRecords.filter((record) => record.isPassed);
  const allPassedRecords = allStudentRecords.filter((record) => record.isPassed);
  const todayAllRecords = allStudentRecords.filter((record) => record.date === today);
  const todayRecords = allPassedRecords.filter((record) => record.date === today);
  const weekAllRecords = allStudentRecords.filter((record) =>
    isInRange(record, currentWeek.start, currentWeek.end),
  );
  const weekRecords = allPassedRecords.filter((record) =>
    isInRange(record, currentWeek.start, currentWeek.end),
  );
  const previousWeekRecords = allPassedRecords.filter((record) =>
    isInRange(record, previousWeek.start, previousWeek.end),
  );

  const monthTimes = getTotalTimes(passedRecords);
  const weekTimes = getTotalTimes(weekRecords);
  const recordTimes = getAttemptTimes(studentRecords);
  const weekAttemptTimes = getAttemptTimes(weekAllRecords);
  const monthlyRecordDays = new Set(studentRecords.map(getDayKey)).size;
  const previousWeekTimes = getTotalTimes(previousWeekRecords);
  const streakDays = getStreakDays(allPassedRecords, now);
  const streakLevel = getStreakLevel(streakDays);
  const dailyTrend = trendDays.map((day) => {
    const dayRecords = allStudentRecords.filter((record) => getDayKey(record) === day.key);
    const dayPassedRecords = allPassedRecords.filter(
      (record) => getDayKey(record) === day.key,
    );

    return {
      ...day,
      passedTimes: getTotalTimes(dayPassedRecords),
      recordTimes: getAttemptTimes(dayRecords),
      minutes: getDurationMinutes(dayRecords),
      hasPassedRecord: dayPassedRecords.length > 0,
    };
  });
  const passedTrendBars = dailyTrend.map((day) => day.passedTimes);
  const recordTrendBars = dailyTrend.map((day) => day.recordTimes);
  const durationTrendBars = dailyTrend.map((day) => day.minutes);
  const streakTrendBars = dailyTrend.map((day) => (day.hasPassedRecord ? 1 : 0));
  const participationPercent = Math.min(
    100,
    Math.round((weekAttemptTimes / WEEK_TARGET) * 100),
  );
  const weekLeft = Math.max(0, WEEK_TARGET - weekAttemptTimes);
  const weekDelta = weekTimes - previousWeekTimes;
  const projectCategoryMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project.categoryId])),
    [projects],
  );
  const goalWeekRecords =
    studentGoal.focusCategoryId === "all"
      ? weekAllRecords
      : weekAllRecords.filter(
          (record) => projectCategoryMap.get(record.projectId) === studentGoal.focusCategoryId,
        );
  const goalCompleted = getAttemptTimes(goalWeekRecords);
  const goalPercent = Math.min(
    100,
    Math.round((goalCompleted / studentGoal.weeklyTarget) * 100),
  );
  const goalLeft = Math.max(0, studentGoal.weeklyTarget - goalCompleted);
  const goalFocusName =
    studentGoal.focusCategoryId === "all"
      ? "全部运动"
      : categories.find((category) => category.id === studentGoal.focusCategoryId)?.name ||
        "全部运动";

  const totalMinutes = getDurationMinutes(studentRecords);

  const categoryProgress = categories.map((category) => {
    const categoryProjectIds = new Set(
      projects
        .filter((project) => project.categoryId === category.id)
        .map((project) => project.id),
    );
    const categoryRecords = passedRecords.filter((record) =>
      categoryProjectIds.has(record.projectId),
    );
    const reduction = reducedPersonnel.find((item) => item.studentId === student.id);
    const baseTarget =
      category.monthlyRules?.[selectedMonth] ?? category.targetCompletions;
    const reducedTarget = reduction?.reductions?.[category.id];
    const target =
      reducedTarget !== undefined ? Math.min(reducedTarget, baseTarget) : baseTarget;
    const completed = getTotalTimes(categoryRecords);
    const percent = target > 0 ? Math.round((completed / target) * 100) : 100;

    return {
      id: category.id,
      name: category.name,
      completed,
      target,
      left: Math.max(0, target - completed),
      percent,
    };
  });

  const assignedOpenProjects = projects.filter(
    (project) =>
      project.status === "open" && isProjectAssignedToStudent(project, student),
  );
  const projectProgress = assignedOpenProjects.map((project) => {
    const sourceRecords =
      project.limitPeriod === "weekly"
        ? weekRecords
        : project.limitPeriod === "monthly"
          ? passedRecords
          : allPassedRecords;
    const completed = getTotalTimes(
      sourceRecords.filter((record) => record.projectId === project.id),
    );
    const projectTarget = project.targetCompletionsPerPeriod || 0;
    const projectLeft =
      projectTarget > 0 ? Math.max(0, projectTarget - completed) : 0;
    const category = categoryProgress.find((item) => item.id === project.categoryId);
    const categoryLeft = category?.left || 0;
    const percent =
      projectTarget > 0
        ? Math.round((completed / projectTarget) * 100)
        : category?.percent || 100;

    return {
      project,
      category,
      completed,
      projectTarget,
      projectLeft,
      categoryLeft,
      percent,
      remaining: projectLeft > 0 ? projectLeft : categoryLeft,
    };
  });
  const incompleteProject = projectProgress
    .filter((item) => item.projectLeft > 0 || item.categoryLeft > 0)
    .sort(
      (a, b) =>
        (a.projectLeft > 0 ? 0 : 1) - (b.projectLeft > 0 ? 0 : 1) ||
        a.percent - b.percent ||
        b.remaining - a.remaining,
    )[0];
  const personalGoalProject =
    studentGoal.focusCategoryId === "all"
      ? assignedOpenProjects[0]
      : assignedOpenProjects.find(
          (project) => project.categoryId === studentGoal.focusCategoryId,
        );
  const nextRecommendation = incompleteProject
    ? {
        isComplete: false,
        project: incompleteProject.project,
        title: incompleteProject.project.name,
        helper:
          incompleteProject.projectLeft > 0
            ? `${getProjectPeriodLabel(incompleteProject.project)}还差 ${incompleteProject.projectLeft} 次`
            : `${incompleteProject.category?.name || "目标"} 还差 ${incompleteProject.categoryLeft} 次`,
      }
    : goalLeft > 0
      ? {
          isComplete: false,
          project: personalGoalProject,
          title: studentGoal.title.trim() || DEFAULT_STUDENT_GOAL.title,
          helper: `${goalFocusName} 还差 ${goalLeft} 次`,
        }
      : {
          isComplete: true,
          project: undefined,
          title: "恭喜已完成",
          helper: "本阶段目标都完成了",
        };
  const sortedAbility = [...categoryProgress].sort((a, b) => {
    const order = ["速度", "有氧", "力量", "灵敏"];
    const aIndex = order.findIndex((name) => a.name.includes(name));
    const bIndex = order.findIndex((name) => b.name.includes(name));
    return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
  });
  const abilityAxes = sortedAbility.filter((item) => item.target > 0);
  const abilityScoreSource = abilityAxes;
  const strongestAbility =
    [...abilityScoreSource].sort((a, b) => b.percent - a.percent)[0] ||
    abilityAxes[0];
  const weakestAbility =
    [...abilityScoreSource].sort((a, b) => a.percent - b.percent)[0] ||
    abilityAxes[0];
  const balanceScore =
    abilityScoreSource.length > 0
      ? Math.round(
          abilityScoreSource.reduce(
            (sum, item) => sum + Math.min(100, item.percent),
            0,
          ) / abilityScoreSource.length,
        )
      : 0;
  const abilityTitle =
    abilityAxes.length === 4 ? "四角能力图" : `${abilityAxes.length}项能力图`;
  const balanceHelper = `${abilityScoreSource.length || 0}项平均`;
  const monthlyTarget = categoryProgress.reduce((sum, item) => sum + item.target, 0);
  const standardPercent =
    monthlyTarget > 0 ? Math.min(100, Math.round((monthTimes / monthlyTarget) * 100)) : 100;
  const standardLeft = Math.max(0, monthlyTarget - monthTimes);
  const ringScore = Math.round(
    (participationPercent + standardPercent + goalPercent) / 3,
  );
  const ringMessage =
    weekLeft > 0
      ? `本周还差 ${weekLeft} 次，让参与度先闭环`
      : standardLeft > 0
        ? `本月还差 ${standardLeft} 次达标记录`
        : goalLeft > 0
          ? `个人目标还差 ${goalLeft} 次`
          : "三项都在好状态，可以挑战更好成绩";
  const activityRings = [
    {
      label: "学校要求",
      value: participationPercent,
      color: "#38bdf8",
      helper: `${weekAttemptTimes}/${WEEK_TARGET}次`,
    },
    {
      label: "月度达标",
      value: standardPercent,
      color: "#a3e635",
      helper: `${monthTimes}/${monthlyTarget}次`,
    },
    {
      label: "额外目标",
      value: goalPercent,
      color: "#fb7185",
      helper: `${goalCompleted}/${studentGoal.weeklyTarget}次`,
    },
  ];

  const bestByProject = allPassedRecords.reduce<{ [projectId: string]: SportRecord }>((bestByProject, record) => {
      const project = projects.find((item) => item.id === record.projectId);
      const current = bestByProject[record.projectId];
      if (isBetterRecordForProject(record, current, project)) {
        bestByProject[record.projectId] = record;
      }
      return bestByProject;
    }, {});
  const bestRecords = (Object.values(bestByProject) as SportRecord[])
    .sort((a, b) => getRecordTime(b) - getRecordTime(a))
    .slice(0, 3);
  const peerLeaderboard = useMemo(() => {
    const classStudents = DUMMY_STUDENTS.filter(
      (item) => item.grade === student.grade && item.className === student.className,
    );
    const monthRecords = records.filter(
      (record) => !record.isInvalid && record.datetime.startsWith(selectedMonth),
    );

    return classStudents
      .map((peer) => {
        const peerRecords = monthRecords.filter((record) => record.studentId === peer.id);
        const peerPassedRecords = peerRecords.filter((record) => record.isPassed);
        return {
          student: peer,
          completed: getTotalTimes(peerPassedRecords),
          recordTimes: getAttemptTimes(peerRecords),
          recordDays: new Set(peerRecords.map(getDayKey)).size,
          latestRecordTime:
            peerRecords.length > 0
              ? Math.max(...peerRecords.map((record) => getRecordTime(record)))
              : 0,
        };
      })
      .sort(
        (a, b) =>
          b.completed - a.completed ||
          b.recordTimes - a.recordTimes ||
          b.recordDays - a.recordDays ||
          b.latestRecordTime - a.latestRecordTime,
      )
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [records, selectedMonth, student.className, student.grade]);
  const myLeaderboardRank =
    peerLeaderboard.find((item) => item.student.id === student.id)?.rank || "-";
  const peerPositionText = getPercentileText(myLeaderboardRank, peerLeaderboard.length);
  const growthTrendText = getTrendText(weekDelta);
  const concernLevel =
    weekLeft === 0 && standardLeft === 0
      ? "状态良好"
      : weekLeft <= 1 && standardLeft <= 3
        ? "轻度提醒"
        : "需要关注";
  const availableCategoryIds = new Set(
    assignedOpenProjects.map((project) => project.categoryId),
  );
  const completedAvailableCategoryCount = categoryProgress.filter(
    (item) => availableCategoryIds.has(item.id) && item.completed > 0,
  ).length;
  const canEarnMultiSport = availableCategoryIds.size >= 2;
  const stableParticipationTargetDays = 3;
  const stableParticipationLeft = Math.max(
    0,
    stableParticipationTargetDays - monthlyRecordDays,
  );
  const thirdAchievement = canEarnMultiSport
    ? {
        title: "多项运动",
        desc:
          completedAvailableCategoryCount >= 2
            ? `已完成 ${completedAvailableCategoryCount} 类运动`
            : `再完成 ${2 - completedAvailableCategoryCount} 类`,
        active: completedAvailableCategoryCount >= 2,
        icon: <Sparkles className="h-4 w-4" />,
      }
    : {
        title: "稳定参与",
        desc:
          monthlyRecordDays >= stableParticipationTargetDays
            ? `本月记录 ${monthlyRecordDays} 天`
            : `还差 ${stableParticipationLeft} 天`,
        active: monthlyRecordDays >= stableParticipationTargetDays,
        icon: <CheckCircle2 className="h-4 w-4" />,
      };

  const achievements = [
    {
      title: streakDays >= 3 ? "连续运动" : "连续运动",
      desc: streakDays >= 3 ? `已连续 ${streakDays} 天` : "连续 3 天可点亮",
      active: streakDays >= 3,
      icon: <Flame className="h-4 w-4" />,
    },
    {
      title: "额外目标",
      desc: goalCompleted >= studentGoal.weeklyTarget ? "额外目标完成" : `还差 ${goalLeft} 次`,
      active: goalCompleted >= studentGoal.weeklyTarget,
      icon: <Target className="h-4 w-4" />,
    },
    thirdAchievement,
  ];
  const familyActions = [
    {
      title: weekLeft > 0 ? "今晚提醒一次运动" : "保持本周节奏",
      helper:
        weekLeft > 0
          ? `本周学校要求还差 ${weekLeft} 次，建议先安排 20-30 分钟。`
          : "本周要求已完成，可以安排一次轻松恢复运动。",
      icon: <BellRing className="h-4 w-4" />,
    },
    {
      title: weakestAbility?.left ? `补 ${weakestAbility.name}` : "巩固优势项目",
      helper: weakestAbility?.left
        ? `${weakestAbility.name}还差 ${weakestAbility.left} 次，适合拆成 2 次完成。`
        : `${strongestAbility?.name || "优势项目"}表现较好，保持低压力练习。`,
      icon: <Target className="h-4 w-4" />,
    },
    {
      title: "运动后看恢复",
      helper: totalMinutes > 120 ? "本月运动量不少，注意拉伸、补水和睡眠。" : "运动后关注是否疲劳，避免临睡前高强度训练。",
      icon: <HeartPulse className="h-4 w-4" />,
    },
  ];

  return (
    <div className={theme.page}>
      <LiquidGlassBackdrop theme={studentTheme} />
      <Header
        title="孩子运动"
        showBack={false}
        bg={theme.headerBg}
        titleClassName={theme.headerTitle}
        iconClassName={theme.headerIcon}
        rightNode={
          <button
            aria-label="打开学生设置"
            onClick={() => setSettingsOpen(true)}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${theme.settingsButton}`}
          >
            <Settings className="h-5 w-5" />
          </button>
        }
      />

      <div className="relative z-10 space-y-4 p-4">
        <section className={`${theme.card} isolate`}>
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-48 w-48 rounded-full bg-cyan-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 -z-10 h-40 w-40 rounded-full bg-rose-200/25 blur-3xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`text-[13px] ${theme.mutedText}`}>
                {getStudentLabel(student)} · 学号 {student.id}
              </div>
              <h1 className={`mt-2 text-[26px] font-bold leading-tight ${theme.titleText}`}>
                {student.name}本周体育情况
              </h1>
              <div className={`mt-2 flex items-center gap-2 text-[13px] ${theme.softText}`}>
                {weekLeft === 0 ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-lime-300" />
                    本周学校要求已完成，继续保持节奏
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 text-sky-300" />
                    本周还差 {weekLeft} 次，建议提前安排
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className={theme.input}
                />
                <Calendar className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${theme.inputIcon}`} />
              </div>
              <div
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  concernLevel === "状态良好"
                    ? studentTheme === "light"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-lime-300/10 text-lime-300"
                    : concernLevel === "轻度提醒"
                      ? "bg-orange-50 text-orange-600"
                      : "bg-rose-50 text-rose-500"
                }`}
              >
                {concernLevel}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <ParentKpiCard
              label="学校要求"
              value={`${weekAttemptTimes}/${WEEK_TARGET}次`}
              helper={weekLeft > 0 ? `还差 ${weekLeft} 次` : "已完成"}
              tone="blue"
              theme={studentTheme}
            />
            <ParentKpiCard
              label="成长趋势"
              value={growthTrendText}
              helper="较上周完成次数"
              tone={weekDelta >= 0 ? "green" : "orange"}
              theme={studentTheme}
            />
            <ParentKpiCard
              label="同班位置"
              value={peerPositionText}
              helper={`同班 ${peerLeaderboard.length} 人`}
              tone="pink"
              theme={studentTheme}
            />
          </div>

          <div className="mt-5 grid grid-cols-[128px_1fr] gap-4">
            <ActivityRings
              centerLabel="综合完成"
              centerValue={ringScore}
              theme={studentTheme}
              rings={activityRings}
            />
            <div className="flex flex-col justify-center gap-3">
              {activityRings.map((ring) => (
                <RingLegend key={ring.label} ring={ring} theme={studentTheme} />
              ))}
            </div>
          </div>

          <div className={`mt-4 ${theme.quietPanel}`}>
            {ringMessage}
          </div>
        </section>

        <ParentActionBlock
          familyActions={familyActions}
          nextRecommendation={nextRecommendation}
          onStartAction={() => {
            if (nextRecommendation.project) {
              navigate(getProjectActionUrl(nextRecommendation.project));
              return;
            }
            setSettingsOpen(true);
          }}
          reason={
            weakestAbility?.left
              ? `${weakestAbility.name}是当前短板，适合优先补齐。`
              : "本周要求接近完成，适合保持低压力运动。"
          }
          theme={studentTheme}
          themeStyles={theme}
        />

        <PersonalGoalBlock
          completed={goalCompleted}
          focusName={goalFocusName}
          left={goalLeft}
          onOpenSettings={() => setSettingsOpen(true)}
          percent={goalPercent}
          target={studentGoal.weeklyTarget}
          theme={studentTheme}
          themeStyles={theme}
          title={studentGoal.title.trim() || DEFAULT_STUDENT_GOAL.title}
        />

        <ParentWeeklySummaryBlock
          durationTrendBars={durationTrendBars}
          monthTimes={monthTimes}
          monthlyRecordDays={monthlyRecordDays}
          passedTrendBars={passedTrendBars}
          recordTimes={recordTimes}
          recordTrendBars={recordTrendBars}
          standardLeft={standardLeft}
          streakDays={streakDays}
          streakLevel={streakLevel}
          streakTrendBars={streakTrendBars}
          theme={studentTheme}
          themeStyles={theme}
          totalMinutes={totalMinutes}
          weekAttemptTimes={weekAttemptTimes}
          weekDelta={weekDelta}
          weekLeft={weekLeft}
          weeklyTarget={WEEK_TARGET}
        />

        <AbilityDevelopmentBlock
          axes={abilityAxes}
          balanceHelper={balanceHelper}
          balanceScore={balanceScore}
          selectedMonth={selectedMonth}
          strongestAbility={strongestAbility}
          theme={studentTheme}
          themeStyles={theme}
          weakestAbility={weakestAbility}
        />

        <ParentSportDetailsBlock
          achievements={achievements}
          bestRecords={bestRecords}
          categories={categories}
          currentStudentId={student.id}
          peerItems={peerLeaderboard}
          myRank={myLeaderboardRank}
          onViewAllRecords={() => navigate("/records")}
          projects={projects}
          recentRecords={studentRecords}
          theme={studentTheme}
          themeStyles={theme}
        />
      </div>
      <StudentSettingsSheet
        open={settingsOpen}
        categories={categories}
        goal={studentGoal}
        theme={studentTheme}
        onClose={() => setSettingsOpen(false)}
        onGoalChange={setStudentGoal}
        onThemeChange={setStudentTheme}
      />
    </div>
  );
}

type AbilityItem = {
  id: string;
  name: string;
  completed: number;
  target: number;
  left: number;
  percent: number;
};

type PeerLeaderboardItem = {
  student: Student;
  completed: number;
  recordTimes: number;
  recordDays: number;
  latestRecordTime: number;
  rank: number;
};

type FamilyActionItem = {
  title: string;
  helper: string;
  icon: ReactNode;
};

type AchievementItem = {
  title: string;
  desc: string;
  active: boolean;
  icon: ReactNode;
};

type NextRecommendation = {
  isComplete: boolean;
  project?: Project;
  title: string;
  helper: string;
};

type ParentDetailTab = "peer" | "highlights" | "best" | "recent";

function LiquidGlassBackdrop({ theme }: { theme: StudentTheme }) {
  const isLight = theme === "light";

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className={`absolute -top-28 left-[-72px] h-72 w-72 rounded-full blur-3xl ${
          isLight ? "bg-sky-300/35" : "bg-cyan-400/15"
        }`}
      />
      <div
        className={`absolute right-[-96px] top-24 h-80 w-80 rounded-full blur-3xl ${
          isLight ? "bg-rose-200/45" : "bg-fuchsia-500/15"
        }`}
      />
      <div
        className={`absolute bottom-10 left-16 h-72 w-72 rounded-full blur-3xl ${
          isLight ? "bg-emerald-200/40" : "bg-blue-500/10"
        }`}
      />
      <div
        className={`absolute inset-0 ${
          isLight
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.50),rgba(255,255,255,0.20)_46%,rgba(235,244,255,0.56))]"
            : "bg-[linear-gradient(180deg,rgba(7,16,31,0.62),rgba(7,11,22,0.30)_48%,rgba(7,11,22,0.82))]"
        }`}
      />
    </div>
  );
}

function ParentKpiCard({
  label,
  value,
  helper,
  tone,
  theme,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "orange" | "pink";
  theme: StudentTheme;
}) {
  const isLight = theme === "light";
  const toneClass = isLight
    ? {
        blue: "border-sky-200/55 bg-sky-100/40 text-[#0b73ff]",
        green: "border-emerald-200/55 bg-emerald-100/40 text-emerald-600",
        orange: "border-orange-200/55 bg-orange-100/40 text-orange-600",
        pink: "border-rose-200/55 bg-rose-100/40 text-rose-500",
      }[tone]
    : {
        blue: "border-sky-200/15 bg-sky-300/10 text-sky-300",
        green: "border-lime-200/15 bg-lime-300/10 text-lime-300",
        orange: "border-orange-200/15 bg-orange-300/10 text-orange-300",
        pink: "border-rose-200/15 bg-rose-300/10 text-rose-300",
      }[tone];

  return (
    <div className={`min-w-0 rounded-[22px] border px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl ${toneClass}`}>
      <div className="truncate text-[11px] font-bold opacity-75">{label}</div>
      <div className="mt-2 truncate text-[20px] font-black leading-none">{value}</div>
      <div className="mt-1 truncate text-[10px] font-medium opacity-70">{helper}</div>
    </div>
  );
}

function FamilyActionCard({
  icon,
  title,
  helper,
  theme,
}: {
  key?: string | number;
  icon: ReactNode;
  title: string;
  helper: string;
  theme: StudentTheme;
}) {
  const isLight = theme === "light";

  return (
    <div
      className={`grid grid-cols-[38px_1fr] gap-3 rounded-[22px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] backdrop-blur-xl ${
        isLight ? "border-white/60 bg-white/35" : "border-white/10 bg-white/[0.06]"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
          isLight ? "border-white/65 bg-white/55 text-[#1677ff]" : "border-white/10 bg-white/10 text-cyan-200"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className={`text-[14px] font-bold ${isLight ? "text-gray-950" : "text-white"}`}>
          {title}
        </div>
        <div className={`mt-1 text-[12px] leading-5 ${isLight ? "text-slate-500" : "text-white/55"}`}>
          {helper}
        </div>
      </div>
    </div>
  );
}

function ParentActionBlock({
  familyActions,
  nextRecommendation,
  onStartAction,
  reason,
  theme,
  themeStyles,
}: {
  familyActions: FamilyActionItem[];
  nextRecommendation: NextRecommendation;
  onStartAction: () => void;
  reason: string;
  theme: StudentTheme;
  themeStyles: StudentThemeStyle;
}) {
  const isLight = theme === "light";

  return (
    <section id="parent-actions" className={themeStyles.card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle
            icon={<BellRing className="h-4 w-4" />}
            title="家长今晚怎么帮"
            theme={theme}
          />
          <div className={`mt-2 text-[12px] ${themeStyles.faintText}`}>
            先给一个明确建议，后面再看详细数据
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
            nextRecommendation.isComplete
              ? isLight
                ? "border border-emerald-200/55 bg-emerald-100/40 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
                : "border border-lime-200/15 bg-lime-300/10 text-lime-300 backdrop-blur-xl"
              : isLight
                ? "border border-orange-200/55 bg-orange-100/40 text-orange-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
                : "border border-orange-200/15 bg-orange-300/10 text-orange-300 backdrop-blur-xl"
          }`}
        >
          {nextRecommendation.isComplete ? "放心保持" : "优先做这件事"}
        </span>
      </div>

      <div
        className={`relative mt-4 overflow-hidden rounded-[26px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl ${
          isLight
            ? "border-white/60 bg-white/40"
            : "border-white/10 bg-white/[0.07]"
        }`}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-300/25 blur-2xl" />
        <div className={`text-[12px] font-bold ${themeStyles.mutedText}`}>
          下一步建议
        </div>
        <div className={`mt-2 text-[22px] font-black leading-7 ${themeStyles.titleText}`}>
          {nextRecommendation.title}
        </div>
        <div className={`mt-2 text-[13px] leading-5 ${themeStyles.softText}`}>
          {nextRecommendation.helper}
        </div>
        <div className={`mt-3 rounded-2xl px-3 py-2 text-[12px] leading-5 ${
          isLight ? "border border-white/55 bg-white/40 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl" : "border border-white/10 bg-white/[0.06] text-white/65 backdrop-blur-xl"
        }`}>
          推荐原因：{reason}
        </div>
        <button
          disabled={nextRecommendation.isComplete}
          onClick={onStartAction}
          className={`mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold transition-colors ${
            nextRecommendation.isComplete
              ? isLight
                ? "border border-emerald-200/55 bg-emerald-100/45 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                : "border border-lime-200/15 bg-lime-300/10 text-lime-300"
              : isLight
                ? "border border-white/50 bg-[#1677ff]/90 text-white shadow-[0_18px_38px_rgba(22,119,255,0.28),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl active:bg-[#1677ff]"
                : "border border-lime-200/55 bg-lime-300/85 text-[#071006] shadow-[0_18px_36px_rgba(190,242,100,0.22),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl active:bg-lime-300"
          }`}
        >
          {nextRecommendation.isComplete ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {nextRecommendation.isComplete
            ? "已完成"
            : nextRecommendation.project
              ? "去完成"
              : "制定目标"}
        </button>
      </div>

      <div className="mt-3 grid gap-2">
        {familyActions.slice(0, 3).map((item) => (
          <FamilyActionCard
            key={item.title}
            icon={item.icon}
            title={item.title}
            helper={item.helper}
            theme={theme}
          />
        ))}
      </div>
    </section>
  );
}

function ParentWeeklySummaryBlock({
  durationTrendBars,
  monthTimes,
  monthlyRecordDays,
  passedTrendBars,
  recordTimes,
  recordTrendBars,
  standardLeft,
  streakDays,
  streakLevel,
  streakTrendBars,
  theme,
  themeStyles,
  totalMinutes,
  weekAttemptTimes,
  weekDelta,
  weekLeft,
  weeklyTarget,
}: {
  durationTrendBars: number[];
  monthTimes: number;
  monthlyRecordDays: number;
  passedTrendBars: number[];
  recordTimes: number;
  recordTrendBars: number[];
  standardLeft: number;
  streakDays: number;
  streakLevel: { level: number; title: string };
  streakTrendBars: number[];
  theme: StudentTheme;
  themeStyles: StudentThemeStyle;
  totalMinutes: number;
  weekAttemptTimes: number;
  weekDelta: number;
  weekLeft: number;
  weeklyTarget: number;
}) {
  const isLight = theme === "light";
  const [showDetails, setShowDetails] = useState(false);
  const summaryText =
    weekLeft > 0
      ? `本周还差 ${weekLeft} 次学校要求，建议提前安排一次轻松运动。`
      : "本周学校要求已完成，接下来以保持节奏和恢复为主。";

  return (
    <section className={themeStyles.card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle
            icon={<Footprints className="h-4 w-4" />}
            title="本周情况总结"
            theme={theme}
          />
          <div className={`mt-2 text-[12px] ${themeStyles.faintText}`}>
            先看结论，需要时再展开趋势
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
            weekLeft > 0
              ? isLight
                ? "border border-orange-200/55 bg-orange-100/40 text-orange-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
                : "border border-orange-200/15 bg-orange-300/10 text-orange-300 backdrop-blur-xl"
              : isLight
                ? "border border-emerald-200/55 bg-emerald-100/40 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
                : "border border-lime-200/15 bg-lime-300/10 text-lime-300 backdrop-blur-xl"
          }`}
        >
          {weekLeft > 0 ? "待补齐" : "已达标"}
        </span>
      </div>

      <div className={`mt-4 rounded-[22px] px-4 py-3 text-[15px] font-bold leading-6 ${
        isLight
          ? "border border-white/60 bg-white/40 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] backdrop-blur-xl"
          : "border border-white/10 bg-white/[0.06] text-white/75 backdrop-blur-xl"
      }`}>
        {summaryText}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <ParentSummaryTile
          helper={weekLeft > 0 ? `还差 ${weekLeft} 次` : "已完成"}
          label="学校要求"
          theme={theme}
          tone={weekLeft > 0 ? "orange" : "green"}
          value={`${weekAttemptTimes}/${weeklyTarget}`}
        />
        <ParentSummaryTile
          helper={standardLeft > 0 ? `月度还差 ${standardLeft} 次` : "月度达标"}
          label="本月达标"
          theme={theme}
          tone={standardLeft > 0 ? "blue" : "green"}
          value={`${monthTimes}次`}
        />
        <ParentSummaryTile
          helper={`Lv.${streakLevel.level}`}
          label="连续运动"
          theme={theme}
          tone="pink"
          value={`${streakDays}天`}
        />
      </div>

      <button
        onClick={() => setShowDetails((value) => !value)}
        className={`mt-4 flex w-full items-center justify-center gap-1 rounded-full py-2 text-[13px] font-bold ${
          isLight
            ? "border border-white/60 bg-white/40 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl active:bg-white/55"
            : "border border-white/10 bg-white/[0.06] text-cyan-200 backdrop-blur-xl active:bg-white/[0.1]"
        }`}
      >
        {showDetails ? "收起趋势数据" : "查看趋势数据"}
        <ChevronRight className={`h-4 w-4 transition-transform ${showDetails ? "rotate-90" : ""}`} />
      </button>

      {showDetails && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <GrowthCard
            label="本月达标"
            value={`${monthTimes}`}
            helper={`还差 ${standardLeft} 次`}
            bars={passedTrendBars}
            tone={weekDelta >= 0 ? "green" : "orange"}
            theme={theme}
          />
          <GrowthCard
            label="运动记录"
            value={`${recordTimes}`}
            helper={`${monthlyRecordDays} 天有记录`}
            bars={recordTrendBars}
            tone="pink"
            theme={theme}
          />
          <GrowthCard
            label="运动时长"
            value={`${totalMinutes}`}
            helper="本月分钟"
            bars={durationTrendBars}
            tone="purple"
            theme={theme}
          />
          <GrowthCard
            label="连续运动"
            value={`${streakDays}`}
            helper={`Lv.${streakLevel.level} ${streakLevel.title}`}
            bars={streakTrendBars}
            binaryBars
            tone="green"
            theme={theme}
          />
        </div>
      )}
    </section>
  );
}

function ParentSummaryTile({
  helper,
  label,
  theme,
  tone,
  value,
}: {
  helper: string;
  label: string;
  theme: StudentTheme;
  tone: "blue" | "green" | "orange" | "pink";
  value: string;
}) {
  const isLight = theme === "light";
  const toneClass = isLight
    ? {
        blue: "border-sky-200/55 bg-sky-100/40 text-[#0b73ff]",
        green: "border-emerald-200/55 bg-emerald-100/40 text-emerald-600",
        orange: "border-orange-200/55 bg-orange-100/40 text-orange-600",
        pink: "border-rose-200/55 bg-rose-100/40 text-rose-500",
      }[tone]
    : {
        blue: "border-sky-200/15 bg-sky-300/10 text-sky-300",
        green: "border-lime-200/15 bg-lime-300/10 text-lime-300",
        orange: "border-orange-200/15 bg-orange-300/10 text-orange-300",
        pink: "border-rose-200/15 bg-rose-300/10 text-rose-300",
      }[tone];

  return (
    <div className={`min-w-0 rounded-[22px] border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl ${toneClass}`}>
      <div className="truncate text-[11px] font-bold opacity-75">{label}</div>
      <div className="mt-2 truncate text-[20px] font-black leading-none">{value}</div>
      <div className="mt-2 truncate text-[10px] font-semibold opacity-70">{helper}</div>
    </div>
  );
}

function ParentSportDetailsBlock({
  achievements,
  bestRecords,
  categories,
  currentStudentId,
  myRank,
  onViewAllRecords,
  peerItems,
  projects,
  recentRecords,
  theme,
  themeStyles,
}: {
  achievements: AchievementItem[];
  bestRecords: SportRecord[];
  categories: Category[];
  currentStudentId: string;
  myRank: number | string;
  onViewAllRecords: () => void;
  peerItems: PeerLeaderboardItem[];
  projects: Project[];
  recentRecords: SportRecord[];
  theme: StudentTheme;
  themeStyles: StudentThemeStyle;
}) {
  const isLight = theme === "light";
  const [activeTab, setActiveTab] = useState<ParentDetailTab>("peer");
  const [showAllPeers, setShowAllPeers] = useState(false);
  const visiblePeerItems = showAllPeers
    ? peerItems
    : getNearbyLeaderboardItems(peerItems, currentStudentId, 3);
  const tabs: Array<{ id: ParentDetailTab; label: string }> = [
    { id: "peer", label: "同伴" },
    { id: "highlights", label: "亮点" },
    { id: "best", label: "成绩" },
    { id: "recent", label: "记录" },
  ];

  const renderRecordRows = (
    recordsToRender: SportRecord[],
    emptyText: string,
    limit: number,
    mode: "best" | "recent",
  ) => {
    if (recordsToRender.length === 0) {
      return <div className={themeStyles.empty}>{emptyText}</div>;
    }

    return recordsToRender.slice(0, limit).map((record) => {
      const project = projects.find((item) => item.id === record.projectId);
      const performance = getRecordPerformance(record, project);

      return (
        <div key={record.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <div className={themeStyles.listTitle}>
              {project?.name || record.projectId}
            </div>
            <div className={themeStyles.listMeta}>
              {mode === "best" ? (
                <>
                  {project ? getCategoryName(project, categories) : "运动项目"} ·{" "}
                  {format(new Date(record.datetime), "MM-dd")}
                </>
              ) : (
                <>
                  {format(new Date(record.datetime), "MM-dd HH:mm")} ·{" "}
                  {record.isPassed ? "完成" : "未达标"}
                </>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={mode === "best" ? themeStyles.bestValue : themeStyles.recentValue}>
              {performance.value}
              <span className={themeStyles.unitText}>{performance.unit}</span>
            </div>
            {mode === "recent" && (
              <div className={`mt-1 text-[10px] ${themeStyles.faintText}`}>
                +{record.totalTimes || (record.isPassed ? 1 : 0)}次
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <section className={themeStyles.card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle
            icon={<Trophy className="h-4 w-4" />}
            title="运动详情"
            theme={theme}
          />
          <div className={`mt-2 text-[12px] ${themeStyles.faintText}`}>
            需要细看时，再切换查看
          </div>
        </div>
        {activeTab === "recent" && (
          <button
            onClick={onViewAllRecords}
            className={`flex items-center gap-1 text-[13px] font-bold ${themeStyles.actionAccent}`}
          >
            全部
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        className={`mt-4 grid grid-cols-4 gap-1 rounded-full border p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl ${
          isLight ? "border-white/60 bg-white/35" : "border-white/10 bg-white/[0.06]"
        }`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`h-9 rounded-full text-[12px] font-bold transition-colors ${
                isActive
                  ? isLight
                    ? "bg-white/70 text-[#1677ff] shadow-[0_8px_20px_rgba(55,93,142,0.12),inset_0_1px_0_rgba(255,255,255,0.85)]"
                    : "bg-white/15 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                  : isLight
                    ? "text-slate-500"
                    : "text-white/55"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "peer" && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className={`text-[12px] ${themeStyles.faintText}`}>
              同班位置
              <span className={`ml-2 text-[18px] font-black ${themeStyles.actionAccent}`}>
                #{myRank}
              </span>
            </div>
            {peerItems.length > 0 && (
              <button
                onClick={() => setShowAllPeers((value) => !value)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                  isLight
                    ? "border border-white/60 bg-white/40 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl active:bg-white/60"
                    : "border border-white/10 bg-white/10 text-cyan-200 backdrop-blur-xl active:bg-white/15"
                }`}
              >
                {showAllPeers ? "看附近" : "看全部"}
              </button>
            )}
          </div>
          <div className={themeStyles.divider}>
            {visiblePeerItems.map((item) => {
              const isCurrent = item.student.id === currentStudentId;
              return (
                <div
                  key={item.student.id}
                  className={`flex items-center gap-3 py-3 ${
                    isCurrent
                      ? isLight
                        ? "rounded-2xl border border-white/60 bg-white/40 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl"
                        : "rounded-2xl border border-white/10 bg-white/[0.07] px-2 backdrop-blur-xl"
                      : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                      item.rank === 1
                        ? "bg-amber-300 text-amber-950"
                        : isLight
                          ? "bg-gray-100 text-gray-700"
                          : "bg-white/10 text-white/70"
                    }`}
                  >
                    {item.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={themeStyles.listTitle}>{item.student.name}</span>
                      {isCurrent && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isLight ? "bg-white/70 text-[#1677ff]" : "bg-white/15 text-cyan-100"
                          }`}
                        >
                          我
                        </span>
                      )}
                    </div>
                    <div className={themeStyles.listMeta}>
                      {getStudentLabel(item.student)} · {item.recordDays} 天有记录
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={themeStyles.bestValue}>
                      {item.completed}
                      <span className={themeStyles.unitText}>次</span>
                    </div>
                    <div className={`mt-1 text-[10px] ${themeStyles.faintText}`}>
                      记录 {item.recordTimes} 条
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "highlights" && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {achievements.map((item) => (
            <AchievementBadge key={item.title} item={item} theme={theme} />
          ))}
        </div>
      )}

      {activeTab === "best" && (
        <div className={`mt-3 ${themeStyles.divider}`}>
          {renderRecordRows(bestRecords, "完成一次运动后会生成最好成绩", 3, "best")}
        </div>
      )}

      {activeTab === "recent" && (
        <div className={`mt-3 ${themeStyles.divider}`}>
          {renderRecordRows(recentRecords, "当前月份暂无记录", 5, "recent")}
        </div>
      )}
    </section>
  );
}

function AbilityDevelopmentBlock({
  axes,
  balanceHelper,
  balanceScore,
  selectedMonth,
  strongestAbility,
  theme,
  themeStyles,
  weakestAbility,
}: {
  axes: AbilityItem[];
  balanceHelper: string;
  balanceScore: number;
  selectedMonth: string;
  strongestAbility?: AbilityItem;
  theme: StudentTheme;
  themeStyles: StudentThemeStyle;
  weakestAbility?: AbilityItem;
}) {
  const isLight = theme === "light";
  const [showRadar, setShowRadar] = useState(false);
  const strongestPercent = Math.min(100, strongestAbility?.percent || 0);
  const weakestLeft = weakestAbility?.left || 0;
  const statusText = weakestLeft > 0 ? "轻度提醒" : "状态良好";
  const summaryText =
    strongestAbility && weakestAbility
      ? `${strongestAbility.name}表现较好，${weakestAbility.name}${weakestLeft > 0 ? "需要优先补齐" : "保持稳定"}`
      : "完成更多运动后会生成能力发展判断";
  const statusClass =
    weakestLeft > 0
      ? isLight
        ? "bg-orange-50 text-orange-600"
        : "bg-orange-300/10 text-orange-300"
      : isLight
        ? "bg-emerald-50 text-emerald-600"
        : "bg-lime-300/10 text-lime-300";

  return (
    <section className={themeStyles.card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle
            icon={<ShieldCheck className="h-4 w-4" />}
            title="能力发展"
            theme={theme}
          />
          <div className={`mt-2 text-[12px] ${themeStyles.faintText}`}>
            看孩子的优势、重点提升方向和整体均衡度
          </div>
        </div>
        <div
          className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
            isLight
              ? "border border-white/60 bg-white/40 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
              : "border border-white/10 bg-white/10 text-cyan-200 backdrop-blur-xl"
          }`}
        >
          {Number(selectedMonth.slice(5))}月
        </div>
      </div>

      <div className={`mt-5 rounded-[24px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl ${isLight ? "border-white/60 bg-white/40" : "border-white/10 bg-white/[0.06]"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-[12px] font-bold ${themeStyles.mutedText}`}>
              综合判断
            </div>
            <div className={`mt-2 text-[18px] font-black leading-6 ${themeStyles.titleText}`}>
              {summaryText}
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-2 text-[12px] font-bold ${statusClass}`}>
            {statusText}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <AbilityResultCard
          label="优势"
          value={strongestAbility?.name || "-"}
          helper={`完成 ${strongestPercent}%`}
          tone="green"
          theme={theme}
        />
        <AbilityResultCard
          label="重点提升"
          value={weakestAbility?.name || "-"}
          helper={weakestLeft > 0 ? `还差 ${weakestLeft} 次` : "继续保持"}
          tone="orange"
          theme={theme}
        />
        <AbilityResultCard
          label="均衡度"
          value={`${balanceScore}%`}
          helper={balanceHelper}
          tone="blue"
          theme={theme}
        />
      </div>

      <button
        onClick={() => setShowRadar((value) => !value)}
        className={`mt-4 flex w-full items-center justify-center gap-1 rounded-full py-2 text-[13px] font-bold ${
          isLight
            ? "border border-white/60 bg-white/40 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl active:bg-white/55"
            : "border border-white/10 bg-white/[0.06] text-cyan-200 backdrop-blur-xl active:bg-white/[0.1]"
        }`}
      >
        {showRadar ? "收起能力图" : "查看能力图"}
        <ChevronRight className={`h-4 w-4 transition-transform ${showRadar ? "rotate-90" : ""}`} />
      </button>

      {showRadar && (
        <div className={`mt-4 rounded-[26px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl ${isLight ? "border-white/60 bg-white/35" : "border-white/10 bg-white/[0.06]"}`}>
          <AbilityRadar axes={axes} theme={theme} />
        </div>
      )}
    </section>
  );
}

function AbilityResultCard({
  label,
  value,
  helper,
  tone,
  theme,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "green" | "orange" | "blue";
  theme: StudentTheme;
}) {
  const isLight = theme === "light";
  const toneClass = isLight
    ? {
        green: "border-emerald-200/55 bg-emerald-100/40 text-emerald-600",
        orange: "border-orange-200/55 bg-orange-100/40 text-orange-600",
        blue: "border-sky-200/55 bg-sky-100/40 text-[#0b73ff]",
      }[tone]
    : {
        green: "border-lime-200/15 bg-lime-300/10 text-lime-300",
        orange: "border-orange-200/15 bg-orange-300/10 text-orange-300",
        blue: "border-sky-200/15 bg-sky-300/10 text-sky-300",
      }[tone];

  return (
    <div className={`min-w-0 rounded-[22px] border px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl ${toneClass}`}>
      <div className="truncate text-[11px] font-bold opacity-80">{label}</div>
      <div className="mt-2 truncate text-[19px] font-black leading-none">{value}</div>
      <div className="mt-2 truncate text-[11px] font-semibold opacity-75">{helper}</div>
    </div>
  );
}

function PersonalGoalBlock({
  completed,
  focusName,
  left,
  onOpenSettings,
  percent,
  target,
  theme,
  themeStyles,
  title,
}: {
  completed: number;
  focusName: string;
  left: number;
  onOpenSettings: () => void;
  percent: number;
  target: number;
  theme: StudentTheme;
  themeStyles: StudentThemeStyle;
  title: string;
}) {
  const isLight = theme === "light";

  return (
    <section className={themeStyles.card}>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle
          icon={<Target className="h-4 w-4" />}
          title="额外目标"
          theme={theme}
        />
        <button
          onClick={onOpenSettings}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${
            isLight
              ? "border border-white/60 bg-white/40 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
              : "border border-white/10 bg-white/10 text-cyan-200 backdrop-blur-xl"
          }`}
        >
          制定目标
        </button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className={`truncate text-[20px] font-bold ${themeStyles.titleText}`}>
            {title}
          </div>
          <div className={`mt-1 text-[12px] ${themeStyles.faintText}`}>
            {focusName} · 本周 {completed}/{target} 次
          </div>
        </div>
        <div className={`shrink-0 text-[30px] font-bold leading-none ${themeStyles.actionAccent}`}>
          {percent}%
        </div>
      </div>

      <div className={`mt-4 h-3 overflow-hidden rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${
        isLight ? "border-white/55 bg-white/35" : "border-white/10 bg-white/10"
      }`}>
        <div
          className={`h-full rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] ${isLight ? "bg-[#1677ff]/90" : "bg-cyan-200/85"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className={`mt-3 ${themeStyles.quietPanel}`}>
        {left > 0 ? `还差 ${left} 次完成额外目标` : "额外目标已经完成，注意恢复和睡眠"}
      </div>
    </section>
  );
}

function PeerLeaderboardSection({
  currentStudentId,
  items,
  myRank,
  theme,
  themeStyles,
}: {
  currentStudentId: string;
  items: PeerLeaderboardItem[];
  myRank: number | string;
  theme: StudentTheme;
  themeStyles: StudentThemeStyle;
}) {
  const isLight = theme === "light";
  const [showAll, setShowAll] = useState(false);
  const previewItems = getNearbyLeaderboardItems(items, currentStudentId, 5);
  const visibleItems = showAll ? items : previewItems;
  const canToggleAll = items.length > 0;

  return (
    <section className={themeStyles.card}>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle
          icon={<Users className="h-4 w-4" />}
          title="同伴对比"
          theme={theme}
        />
        <div className="flex shrink-0 items-start gap-2">
          {canToggleAll && (
            <button
              data-testid="peer-leaderboard-toggle"
              onClick={() => setShowAll((value) => !value)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                isLight
                  ? "bg-blue-50 text-[#1677ff] active:bg-blue-100"
                  : "bg-white/10 text-lime-300 active:bg-white/15"
              }`}
            >
              {showAll ? "附近" : "全部"}
            </button>
          )}
          <div className={`text-right text-[12px] ${themeStyles.faintText}`}>
            同班位置
            <div className={`mt-0.5 text-[18px] font-bold leading-none ${themeStyles.actionAccent}`}>
              #{myRank}
            </div>
          </div>
        </div>
      </div>

      <div className={`mt-3 ${themeStyles.divider}`}>
        {visibleItems.map((item) => {
          const isCurrent = item.student.id === currentStudentId;
          return (
            <div
              key={item.student.id}
              className={`flex items-center gap-3 py-3 ${
                isCurrent
                  ? isLight
                    ? "rounded-2xl bg-blue-50 px-2"
                    : "rounded-2xl bg-lime-300/10 px-2"
                  : ""
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  item.rank === 1
                    ? "bg-amber-300 text-amber-950"
                    : isLight
                      ? "bg-gray-100 text-gray-700"
                      : "bg-white/10 text-white/70"
                }`}
              >
                {item.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={themeStyles.listTitle}>
                    {item.student.name}
                  </span>
                  {isCurrent && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isLight ? "bg-white text-[#1677ff]" : "bg-lime-300 text-[#071006]"
                      }`}
                    >
                      我
                    </span>
                  )}
                </div>
                <div className={themeStyles.listMeta}>
                  {getStudentLabel(item.student)} · {item.recordDays} 天有记录
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={themeStyles.bestValue}>
                  {item.completed}
                  <span className={themeStyles.unitText}>次</span>
                </div>
                <div className={`mt-1 text-[10px] ${themeStyles.faintText}`}>
                  记录 {item.recordTimes} 条
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getNearbyLeaderboardItems(
  items: PeerLeaderboardItem[],
  currentStudentId: string,
  size: number,
) {
  if (items.length <= size) return items;

  const currentIndex = items.findIndex((item) => item.student.id === currentStudentId);
  if (currentIndex < 0) return items.slice(0, size);

  const beforeCount = Math.floor((size - 1) / 2);
  const afterCount = size - 1 - beforeCount;
  const start = Math.max(0, Math.min(currentIndex - beforeCount, items.length - size));
  const end = Math.min(items.length, start + beforeCount + afterCount + 1);

  return items.slice(start, end);
}

function ActivityRings({
  centerLabel,
  centerValue,
  theme,
  rings,
}: {
  centerLabel: string;
  centerValue: number;
  theme: StudentTheme;
  rings: Array<{
    label: string;
    value: number;
    color: string;
    helper: string;
  }>;
}) {
  const radii = [50, 39, 28];
  const stroke = 8;
  const isLight = theme === "light";

  return (
    <div className="relative h-[126px] w-[126px] shrink-0">
      <svg viewBox="0 0 126 126" className="h-full w-full">
        {rings.map((ring, index) => {
          const radius = radii[index] || 20;
          const circumference = 2 * Math.PI * radius;
          const progress = Math.max(0, Math.min(100, ring.value));
          const offset = circumference - (progress / 100) * circumference;

          return (
            <g key={ring.label} transform="rotate(-90 63 63)">
              <circle
                cx="63"
                cy="63"
                r={radius}
                fill="none"
                stroke={isLight ? "#e5e7eb" : "rgba(255,255,255,0.16)"}
                strokeWidth={stroke}
              />
              <circle
                cx="63"
                cy="63"
                r={radius}
                fill="none"
                stroke={ring.color}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                strokeWidth={stroke}
              />
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-[22px] font-bold leading-none ${isLight ? "text-gray-950" : "text-white"}`}>
          {centerValue}%
        </div>
        <div className={`mt-1 text-[10px] ${isLight ? "text-gray-500" : "text-white/55"}`}>
          {centerLabel}
        </div>
      </div>
    </div>
  );
}

function RingLegend({
  ring,
  theme,
}: {
  key?: string | number;
  theme: StudentTheme;
  ring: {
    label: string;
    value: number;
    color: string;
    helper: string;
  };
}) {
  const isLight = theme === "light";

  return (
    <div className="text-[12px]">
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: ring.color }}
          />
          <span className="font-medium">{ring.label}</span>
        </div>
        <span className="shrink-0 text-[18px] font-bold" style={{ color: ring.color }}>
          {ring.value}%
        </span>
      </div>
      <div className={`mt-0.5 pl-4 text-[11px] ${isLight ? "text-gray-400" : "text-white/40"}`}>
        {ring.helper}
      </div>
    </div>
  );
}

function AbilityRadar({ axes, theme }: { axes: AbilityItem[]; theme: StudentTheme }) {
  const normalizedAxes = axes;
  const isLight = theme === "light";
  const viewSize = 224;
  const center = viewSize / 2;
  const radius = 74;
  const labelRadius = 92;
  const axisCount = normalizedAxes.length;
  const getPoint = (index: number, scale = 1, baseRadius = radius) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / axisCount;
    return {
      x: center + Math.cos(angle) * baseRadius * scale,
      y: center + Math.sin(angle) * baseRadius * scale,
    };
  };
  const axisPoints = normalizedAxes.map((_, index) => getPoint(index));
  const valuePoints = normalizedAxes.map((axis, index) => {
    const p = Math.max(0, Math.min(1, axis.percent / 100));
    const target = axisPoints[index];
    return {
      x: center + (target.x - center) * p,
      y: center + (target.y - center) * p,
    };
  });
  const polygon = valuePoints.map((point) => `${point.x},${point.y}`).join(" ");

  if (normalizedAxes.length === 0) {
    return (
      <div
        className={`mx-auto flex h-[224px] w-[224px] items-center justify-center rounded-[24px] text-[12px] ${
          isLight ? "bg-white text-gray-400" : "bg-black/10 text-white/40"
        }`}
      >
        暂无类别
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[224px] w-[224px]">
      <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="h-full w-full">
        {[0.25, 0.5, 0.75, 1].map((scale) => {
          const points = axisPoints
            .map((point) => `${center + (point.x - center) * scale},${center + (point.y - center) * scale}`)
            .join(" ");
          return (
            <polygon
              key={scale}
              points={points}
              fill="none"
              stroke={isLight ? "#e5e7eb" : "rgba(255,255,255,0.14)"}
              strokeWidth="1"
            />
          );
        })}
        {axisPoints.map((point, index) => (
          <line
            key={`${point.x}-${point.y}-${index}`}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke={isLight ? "#e5e7eb" : "rgba(255,255,255,0.14)"}
            strokeWidth="1"
          />
        ))}
        <polygon
          points={polygon}
          fill="rgba(56,189,248,0.25)"
          stroke="#38bdf8"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        {valuePoints.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#38bdf8"
            stroke={isLight ? "#ffffff" : "#1c1d21"}
            strokeWidth="2"
          />
        ))}
      </svg>
      {normalizedAxes.map((axis, index) => {
        const labelPoint = getPoint(index, 1, labelRadius);
        return (
          <div
            key={axis.id}
            className={`absolute max-w-[58px] -translate-x-1/2 -translate-y-1/2 truncate rounded-full px-2 py-0.5 text-center text-[10px] font-bold shadow-sm ${
              isLight ? "bg-white text-gray-700" : "bg-[#262a32] text-white"
            }`}
            style={{
              left: `${(labelPoint.x / viewSize) * 100}%`,
              top: `${(labelPoint.y / viewSize) * 100}%`,
            }}
          >
            {axis.name.replace("类", "")}
          </div>
        );
      })}
    </div>
  );
}

function AbilityHint({
  label,
  value,
  helper,
  tone,
  theme,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "green" | "orange" | "blue";
  theme: StudentTheme;
}) {
  const toneClass =
    theme === "light"
      ? {
          green: "text-emerald-600 bg-emerald-50",
          orange: "text-orange-600 bg-orange-50",
          blue: "text-[#1677ff] bg-blue-50",
        }[tone]
      : {
          green: "text-lime-300 bg-lime-300/10",
          orange: "text-orange-300 bg-orange-300/10",
          blue: "text-sky-300 bg-sky-300/10",
        }[tone];

  return (
    <div className={`rounded-2xl px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] font-medium opacity-80">{label}</div>
      <div className="mt-1 truncate text-[15px] font-bold">{value}</div>
      <div className="mt-0.5 text-[10px] opacity-70">{helper}</div>
    </div>
  );
}

function AbilityProgress({
  item,
  theme,
}: {
  key?: string | number;
  item: AbilityItem;
  theme: StudentTheme;
}) {
  const cappedPercent = Math.min(100, item.percent);
  const isLight = theme === "light";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-[13px] font-bold ${isLight ? "text-gray-800" : "text-white"}`}>
          {item.name}
        </span>
        <span
          className={`text-[12px] font-semibold ${
            item.percent >= 100
              ? isLight
                ? "text-emerald-600"
                : "text-lime-300"
              : isLight
                ? "text-orange-500"
                : "text-orange-300"
          }`}
        >
          {item.completed}/{item.target} 次
        </span>
      </div>
      <div className={`mt-2 h-2 overflow-hidden rounded-full ${isLight ? "bg-gray-100" : "bg-white/10"}`}>
        <div
          className={`h-full rounded-full ${
            item.percent >= 100
              ? isLight
                ? "bg-emerald-500"
                : "bg-lime-300"
              : isLight
                ? "bg-[#1677ff]"
                : "bg-sky-300"
          }`}
          style={{ width: `${cappedPercent}%` }}
        />
      </div>
      <div className={`mt-1 text-[11px] ${isLight ? "text-gray-400" : "text-white/40"}`}>
        {item.left > 0 ? `还差 ${item.left} 次` : "已达成，继续挑战"}
      </div>
    </div>
  );
}

function GrowthCard({
  bars,
  binaryBars = false,
  label,
  value,
  helper,
  tone,
  theme,
}: {
  bars: number[];
  binaryBars?: boolean;
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "orange" | "pink" | "purple";
  theme: StudentTheme;
}) {
  const isLight = theme === "light";
  const toneClass = isLight
    ? {
        blue: "text-[#1677ff]",
        green: "text-emerald-600",
        orange: "text-orange-600",
        pink: "text-rose-500",
        purple: "text-violet-500",
      }[tone]
    : {
        blue: "text-sky-300",
        green: "text-lime-300",
        orange: "text-orange-300",
        pink: "text-rose-300",
        purple: "text-violet-300",
      }[tone];

  return (
    <div className={`rounded-[22px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] backdrop-blur-xl ${
      isLight ? "border-white/60 bg-white/35" : "border-white/10 bg-white/[0.06]"
    }`}>
      <div className={`text-[11px] font-medium ${isLight ? "text-gray-500" : "text-white/45"}`}>
        {label}
      </div>
      <div className={`mt-2 truncate text-[20px] font-bold leading-none ${toneClass}`}>
        {value}
      </div>
      <div className={`mt-2 text-[11px] ${isLight ? "text-gray-400" : "text-white/40"}`}>
        {helper}
      </div>
      <MiniBars binary={binaryBars} values={bars} tone={tone} theme={theme} />
    </div>
  );
}

function MiniBars({
  binary = false,
  tone,
  theme,
  values,
}: {
  binary?: boolean;
  tone: "blue" | "green" | "orange" | "pink" | "purple";
  theme: StudentTheme;
  values: number[];
}) {
  const isLight = theme === "light";
  const colorClass = isLight
    ? {
        blue: "bg-[#1677ff]",
        green: "bg-emerald-500",
        orange: "bg-orange-500",
        pink: "bg-rose-500",
        purple: "bg-violet-500",
      }[tone]
    : {
        blue: "bg-sky-300",
        green: "bg-lime-300",
        orange: "bg-orange-300",
        pink: "bg-rose-300",
        purple: "bg-violet-300",
      }[tone];
  const neutralClass = isLight ? "bg-white/55" : "bg-white/[0.14]";
  const maxValue = Math.max(1, ...values);

  return (
    <div className="mt-3 flex h-8 items-end gap-1 overflow-hidden" aria-label="最近12天趋势">
      {values.map((value, index) => {
        const hasValue = value > 0;
        const height = binary
          ? hasValue
            ? 26
            : 7
          : hasValue
            ? Math.max(6, Math.round(8 + (value / maxValue) * 22))
            : 6;

        return (
          <span
            key={`${value}-${index}`}
            className={`w-1 rounded-full ${hasValue ? colorClass : neutralClass}`}
            style={{ height }}
          />
        );
      })}
    </div>
  );
}

function AchievementBadge({
  item,
  theme,
}: {
  key?: string | number;
  theme: StudentTheme;
  item: {
    title: string;
    desc: string;
    active: boolean;
    icon: ReactNode;
  };
}) {
  const isLight = theme === "light";

  return (
    <div
      className={`rounded-[22px] border p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] backdrop-blur-xl ${
        isLight
          ? item.active
            ? "border-amber-200/55 bg-amber-100/40 text-amber-700"
            : "border-white/55 bg-white/30 text-gray-400"
          : item.active
            ? "border-lime-300/20 bg-lime-300/10 text-lime-200"
            : "border-white/10 bg-white/[0.04] text-white/35"
      }`}
    >
      <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ${
        isLight ? "border-white/60 bg-white/50" : "border-white/10 bg-white/10"
      }`}>
        {item.active ? item.icon : <Star className="h-4 w-4" />}
      </div>
      <div className="mt-2 text-[12px] font-bold">{item.title}</div>
      <div className="mt-1 min-h-[28px] text-[10px] leading-4">{item.desc}</div>
    </div>
  );
}

function StudentSettingsSheet({
  categories,
  goal,
  open,
  theme,
  onClose,
  onGoalChange,
  onThemeChange,
}: {
  categories: Category[];
  goal: StudentGoal;
  open: boolean;
  theme: StudentTheme;
  onClose: () => void;
  onGoalChange: (goal: StudentGoal) => void;
  onThemeChange: (theme: StudentTheme) => void;
}) {
  if (!open) return null;

  const isLight = theme === "light";

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        aria-label="关闭设置"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div
        className={`absolute bottom-0 left-1/2 max-h-[82vh] w-full max-w-[480px] -translate-x-1/2 overflow-y-auto rounded-t-[32px] border p-4 pb-6 shadow-[0_-24px_80px_rgba(30,55,91,0.25),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl ${
          isLight ? "border-white/60 bg-white/55 text-gray-950" : "border-white/10 bg-[#101827]/75 text-white"
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300/70" />
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-bold">家长设置</h2>
          <button
            aria-label="关闭设置"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              isLight ? "border border-white/60 bg-white/45 text-gray-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]" : "border border-white/10 bg-white/10 text-white/80"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`mt-4 rounded-[24px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] backdrop-blur-xl ${
            isLight ? "border-white/60 bg-white/35" : "border-white/10 bg-white/[0.06]"
          }`}
        >
          <div
            className={`text-[13px] font-semibold ${
              isLight ? "text-gray-500" : "text-white/55"
            }`}
          >
            显示模式
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ThemeOptionButton
              active={isLight}
              icon={<Sun className="h-4 w-4" />}
              label="浅色"
              onClick={() => onThemeChange("light")}
              theme={theme}
            />
            <ThemeOptionButton
              active={!isLight}
              icon={<Moon className="h-4 w-4" />}
              label="深色"
              onClick={() => onThemeChange("dark")}
              theme={theme}
            />
          </div>
        </div>

        <div
          className={`mt-3 rounded-[24px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] backdrop-blur-xl ${
            isLight ? "border-white/60 bg-white/35" : "border-white/10 bg-white/[0.06]"
          }`}
        >
          <div
            className={`text-[13px] font-semibold ${
              isLight ? "text-gray-500" : "text-white/55"
            }`}
          >
            额外目标
          </div>
          <label className="mt-3 block">
            <span
              className={`text-[11px] font-medium ${
                isLight ? "text-gray-400" : "text-white/40"
              }`}
            >
              目标名称
            </span>
            <input
              value={goal.title}
              onChange={(event) =>
                onGoalChange({ ...goal, title: event.target.value })
              }
              className={`mt-1 h-11 w-full rounded-2xl px-3 text-[14px] font-semibold outline-none ${
                  isLight
                  ? "border border-white/60 bg-white/50 text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
                  : "border border-white/10 bg-black/20 text-white"
              }`}
            />
          </label>

          <div className="mt-3 grid grid-cols-[1fr_104px] gap-2">
            <label className="block">
              <span
                className={`text-[11px] font-medium ${
                  isLight ? "text-gray-400" : "text-white/40"
                }`}
              >
                关注分类
              </span>
              <select
                value={goal.focusCategoryId}
                onChange={(event) =>
                  onGoalChange({ ...goal, focusCategoryId: event.target.value })
                }
                className={`mt-1 h-11 w-full rounded-2xl px-3 text-[14px] font-semibold outline-none ${
                  isLight
                    ? "border border-white/60 bg-white/50 text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
                    : "border border-white/10 bg-black/20 text-white"
                }`}
              >
                <option value="all">全部运动</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span
                className={`text-[11px] font-medium ${
                  isLight ? "text-gray-400" : "text-white/40"
                }`}
              >
                每周次数
              </span>
              <input
                min={1}
                max={30}
                type="number"
                value={goal.weeklyTarget}
                onChange={(event) =>
                  onGoalChange({
                    ...goal,
                    weeklyTarget: Number(event.target.value),
                  })
                }
                className={`mt-1 h-11 w-full rounded-2xl px-3 text-center text-[16px] font-bold outline-none ${
                  isLight
                    ? "border border-white/60 bg-white/50 text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl"
                    : "border border-white/10 bg-black/20 text-white"
                }`}
              />
            </label>
          </div>
        </div>

        <div
          className={`sticky bottom-0 -mx-4 mt-3 px-4 pt-3 pb-1 ${
            isLight ? "bg-white/0" : "bg-transparent"
          }`}
        >
          <button
            onClick={onClose}
            className={`h-12 w-full rounded-2xl text-[16px] font-bold shadow-sm ${
              isLight
                ? "border border-white/50 bg-[#1677ff]/90 text-white shadow-[0_18px_38px_rgba(22,119,255,0.28),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl active:bg-[#1677ff]"
                : "border border-lime-200/55 bg-lime-300/85 text-[#071006] shadow-[0_18px_36px_rgba(190,242,100,0.22),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl active:bg-lime-300"
            }`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

function ThemeOptionButton({
  active,
  icon,
  label,
  onClick,
  theme,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  theme: StudentTheme;
}) {
  const isLight = theme === "light";

  return (
    <button
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 rounded-2xl text-[14px] font-bold ${
        active
          ? isLight
            ? "border border-white/50 bg-[#1677ff]/90 text-white shadow-[0_12px_26px_rgba(22,119,255,0.22),inset_0_1px_0_rgba(255,255,255,0.5)]"
            : "border border-lime-200/55 bg-lime-300/85 text-[#071006]"
          : isLight
            ? "border border-white/60 bg-white/40 text-gray-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl"
            : "border border-white/10 bg-white/10 text-white/65"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionTitle({
  icon,
  title,
  theme,
}: {
  icon: ReactNode;
  title: string;
  theme: StudentTheme;
}) {
  const isLight = theme === "light";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl ${
          isLight ? "border-white/60 bg-white/45 text-[#1677ff]" : "border-white/10 bg-white/10 text-cyan-200"
        }`}
      >
        {icon}
      </div>
      <h2 className={`text-[18px] font-bold ${isLight ? "text-gray-950" : "text-white"}`}>
        {title}
      </h2>
    </div>
  );
}
