import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  Gauge,
  Goal,
  Layers3,
  LineChart,
  Medal,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  type Category,
  DUMMY_STUDENTS,
  type Project,
  type Record as SportRecord,
  type Student,
  useAppStore,
} from "../../store";
import { getCategoryName, getStudentLabel, getTotalTimes, groupBy } from "../../lib/sportMetrics";
import {
  calculateClassActivityIndex,
  calculateGradeSportsDevelopmentIndex,
  calculateSportsParticipationIndex,
  clampIndex,
  toPercent,
} from "../../lib/studentIndexMetrics";

type StudentStatus = "achieved" | "improving" | "inactive";

type ClassStatusRow = {
  name: string;
  students: number;
  achieved: number;
  improving: number;
  inactive: number;
  rate: number;
  totalTimes: number;
};

type CategoryProgressRow = {
  name: string;
  target: number;
  totalTimes: number;
  participants: number;
  progress: number;
};

const statusColors = {
  achieved: "#34d399",
  improving: "#fbbf24",
  inactive: "#fb7185",
};

type ScreenMode = "light" | "dark";

const screenThemes = {
  light: {
    chartGrid: "rgba(15, 23, 42, 0.1)",
    chartText: "rgba(15, 23, 42, 0.62)",
    css: {
      "--screen-bg": "#f4f7fb",
      "--screen-panel": "#ffffff",
      "--screen-panel-soft": "#f8fafc",
      "--screen-text": "#172033",
      "--screen-heading": "#0f172a",
      "--screen-muted": "#667085",
      "--screen-faint": "#8a94a6",
      "--screen-border": "rgba(15, 23, 42, 0.12)",
      "--screen-track": "#e6ebf2",
      "--screen-pill": "#edf4f7",
      "--screen-accent": "#047857",
      "--screen-accent-soft": "rgba(4, 120, 87, 0.1)",
      "--screen-dot": "rgba(15, 23, 42, 0.28)",
      "--screen-shadow": "0 16px 42px rgba(15, 23, 42, 0.08)",
      "--metric-emerald": "#059669",
      "--metric-amber": "#d97706",
      "--metric-rose": "#e11d48",
      "--tooltip-bg": "#ffffff",
      "--tooltip-border": "rgba(15, 23, 42, 0.14)",
    },
  },
  dark: {
    chartGrid: "rgba(255, 255, 255, 0.08)",
    chartText: "rgba(255, 255, 255, 0.66)",
    css: {
      "--screen-bg": "#0d0f12",
      "--screen-panel": "#15171b",
      "--screen-panel-soft": "#101216",
      "--screen-text": "#ffffff",
      "--screen-heading": "#ffffff",
      "--screen-muted": "rgba(255, 255, 255, 0.55)",
      "--screen-faint": "rgba(255, 255, 255, 0.42)",
      "--screen-border": "rgba(255, 255, 255, 0.1)",
      "--screen-track": "rgba(255, 255, 255, 0.1)",
      "--screen-pill": "rgba(255, 255, 255, 0.08)",
      "--screen-accent": "#6ee7b7",
      "--screen-accent-soft": "rgba(110, 231, 183, 0.1)",
      "--screen-dot": "rgba(255, 255, 255, 0.4)",
      "--screen-shadow": "0 18px 70px rgba(0, 0, 0, 0.28)",
      "--metric-emerald": "#6ee7b7",
      "--metric-amber": "#fde047",
      "--metric-rose": "#fb7185",
      "--tooltip-bg": "#101216",
      "--tooltip-border": "rgba(255, 255, 255, 0.1)",
    },
  },
} satisfies Record<ScreenMode, { chartGrid: string; chartText: string; css: CSSProperties }>;

const panelClass =
  "rounded-lg border border-[var(--screen-border)] bg-[var(--screen-panel)] shadow-[var(--screen-shadow)]";

export function StatsBigScreen() {
  const { records, projects, categories, statsMonth } = useAppStore();
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState<ScreenMode>(() => getInitialScreenMode());
  const theme = screenThemes[mode];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sports-big-screen-theme", mode);
  }, [mode]);

  const dashboard = useMemo(
    () => buildDashboardData({ records, projects, categories, statsMonth }),
    [records, projects, categories, statsMonth],
  );

  return (
    <div
      className="min-h-screen w-screen overflow-x-hidden bg-[var(--screen-bg)] text-[var(--screen-text)]"
      style={theme.css}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-4 px-5 py-4">
        <header className="flex shrink-0 items-center justify-between gap-5 border-b border-[var(--screen-border)] pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-[13px] font-semibold text-[var(--screen-accent)]">
              <ShieldCheck className="h-4 w-4" />
              <span>校园运动健康治理大屏</span>
              <span className="h-1 w-1 rounded-full bg-[var(--screen-dot)]" />
              <span>{getMonthLabel(statsMonth)}</span>
            </div>
            <h1 className="mt-1 truncate text-[34px] font-black leading-tight text-[var(--screen-heading)]">
              运动打卡数据总览
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="grid grid-cols-4 gap-3 text-right">
              <HeaderStat
                icon={<Users className="h-4 w-4" />}
                label="学生数"
                value={dashboard.studentCount}
                unit="人"
              />
              <HeaderStat
                icon={<Layers3 className="h-4 w-4" />}
                label="项目数"
                value={dashboard.activeProjectCount}
                unit="项"
              />
              <HeaderStat
                icon={<ClipboardCheck className="h-4 w-4" />}
                label="有效记录"
                value={dashboard.recordCount}
                unit="条"
              />
              <HeaderStat
                icon={<CalendarDays className="h-4 w-4" />}
                label="更新时间"
                value={formatTime(now)}
              />
            </div>
            <button
              type="button"
              onClick={() => setMode(mode === "light" ? "dark" : "light")}
              className="flex h-10 min-w-[92px] items-center justify-center gap-2 rounded border border-[var(--screen-border)] bg-[var(--screen-panel)] px-3 text-[12px] font-bold text-[var(--screen-heading)] shadow-[var(--screen-shadow)]"
              aria-label="切换大屏配色"
            >
              {mode === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {mode === "light" ? "夜间" : "日间"}
            </button>
          </div>
        </header>

        <section className="grid shrink-0 gap-4 xl:grid-cols-[1.05fr_1.35fr_0.9fr]">
          <div className={`${panelClass} min-h-[220px] p-5`}>
            <div className="flex items-start justify-between gap-5">
              <PanelTitle
                icon={<Gauge className="h-5 w-5" />}
                eyebrow="一、治理总览"
                title="综合健康治理指数"
              />
              <TrendBadge value={dashboard.governanceTrend} />
            </div>
            <div className="mt-5 flex items-end gap-4">
              <div className="text-[80px] font-black leading-none text-[var(--screen-heading)]">
                {dashboard.governanceIndex}
              </div>
              <div className="pb-3">
                <div className="text-[18px] font-bold text-[var(--screen-accent)]">
                  {getIndexJudgement(dashboard.governanceIndex)}
                </div>
                <div className="mt-1 text-[13px] text-[var(--screen-muted)]">
                  覆盖、达标、均衡、风险与数据完整度综合计算
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--screen-border)] pt-4">
              <MetricLine label="参与覆盖率" value={`${dashboard.participationRate}%`} tone="emerald" />
              <MetricLine label="记录达标率" value={`${dashboard.passRate}%`} tone="amber" />
              <MetricLine label="风险关注" value={`${dashboard.riskStudentCount}人`} tone="rose" />
            </div>
          </div>

          <div className={`${panelClass} min-h-[220px] p-5`}>
            <div className="flex items-start justify-between gap-5">
              <PanelTitle
                icon={<Target className="h-5 w-5" />}
                eyebrow="二、政策落实"
                title="体育健康政策落实结构"
              />
              <div className="text-right">
                <div className="text-[38px] font-black leading-none text-[#38bdf8]">
                  {dashboard.policyImplementationRate}%
                </div>
                <div className="mt-1 text-[12px] text-[var(--screen-muted)]">落实率</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4">
              {dashboard.policyBars.map((item) => (
                <ProgressMetric key={item.name} {...item} />
              ))}
            </div>
          </div>

          <div className={`${panelClass} min-h-[220px] p-5`}>
            <PanelTitle
              icon={<Activity className="h-5 w-5" />}
              eyebrow="三、状态结构"
              title="达标、待提升、未参与"
            />
            <div className="mt-4 flex items-center justify-center">
              <StatusDonut data={dashboard.statusPie} total={dashboard.studentCount} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {dashboard.statusPie.map((item) => (
                <div key={item.name} className="border-t border-[var(--screen-border)] pt-2">
                  <div className="text-[20px] font-black" style={{ color: item.color }}>
                    {item.value}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--screen-muted)]">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="grid gap-4 xl:grid-cols-[1.15fr_1.35fr_0.95fr]">
          <section className="grid gap-4">
            <div className={`${panelClass} min-h-[300px] p-5`}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <PanelTitle
                  icon={<Medal className="h-5 w-5" />}
                  eyebrow="四、组织差异"
                  title="班级达标结构"
                />
                <LegendGroup
                  items={[
                    { label: "已达标", color: statusColors.achieved },
                    { label: "待提升", color: statusColors.improving },
                    { label: "未参与", color: statusColors.inactive },
                  ]}
                />
              </div>
              <div className="h-[250px]">
                <div className="flex h-full flex-col justify-start gap-2 pt-3">
                  {dashboard.classRows.map((row) => (
                    <ClassStackRow key={row.name} row={row} />
                  ))}
                </div>
              </div>
            </div>

            <div className={`${panelClass} min-h-[220px] p-5`}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <PanelTitle
                  icon={<Dumbbell className="h-5 w-5" />}
                  eyebrow="五、项目供给"
                  title="运动类别短板"
                />
                <span className="text-[12px] font-semibold text-[var(--screen-muted)]">
                  完成度 = 有效次数 / 类别目标
                </span>
              </div>
              <div className="grid gap-3">
                {dashboard.categoryRows.map((item) => (
                  <div key={item.name}>
                    <CategoryRow item={item} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <div className={`${panelClass} min-h-[300px] p-5`}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <PanelTitle
                  icon={<LineChart className="h-5 w-5" />}
                  eyebrow="六、趋势变化"
                  title="近 14 天参与与达标趋势"
                />
                <LegendGroup
                  items={[
                    { label: "参与人数", color: "#38bdf8" },
                    { label: "达标次数", color: "#34d399" },
                    { label: "综合指数", color: "#fbbf24" },
                  ]}
                />
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboard.trendRows} margin={{ top: 8, right: 14, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={theme.chartGrid} vertical={false} />
                    <XAxis dataKey="label" stroke={theme.chartText} tickLine={false} axisLine={false} />
                    <YAxis stroke={theme.chartText} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<ScreenTooltip />} />
                    <Area isAnimationActive={false} type="monotone" dataKey="participants" name="参与人数" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.12} strokeWidth={2} />
                    <Area isAnimationActive={false} type="monotone" dataKey="passedTimes" name="达标次数" stroke="#34d399" fill="#34d399" fillOpacity={0.10} strokeWidth={2} />
                    <Area isAnimationActive={false} type="monotone" dataKey="index" name="综合指数" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.08} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`${panelClass} min-h-[220px] p-5`}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <PanelTitle
                  icon={<Goal className="h-5 w-5" />}
                  eyebrow="七、项目热度"
                  title="打卡贡献 Top 项目"
                />
                <span className="text-[12px] font-semibold text-[var(--screen-muted)]">
                  按达标次数排序
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {dashboard.projectRows.slice(0, 8).map((item, index) => (
                  <div key={item.id}>
                    <ProjectRankRow item={item} rank={index + 1} max={dashboard.maxProjectTimes} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <div className={`${panelClass} min-h-[300px] p-5`}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <PanelTitle
                  icon={<Sparkles className="h-5 w-5" />}
                  eyebrow="八、治理六维"
                  title="短板定位"
                />
                <div className="text-right text-[12px] font-semibold text-[var(--screen-muted)]">
                  越高越好
                </div>
              </div>
              <div className="flex h-[250px] flex-col justify-start gap-4 pt-5">
                {dashboard.radarRows.map((item) => (
                  <DimensionRow key={item.name} item={item} />
                ))}
              </div>
            </div>

            <div className={`${panelClass} min-h-[220px] p-5`}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <PanelTitle
                  icon={<AlertTriangle className="h-5 w-5" />}
                  eyebrow="九、整改对象"
                  title="优先跟进清单"
                />
                <span className="text-[12px] font-semibold text-[#fb7185]">
                  Top 3
                </span>
              </div>
              <div className="space-y-3">
                {dashboard.priorityItems.slice(0, 3).map((item, index) => (
                  <PriorityItem key={`${item.title}-${index}`} index={index + 1} {...item} />
                ))}
              </div>
            </div>
          </section>
        </main>

        <footer className="grid shrink-0 gap-3 border-t border-[var(--screen-border)] pt-3 text-[13px] text-[var(--screen-muted)] xl:grid-cols-4">
          <NarrativeStep number="1" title="看整体" text={`综合指数 ${dashboard.governanceIndex} 分，判断全校体育健康治理水平。`} />
          <NarrativeStep number="2" title="看落实" text={`政策落实率 ${dashboard.policyImplementationRate}%，定位课程、打卡、闭环是否到位。`} />
          <NarrativeStep number="3" title="看差异" text={`班级均衡 ${dashboard.classBalanceIndex} 分，发现拉开差距的班级。`} />
          <NarrativeStep number="4" title="看行动" text={`风险关注 ${dashboard.riskStudentCount} 人，形成下月跟进名单。`} />
        </footer>
      </div>
    </div>
  );
}

function buildDashboardData({
  records,
  projects,
  categories,
  statsMonth,
}: {
  records: SportRecord[];
  projects: Project[];
  categories: Category[];
  statsMonth: string;
}) {
  const students = DUMMY_STUDENTS;
  const activeProjects = projects.filter((project) => project.status === "open");
  const monthRecords = records.filter(
    (record) => !record.isInvalid && record.datetime.startsWith(statsMonth),
  );
  const passedRecords = monthRecords.filter((record) => record.isPassed);
  const participantIds = new Set(monthRecords.map((record) => record.studentId));
  const passedStudentIds = new Set(passedRecords.map((record) => record.studentId));
  const totalTimes = getTotalTimes(passedRecords);
  const participationRate = toPercent(participantIds.size, students.length);
  const passRate = toPercent(passedRecords.length, monthRecords.length);
  const activeDays = new Set(monthRecords.map((record) => record.date)).size;
  const activeProjectIds = new Set(monthRecords.map((record) => record.projectId));
  const projectCoverageRate = toPercent(activeProjectIds.size, activeProjects.length);

  const categoryRows = buildCategoryRows(categories, activeProjects, monthRecords, passedRecords, statsMonth);
  const categoryProgressValues = categoryRows.map((row) => row.progress);
  const categoryBalanceIndex =
    categoryProgressValues.length > 0
      ? clampIndex(100 - (Math.max(...categoryProgressValues) - Math.min(...categoryProgressValues)))
      : 0;

  const classRows = buildClassRows(students, monthRecords, passedRecords);
  const classRates = classRows.map((row) => row.rate);
  const classBalanceIndex =
    classRates.length > 0 ? clampIndex(100 - (Math.max(...classRates) - Math.min(...classRates))) : 0;

  const riskStudents = students.filter((student) => !passedStudentIds.has(student.id));
  const riskRate = toPercent(riskStudents.length, students.length);
  const dataCompleteness = getDataCompleteness(students, activeProjects, categories, monthRecords);
  const monthlyExerciseTimes = students.length > 0 ? Math.round((totalTimes / students.length) * 10) / 10 : 0;
  const participationIndex = calculateSportsParticipationIndex({
    participationRate,
    passRate,
    monthlyExerciseTimes,
    continuityDays: Math.min(7, activeDays),
    absenceRate: 100 - participationRate,
  });
  const classActivityIndex = calculateClassActivityIndex({
    participationRate,
    groupActivityTimes: totalTimes,
    classAtmosphereScore: 7,
    continuityDays: Math.min(7, activeDays),
    projectCoverageRate,
  });
  const gradeDevelopmentIndex = calculateGradeSportsDevelopmentIndex({
    participationRate,
    passRate,
    projectCoverageRate,
    improvementRate: 62,
    classBalanceRate: classBalanceIndex,
  });
  const policyImplementationRate = clampIndex(
    participationRate * 0.35 +
      passRate * 0.25 +
      projectCoverageRate * 0.2 +
      dataCompleteness * 0.1 +
      categoryBalanceIndex * 0.1,
  );
  const physiqueDevelopmentIndex = clampIndex(
    passRate * 0.35 +
      participationIndex * 0.25 +
      categoryBalanceIndex * 0.18 +
      gradeDevelopmentIndex * 0.12 +
      dataCompleteness * 0.1,
  );
  const governanceIndex = clampIndex(
    policyImplementationRate * 0.25 +
      physiqueDevelopmentIndex * 0.2 +
      participationIndex * 0.2 +
      classBalanceIndex * 0.15 +
      dataCompleteness * 0.1 +
      (100 - riskRate) * 0.1,
  );

  const statusPie = [
    { name: "已达标", value: passedStudentIds.size, color: statusColors.achieved },
    {
      name: "待提升",
      value: Math.max(0, participantIds.size - passedStudentIds.size),
      color: statusColors.improving,
    },
    {
      name: "未参与",
      value: Math.max(0, students.length - participantIds.size),
      color: statusColors.inactive,
    },
  ];

  const projectRows = activeProjects
    .map((project) => {
      const projectRecords = monthRecords.filter((record) => record.projectId === project.id);
      const projectPassed = projectRecords.filter((record) => record.isPassed);
      return {
        id: project.id,
        name: project.name,
        category: getCategoryName(project, categories),
        participants: new Set(projectRecords.map((record) => record.studentId)).size,
        totalTimes: getTotalTimes(projectPassed),
      };
    })
    .filter((project) => project.totalTimes > 0 || project.participants > 0)
    .sort((a, b) => b.totalTimes - a.totalTimes || b.participants - a.participants);

  const priorityItems = buildPriorityItems({
    classRows,
    categoryRows,
    riskStudents,
    monthRecords,
    passedRecords,
  });

  return {
    studentCount: students.length,
    activeProjectCount: activeProjects.length,
    recordCount: monthRecords.length,
    totalTimes,
    participationRate,
    passRate,
    governanceIndex,
    governanceTrend: getTrendDelta(governanceIndex),
    policyImplementationRate,
    physiqueDevelopmentIndex,
    classBalanceIndex,
    riskStudentCount: riskStudents.length,
    statusPie,
    classRows,
    categoryRows,
    projectRows,
    maxProjectTimes: Math.max(1, ...projectRows.map((project) => project.totalTimes)),
    trendRows: buildTrendRows(statsMonth, monthRecords, passedRecords, students.length),
    radarRows: [
      { name: "参与", value: participationIndex },
      { name: "达标", value: passRate },
      { name: "质量", value: physiqueDevelopmentIndex },
      { name: "均衡", value: classBalanceIndex },
      { name: "数据", value: dataCompleteness },
      { name: "低风险", value: clampIndex(100 - riskRate) },
    ],
    policyBars: [
      { name: "学生参与覆盖", value: participationRate, color: "#34d399" },
      { name: "记录达标质量", value: passRate, color: "#fbbf24" },
      { name: "项目覆盖广度", value: projectCoverageRate, color: "#38bdf8" },
      { name: "类别均衡程度", value: categoryBalanceIndex, color: "#a78bfa" },
      { name: "班级活跃指数", value: classActivityIndex, color: "#fb7185" },
      { name: "数据接入完整", value: dataCompleteness, color: "#f97316" },
    ],
    priorityItems,
  };
}

function buildCategoryRows(
  categories: Category[],
  activeProjects: Project[],
  monthRecords: SportRecord[],
  passedRecords: SportRecord[],
  statsMonth: string,
): CategoryProgressRow[] {
  return categories
    .map((category) => {
      const projectIds = new Set(
        activeProjects
          .filter((project) => project.categoryId === category.id)
          .map((project) => project.id),
      );
      const categoryRecords = monthRecords.filter((record) => projectIds.has(record.projectId));
      const categoryPassed = passedRecords.filter((record) => projectIds.has(record.projectId));
      const target = category.monthlyRules?.[statsMonth] ?? category.targetCompletions;
      const totalTimes = getTotalTimes(categoryPassed);

      return {
        name: category.name,
        target,
        totalTimes,
        participants: new Set(categoryRecords.map((record) => record.studentId)).size,
        progress: target > 0 ? Math.min(100, Math.round((totalTimes / target) * 100)) : 100,
      };
    })
    .sort((a, b) => a.progress - b.progress || b.totalTimes - a.totalTimes);
}

function buildClassRows(
  students: Student[],
  monthRecords: SportRecord[],
  passedRecords: SportRecord[],
): ClassStatusRow[] {
  return Object.entries(groupBy(students, getStudentLabel))
    .map(([name, classStudents]) => {
      const ids = new Set(classStudents.map((student) => student.id));
      const classRecords = monthRecords.filter((record) => ids.has(record.studentId));
      const classPassed = passedRecords.filter((record) => ids.has(record.studentId));
      const participantIds = new Set(classRecords.map((record) => record.studentId));
      const achievedIds = new Set(classPassed.map((record) => record.studentId));

      return {
        name,
        students: classStudents.length,
        achieved: achievedIds.size,
        improving: Math.max(0, participantIds.size - achievedIds.size),
        inactive: Math.max(0, classStudents.length - participantIds.size),
        rate: toPercent(achievedIds.size, classStudents.length),
        totalTimes: getTotalTimes(classPassed),
      };
    })
    .sort((a, b) => b.rate - a.rate || b.totalTimes - a.totalTimes);
}

function buildTrendRows(
  statsMonth: string,
  monthRecords: SportRecord[],
  passedRecords: SportRecord[],
  studentCount: number,
) {
  const anchor = getTrendAnchor(statsMonth);
  return Array.from({ length: 14 }).map((_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - (13 - index));
    const dateKey = formatDateKey(date);
    const dayRecords = monthRecords.filter((record) => record.date === dateKey);
    const dayPassed = passedRecords.filter((record) => record.date === dateKey);
    const participants = new Set(dayRecords.map((record) => record.studentId)).size;
    const passedTimes = getTotalTimes(dayPassed);
    const indexValue = clampIndex(
      toPercent(participants, studentCount) * 0.45 +
        toPercent(dayPassed.length, dayRecords.length) * 0.35 +
        Math.min(100, passedTimes * 12) * 0.2,
    );

    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      participants,
      passedTimes,
      index: indexValue,
    };
  });
}

function buildPriorityItems({
  classRows,
  categoryRows,
  riskStudents,
  monthRecords,
  passedRecords,
}: {
  classRows: ClassStatusRow[];
  categoryRows: CategoryProgressRow[];
  riskStudents: Student[];
  monthRecords: SportRecord[];
  passedRecords: SportRecord[];
}) {
  const lowClass = [...classRows].sort((a, b) => a.rate - b.rate || a.totalTimes - b.totalTimes)[0];
  const weakCategory = categoryRows[0];
  const firstRiskStudent = riskStudents[0];
  const inactiveRiskCount = riskStudents.filter(
    (student) => !monthRecords.some((record) => record.studentId === student.id),
  ).length;
  const failedRiskCount = riskStudents.length - inactiveRiskCount;

  return [
    lowClass
      ? {
          tone: "rose" as const,
          title: `${lowClass.name} 达标结构偏弱`,
          value: `${lowClass.rate}%`,
          detail: `已达标 ${lowClass.achieved} 人，待提升 ${lowClass.improving} 人，未参与 ${lowClass.inactive} 人。`,
        }
      : null,
    weakCategory
      ? {
          tone: "amber" as const,
          title: `${weakCategory.name} 类别完成度最低`,
          value: `${weakCategory.progress}%`,
          detail: `完成 ${weakCategory.totalTimes}/${weakCategory.target} 次，参与 ${weakCategory.participants} 人。`,
        }
      : null,
    riskStudents.length > 0
      ? {
          tone: "rose" as const,
          title: "风险学生需要点名跟进",
          value: `${riskStudents.length}人`,
          detail: `未参与 ${inactiveRiskCount} 人，参与但无达标 ${failedRiskCount} 人；优先关注 ${firstRiskStudent?.name || "名单"}。`,
        }
      : null,
    {
      tone: "emerald" as const,
      title: "达标记录可作为示范样本",
      value: `${getTotalTimes(passedRecords)}次`,
      detail: `本月形成 ${passedRecords.length} 条达标记录，可沉淀到项目经验和班级复盘。`,
    },
  ].filter(Boolean) as Array<{
    tone: "emerald" | "amber" | "rose";
    title: string;
    value: string;
    detail: string;
  }>;
}

function getDataCompleteness(
  students: Student[],
  activeProjects: Project[],
  categories: Category[],
  monthRecords: SportRecord[],
) {
  const studentProfileRate = toPercent(
    students.filter((student) => student.id && student.name && student.grade && student.className).length,
    students.length,
  );
  const projectConfigRate = toPercent(
    activeProjects.filter(
      (project) =>
        project.name &&
        project.categoryId &&
        project.indicators.length > 0 &&
        project.targetCompletionsPerPeriod > 0,
    ).length,
    activeProjects.length,
  );
  const categoryConfigRate = toPercent(
    categories.filter((category) => category.name && category.targetCompletions > 0).length,
    categories.length,
  );
  const recordQualityRate = monthRecords.length > 0 ? 100 : 0;
  const multiSourceRate = 45;

  return clampIndex(
    studentProfileRate * 0.24 +
      projectConfigRate * 0.24 +
      categoryConfigRate * 0.18 +
      recordQualityRate * 0.18 +
      multiSourceRate * 0.16,
  );
}

function getTrendAnchor(statsMonth: string) {
  const [yearText, monthText] = statsMonth.split("-");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (statsMonth === currentMonth) return now;

  return new Date(Number(yearText), Number(monthText), 0);
}

function getTrendDelta(index: number) {
  const baseline = 68;
  return Math.round((index - baseline) * 10) / 10;
}

function getIndexJudgement(score: number) {
  if (score >= 85) return "优势明显";
  if (score >= 75) return "稳中向好";
  if (score >= 65) return "中等偏稳";
  if (score >= 55) return "基础存在";
  return "需要专项推进";
}

function getMonthLabel(statsMonth: string) {
  const [year, month] = statsMonth.split("-");
  return `${year}年${Number(month)}月`;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getInitialScreenMode(): ScreenMode {
  const params = new URLSearchParams(window.location.search);
  const queryTheme = params.get("theme");

  if (queryTheme === "dark" || queryTheme === "light") return queryTheme;

  const savedTheme = window.localStorage.getItem("sports-big-screen-theme");
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;

  return "light";
}

function HeaderStat({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="min-w-[118px] border-l border-[var(--screen-border)] pl-4">
      <div className="flex items-center justify-end gap-1.5 text-[12px] text-[var(--screen-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-[22px] font-black leading-none text-[var(--screen-heading)]">
        {value}
        {unit && <span className="ml-1 text-[12px] font-semibold text-[var(--screen-faint)]">{unit}</span>}
      </div>
    </div>
  );
}

function PanelTitle({
  icon,
  eyebrow,
  title,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--screen-accent)]">
        {icon}
        <span>{eyebrow}</span>
      </div>
      <h2 className="mt-1 truncate text-[20px] font-black leading-tight text-[var(--screen-heading)]">
        {title}
      </h2>
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <div
      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-bold ${
        isPositive ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"
      }`}
    >
      <TrendingUp className="h-3.5 w-3.5" />
      {isPositive ? "+" : ""}
      {value}
    </div>
  );
}

function MetricLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const color = {
    emerald: "var(--metric-emerald)",
    amber: "var(--metric-amber)",
    rose: "var(--metric-rose)",
  }[tone];

  return (
    <div className="min-w-0">
      <div className="text-[12px] font-semibold text-[var(--screen-muted)]">{label}</div>
      <div className="mt-1 text-[24px] font-black leading-none" style={{ color }}>{value}</div>
    </div>
  );
}

function ProgressMetric({ name, value, color }: { name: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-[13px] font-semibold text-[var(--screen-muted)]">{name}</span>
        <span className="shrink-0 text-[18px] font-black text-[var(--screen-heading)]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-[var(--screen-track)]">
        <div className="h-full rounded" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function LegendGroup({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[12px] font-semibold text-[var(--screen-muted)]">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function StatusDonut({
  data,
  total,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
}) {
  let cursor = 0;
  const stops = data
    .map((item) => {
      const start = cursor;
      const end = total > 0 ? cursor + (item.value / total) * 100 : cursor;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div
      className="relative flex h-[132px] w-[132px] items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${stops || "var(--screen-track) 0% 100%"})` }}
    >
      <div className="absolute inset-[15px] rounded-full bg-[var(--screen-panel)]" />
      <div className="relative text-center">
        <div className="text-[30px] font-black leading-none text-[var(--screen-heading)]">{total}</div>
        <div className="mt-1 text-[11px] font-semibold text-[var(--screen-muted)]">总人数</div>
      </div>
    </div>
  );
}

function ClassStackRow({ row }: { key?: string | number; row: ClassStatusRow }) {
  const achievedWidth = toPercent(row.achieved, row.students);
  const improvingWidth = toPercent(row.improving, row.students);
  const inactiveWidth = Math.max(0, 100 - achievedWidth - improvingWidth);

  return (
    <div className="grid grid-cols-[78px_1fr_48px] items-center gap-3">
      <div className="min-w-0">
        <div className="truncate text-[12px] font-black text-[var(--screen-heading)]">{row.name}</div>
        <div className="text-[9px] text-[var(--screen-faint)]">{row.totalTimes} 次</div>
      </div>
      <div className="min-w-0">
        <div className="flex h-3 overflow-hidden rounded bg-[var(--screen-track)]">
          <span style={{ width: `${achievedWidth}%`, backgroundColor: statusColors.achieved }} />
          <span style={{ width: `${improvingWidth}%`, backgroundColor: statusColors.improving }} />
          <span style={{ width: `${inactiveWidth}%`, backgroundColor: statusColors.inactive }} />
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] text-[var(--screen-faint)]">
          <span>达标 {row.achieved}</span>
          <span>待提升 {row.improving}</span>
          <span>未参与 {row.inactive}</span>
        </div>
      </div>
      <div className="text-right text-[18px] font-black text-[var(--screen-heading)]">{row.rate}%</div>
    </div>
  );
}

function DimensionRow({
  item,
}: {
  key?: string | number;
  item: { name: string; value: number };
}) {
  const color = item.value >= 75 ? "#34d399" : item.value >= 60 ? "#38bdf8" : item.value >= 45 ? "#fbbf24" : "#fb7185";

  return (
    <div className="grid grid-cols-[54px_1fr_42px] items-center gap-3">
      <div className="text-[13px] font-black text-[var(--screen-heading)]">{item.name}</div>
      <div className="h-2.5 overflow-hidden rounded bg-[var(--screen-track)]">
        <div className="h-full rounded" style={{ width: `${item.value}%`, backgroundColor: color }} />
      </div>
      <div className="text-right text-[18px] font-black" style={{ color }}>
        {item.value}
      </div>
    </div>
  );
}

function CategoryRow({ item }: { key?: string | number; item: CategoryProgressRow }) {
  const color = item.progress >= 80 ? "#34d399" : item.progress >= 55 ? "#fbbf24" : "#fb7185";

  return (
    <div className="grid grid-cols-[82px_1fr_72px] items-center gap-3">
      <div className="truncate text-[13px] font-bold text-[var(--screen-heading)]">{item.name}</div>
      <div className="min-w-0">
        <div className="h-2 overflow-hidden rounded bg-[var(--screen-track)]">
          <div className="h-full rounded" style={{ width: `${item.progress}%`, backgroundColor: color }} />
        </div>
        <div className="mt-1 text-[11px] text-[var(--screen-faint)]">
          {item.totalTimes}/{item.target} 次 · {item.participants} 人参与
        </div>
      </div>
      <div className="text-right text-[20px] font-black" style={{ color }}>
        {item.progress}%
      </div>
    </div>
  );
}

function ProjectRankRow({
  item,
  rank,
  max,
}: {
  key?: string | number;
  item: { name: string; category: string; participants: number; totalTimes: number };
  rank: number;
  max: number;
}) {
  const width = item.totalTimes > 0 ? Math.max(8, Math.round((item.totalTimes / max) * 100)) : 0;

  return (
    <div className="grid grid-cols-[28px_1fr_48px] items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--screen-pill)] text-[13px] font-black text-[var(--screen-accent)]">
        {rank}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-bold text-[var(--screen-heading)]">{item.name}</div>
        <div className="mt-1 h-1.5 overflow-hidden rounded bg-[var(--screen-track)]">
          <div className="h-full rounded bg-[#38bdf8]" style={{ width: `${width}%` }} />
        </div>
        <div className="mt-1 truncate text-[10px] text-[var(--screen-faint)]">
          {item.category} · {item.participants} 人
        </div>
      </div>
      <div className="text-right text-[17px] font-black text-[var(--screen-heading)]">{item.totalTimes}</div>
    </div>
  );
}

function PriorityItem({
  index,
  tone,
  title,
  value,
  detail,
}: {
  index: number;
  tone: "emerald" | "amber" | "rose";
  title: string;
  value: string;
  detail: string;
}) {
  const color = {
    emerald: "#34d399",
    amber: "#fbbf24",
    rose: "#fb7185",
  }[tone];

  return (
    <div className="grid grid-cols-[30px_1fr_56px] gap-3 border-t border-[var(--screen-border)] pt-3 first:border-t-0 first:pt-0">
      <div className="flex h-7 w-7 items-center justify-center rounded text-[12px] font-black" style={{ backgroundColor: `${color}22`, color }}>
        {index}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-black text-[var(--screen-heading)]">{title}</div>
        <div className="mt-1 text-[11px] leading-4 text-[var(--screen-muted)]">{detail}</div>
      </div>
      <div className="text-right text-[18px] font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function NarrativeStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="grid grid-cols-[30px_1fr] gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--screen-pill)] text-[12px] font-black text-[var(--screen-accent)]">
        {number}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-black text-[var(--screen-heading)]">{title}</div>
        <div className="mt-0.5 truncate text-[12px] text-[var(--screen-muted)]">{text}</div>
      </div>
    </div>
  );
}

function ScreenTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] px-3 py-2 text-[12px] text-[var(--screen-heading)] shadow-2xl">
      {label && <div className="mb-1 font-bold text-[var(--screen-heading)]">{label}</div>}
      <div className="space-y-1">
        {payload.map((item: any) => (
          <div key={`${item.name}-${item.dataKey}`} className="flex items-center justify-between gap-5">
            <span className="text-[var(--screen-muted)]">{item.name || item.dataKey}</span>
            <span className="font-black" style={{ color: item.color }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
