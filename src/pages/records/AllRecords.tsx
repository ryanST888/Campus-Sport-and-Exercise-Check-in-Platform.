import { type ReactNode, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Layers3,
  RotateCcw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { Header } from "../../components/ui/Header";
import {
  DUMMY_STUDENTS,
  type Record as SportRecord,
  type Student,
  useAppStore,
} from "../../store";
import {
  getCategoryName,
  getProjectIndicatorText,
  getStudentLabel,
  getTotalTimes,
  groupBy,
} from "../../lib/sportMetrics";

type ViewerLevel = "top" | "medium" | "basic" | "student";
type DrillLevel = "school" | "grade" | "class" | "student";

type ViewerProfile = {
  id: string;
  name: string;
  title: string;
  level: ViewerLevel;
  gradeScope?: string;
  classScopes?: string[];
  studentId?: string;
};

type DrillScope = {
  level: DrillLevel;
  grade?: string;
  classKey?: string;
  studentId?: string;
};

type DateNavOption = {
  value: string;
  label: string;
  weekday: string;
  countLabel: string;
};

type CompletionProgressItem = {
  name: string;
  value: number;
  helper: string;
};

type ProjectBarItem = {
  name: string;
  participants: number;
  completedTimes: number;
  reports: number;
  passRate: number;
};

const viewerProfiles: ViewerProfile[] = [
  {
    id: "principal",
    name: "校长/体育主管",
    title: "Top level",
    level: "top",
  },
  {
    id: "grade-director",
    name: "初一年级主任",
    title: "Medium level",
    level: "medium",
    gradeScope: "初一",
  },
  {
    id: "pe-teacher",
    name: "体育老师A",
    title: "Basic level",
    level: "basic",
    classScopes: ["初一1班", "初一2班", "初二1班"],
  },
  {
    id: "student",
    name: "张三",
    title: "Student",
    level: "student",
    studentId: "20260101",
  },
];

const chartColors = [
  "#4d7ec7",
  "#82c46c",
  "#f2c45b",
  "#df6b6b",
  "#77bfda",
  "#f0a05a",
  "#8a7bd6",
  "#62b798",
];

const today = format(new Date(), "yyyy-MM-dd");
const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getRecentDateOptions(): DateNavOption[] {
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - index);
    const value = format(date, "yyyy-MM-dd");
    const yesterday = new Date(baseDate);
    yesterday.setDate(baseDate.getDate() - 1);
    const yesterdayValue = format(yesterday, "yyyy-MM-dd");

    return {
      value,
      label:
        value === today
          ? "今天"
          : value === yesterdayValue
            ? "昨天"
            : format(date, "MM/dd"),
      weekday: weekdayLabels[date.getDay()],
      countLabel: format(date, "dd"),
    };
  });
}

function formatSelectedDate(value: string) {
  return value.replaceAll("-", "/");
}

function getAllowedStudents(viewer: ViewerProfile) {
  if (viewer.level === "top") return DUMMY_STUDENTS;

  if (viewer.level === "medium") {
    return DUMMY_STUDENTS.filter((student) => student.grade === viewer.gradeScope);
  }

  if (viewer.level === "basic") {
    const classScopes = new Set(viewer.classScopes || []);
    return DUMMY_STUDENTS.filter((student) => classScopes.has(getStudentLabel(student)));
  }

  return DUMMY_STUDENTS.filter((student) => student.id === viewer.studentId);
}

function getInitialScope(viewer: ViewerProfile): DrillScope {
  if (viewer.level === "medium") {
    return { level: "grade", grade: viewer.gradeScope };
  }

  if (viewer.level === "basic") {
    return { level: "school" };
  }

  if (viewer.level === "student") {
    return { level: "student", studentId: viewer.studentId };
  }

  return { level: "school" };
}

function getScopeStudents(scope: DrillScope, allowedStudents: Student[]) {
  if (scope.level === "grade") {
    return allowedStudents.filter((student) => student.grade === scope.grade);
  }

  if (scope.level === "class") {
    return allowedStudents.filter((student) => getStudentLabel(student) === scope.classKey);
  }

  if (scope.level === "student") {
    return allowedStudents.filter((student) => student.id === scope.studentId);
  }

  return allowedStudents;
}

function getScopeTitle(scope: DrillScope, viewer: ViewerProfile, students: Student[]) {
  if (scope.level === "grade") return `${scope.grade} dashboard`;
  if (scope.level === "class") return `${scope.classKey} dashboard`;
  if (scope.level === "student") return `${students[0]?.name || "学生"}个人 dashboard`;
  if (viewer.level === "basic") return "授权班级 dashboard";
  return "全校 dashboard";
}

function getScopeDescription(scope: DrillScope, viewer: ViewerProfile, students: Student[]) {
  if (scope.level === "school" && viewer.level === "top") {
    return "可见全校数据，可继续下钻到年级、班级、学生";
  }
  if (scope.level === "school" && viewer.level === "basic") {
    return `可见 ${Array.from(new Set(students.map(getStudentLabel))).join("、")}，授权班级由管理员配置`;
  }
  if (scope.level === "grade") return "当前图表已按该年级重新计算，可继续下钻到班级";
  if (scope.level === "class") return "当前图表已按该班级重新计算，可继续下钻到学生";
  return "当前图表仅按该学生个人记录计算";
}

function getParentScope(scope: DrillScope, viewer: ViewerProfile): DrillScope | null {
  if (viewer.level === "student") return null;
  if (scope.level === "student") {
    const student = DUMMY_STUDENTS.find((item) => item.id === scope.studentId);
    if (!student) return getInitialScope(viewer);
    return { level: "class", classKey: getStudentLabel(student), grade: student.grade };
  }
  if (scope.level === "class") {
    if (viewer.level === "basic") return { level: "school" };
    return { level: "grade", grade: scope.grade || scope.classKey?.slice(0, 2) };
  }
  if (scope.level === "grade" && viewer.level === "top") return { level: "school" };
  return null;
}

function getScopeCrumbs(scope: DrillScope, viewer: ViewerProfile, allowedStudents: Student[]) {
  const crumbs: Array<{ label: string; scope: DrillScope }> = [];

  if (viewer.level === "top") {
    crumbs.push({ label: "全校", scope: { level: "school" } });
  } else if (viewer.level === "basic") {
    crumbs.push({ label: "授权班级", scope: { level: "school" } });
  }

  if (scope.level === "grade" || scope.level === "class" || scope.level === "student") {
    const grade =
      scope.grade ||
      allowedStudents.find((student) => student.id === scope.studentId)?.grade;
    if (grade && (viewer.level === "top" || viewer.level === "medium")) {
      crumbs.push({ label: grade, scope: { level: "grade", grade } });
    }
  }

  if (scope.level === "class" || scope.level === "student") {
    const student = allowedStudents.find((item) => item.id === scope.studentId);
    const classKey = scope.classKey || (student ? getStudentLabel(student) : undefined);
    if (classKey) {
      crumbs.push({
        label: classKey,
        scope: {
          level: "class",
          classKey,
          grade: student?.grade || scope.grade || classKey.slice(0, 2),
        },
      });
    }
  }

  if (scope.level === "student") {
    const student = allowedStudents.find((item) => item.id === scope.studentId);
    if (student) crumbs.push({ label: student.name, scope });
  }

  if (viewer.level === "medium" && crumbs.length === 0) {
    crumbs.push({ label: viewer.gradeScope || "当前年级", scope });
  }

  if (viewer.level === "student" && crumbs.length === 0) {
    const student = allowedStudents[0];
    crumbs.push({ label: student?.name || "个人", scope });
  }

  return crumbs;
}

export function AllRecords() {
  const { records, projects, categories, invalidateRecord } = useAppStore();
  const [viewerId, setViewerId] = useState(viewerProfiles[0].id);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [dateMode, setDateMode] = useState<"day" | "all">("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [scope, setScope] = useState<DrillScope>(getInitialScope(viewerProfiles[0]));
  const [recordToInvalidate, setRecordToInvalidate] = useState<string | null>(null);
  const recentDateOptions = useMemo(() => getRecentDateOptions(), []);

  const viewer =
    viewerProfiles.find((profile) => profile.id === viewerId) || viewerProfiles[0];

  const allowedStudents = useMemo(() => getAllowedStudents(viewer), [viewer]);
  const scopeStudents = useMemo(
    () => getScopeStudents(scope, allowedStudents),
    [allowedStudents, scope],
  );
  const scopeStudentIds = useMemo(
    () => new Set(scopeStudents.map((student) => student.id)),
    [scopeStudents],
  );

  useEffect(() => {
    setScope(getInitialScope(viewer));
    setSelectedProjectId("all");
  }, [viewer]);

  const baseRecords = useMemo(
    () =>
      records
        .filter(
          (record) =>
            !record.isInvalid &&
            scopeStudentIds.has(record.studentId) &&
            (dateMode === "all" || record.date === selectedDate),
        )
        .slice()
        .sort(
          (a, b) =>
            new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
        ),
    [dateMode, records, scopeStudentIds, selectedDate],
  );

  const scopedRecords = useMemo(() => {
    if (selectedProjectId === "all") return baseRecords;
    return baseRecords.filter((record) => record.projectId === selectedProjectId);
  }, [baseRecords, selectedProjectId]);

  const dateRecordCounts = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => {
      if (record.isInvalid || !scopeStudentIds.has(record.studentId)) return;
      if (selectedProjectId !== "all" && record.projectId !== selectedProjectId) return;
      counts.set(record.date, (counts.get(record.date) || 0) + 1);
    });
    return counts;
  }, [records, scopeStudentIds, selectedProjectId]);

  const passedRecords = scopedRecords.filter((record) => record.isPassed);
  const completedTimes = getTotalTimes(passedRecords);
  const participantCount = new Set(scopedRecords.map((record) => record.studentId)).size;
  const notPassedCount = scopedRecords.filter((record) => !record.isPassed).length;
  const passRate =
    scopedRecords.length > 0
      ? Math.round((passedRecords.length / scopedRecords.length) * 100)
      : 0;
  const inactiveCount = Math.max(0, scopeStudents.length - participantCount);
  const participationRate =
    scopeStudents.length > 0
      ? Math.round((participantCount / scopeStudents.length) * 100)
      : 0;
  const completionTarget = Math.max(scopeStudents.length, completedTimes);
  const completionPercent =
    completionTarget > 0 ? Math.round((completedTimes / completionTarget) * 100) : 0;

  const projectOptions = useMemo(() => {
    const idsWithRecords = new Set(baseRecords.map((record) => record.projectId));
    return projects.filter((project) => {
      if (project.id === selectedProjectId) return true;
      return viewer.level === "top" && scope.level === "school"
        ? project.status === "open" || idsWithRecords.has(project.id)
        : idsWithRecords.has(project.id);
    });
  }, [baseRecords, projects, scope.level, selectedProjectId, viewer.level]);

  const drillOptions = useMemo(() => {
    if (viewer.level === "student") return [];

    if (scope.level === "school" && viewer.level === "top") {
      return Array.from(new Set<string>(allowedStudents.map((student) => student.grade))).map(
        (grade) => {
          const students = allowedStudents.filter((student) => student.grade === grade);
          return {
            label: grade,
            helper: `${students.length}人`,
            scope: { level: "grade", grade } satisfies DrillScope,
          };
        },
      );
    }

    if (scope.level === "school" && viewer.level === "basic") {
      return Array.from(new Set<string>(allowedStudents.map(getStudentLabel))).map(
        (classKey) => {
          const students = allowedStudents.filter(
            (student) => getStudentLabel(student) === classKey,
          );
          return {
            label: classKey,
            helper: `${students.length}人`,
            scope: {
              level: "class",
              classKey,
              grade: students[0]?.grade,
            } satisfies DrillScope,
          };
        },
      );
    }

    if (scope.level === "grade") {
      return Array.from(
        new Set<string>(
          allowedStudents
            .filter((student) => student.grade === scope.grade)
            .map(getStudentLabel),
        ),
      ).map((classKey) => {
        const students = allowedStudents.filter(
          (student) => getStudentLabel(student) === classKey,
        );
        return {
          label: classKey,
          helper: `${students.length}人`,
          scope: {
            level: "class",
            classKey,
            grade: scope.grade,
          } satisfies DrillScope,
        };
      });
    }

    if (scope.level === "class") {
      return allowedStudents
        .filter((student) => getStudentLabel(student) === scope.classKey)
        .map((student) => ({
          label: student.name,
          helper: student.id,
          scope: {
            level: "student",
            studentId: student.id,
            classKey: getStudentLabel(student),
            grade: student.grade,
          } satisfies DrillScope,
        }));
    }

    return [];
  }, [allowedStudents, scope, viewer.level]);

  const completionProgressData = useMemo(
    () => buildCompletionProgressData(scope, scopeStudents, scopedRecords, projects),
    [projects, scope, scopeStudents, scopedRecords],
  );
  const projectBarData = useMemo(
    () => buildProjectBarData(scopedRecords, projects),
    [projects, scopedRecords],
  );

  const confirmInvalidate = () => {
    if (!recordToInvalidate) return;
    invalidateRecord(recordToInvalidate);
    toast.success("记录已作废");
    setRecordToInvalidate(null);
  };

  const parentScope = getParentScope(scope, viewer);
  const crumbs = getScopeCrumbs(scope, viewer, allowedStudents);
  const title = getScopeTitle(scope, viewer, scopeStudents);
  const description = getScopeDescription(scope, viewer, scopeStudents);

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f5f8] pb-24">
      <Header title="记录" />

      <div className="space-y-4 p-4">
        <DateNavigator
          dateMode={dateMode}
          selectedDate={selectedDate}
          dates={recentDateOptions}
          recordCounts={dateRecordCounts}
          onSelectDate={(value) => {
            setSelectedDate(value);
            setDateMode("day");
          }}
          onToday={() => {
            setSelectedDate(today);
            setDateMode("day");
          }}
          onAll={() => setDateMode("all")}
        />

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium text-gray-500">
                当前登录视角
              </div>
              <h1 className="mt-1 text-[23px] font-bold leading-tight text-gray-950">
                {title}
              </h1>
              <p className="mt-1 text-[12px] leading-5 text-gray-500">
                {description}
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {viewerProfiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => setViewerId(profile.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-left text-[12px] font-semibold ${
                  viewer.id === profile.id
                    ? "bg-gray-950 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span className="block">{profile.name}</span>
                <span className="mt-0.5 block text-[10px] opacity-70">
                  {profile.title}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <RecordKpi label="可见记录" value={scopedRecords.length} />
            <ProgressKpi
              label="完成次数"
              value={completedTimes}
              percent={completionPercent}
            />
            <RecordKpi label="参与率" value={`${participationRate}%`} />
            <RecordKpi label="未参与" value={inactiveCount} />
          </div>

          {(inactiveCount > 0 || notPassedCount > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <InsightPill label="未达标记录" value={notPassedCount} tone="orange" />
              <InsightPill label="未参与学生" value={inactiveCount} tone="red" />
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <SectionLabel icon={<BarChart3 className="h-4 w-4" />} title="dashboard 数据" />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {crumbs.map((crumb, index) => (
              <button
                key={`${crumb.label}-${index}`}
                onClick={() => setScope(crumb.scope)}
                className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${
                  index === crumbs.length - 1
                    ? "bg-gray-950 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {crumb.label}
              </button>
            ))}
            {parentScope && (
              <button
                onClick={() => setScope(parentScope)}
                className="ml-auto flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[12px] font-semibold text-[#1677ff]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                返回上级
              </button>
            )}
          </div>

          {drillOptions.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {drillOptions.map((option) => (
                <button
                  key={`${option.scope.level}-${option.label}`}
                  onClick={() => {
                    setScope(option.scope);
                    setSelectedProjectId("all");
                  }}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-left active:border-[#1677ff] active:bg-blue-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] font-bold text-gray-900">
                      {option.label}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    {option.helper}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-4">
            <PassRateCircularChart
              value={passRate}
              passed={passedRecords.length}
              total={scopedRecords.length}
            />
            <CompletionProgressChart
              title={getCompletionProgressTitle(scope)}
              data={completionProgressData}
            />
            <ProjectBarChartBlock
              title="各项目参与与完成次数"
              data={projectBarData}
            />
          </div>
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <SectionLabel icon={<Layers3 className="h-4 w-4" />} title="项目切换" />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <FilterChip
              active={selectedProjectId === "all"}
              label="全部项目"
              onClick={() => setSelectedProjectId("all")}
            />
            {projectOptions.map((project) => (
              <FilterChip
                key={project.id}
                active={selectedProjectId === project.id}
                label={project.name}
                onClick={() => setSelectedProjectId(project.id)}
              />
            ))}
          </div>

          {selectedProjectId !== "all" && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-[12px] text-gray-600">
              {(() => {
                const project = projects.find((item) => item.id === selectedProjectId);
                if (!project) return null;
                return (
                  <div className="flex flex-col gap-1">
                    <span>分类：{getCategoryName(project, categories)}</span>
                    <span>指标：{getProjectIndicatorText(project)}</span>
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-gray-950">记录明细</h2>
            <span className="flex items-center gap-1 text-[12px] text-gray-500">
              {participantCount}人参与
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="space-y-3">
            {scopedRecords.length === 0 ? (
              <div className="rounded-lg border border-gray-100 bg-white py-14 text-center text-[14px] text-gray-400 shadow-sm">
                当前范围暂无记录
              </div>
            ) : (
              scopedRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  canInvalidate={viewer.level !== "student"}
                  onInvalidate={() => setRecordToInvalidate(record.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <ConfirmModal
        isOpen={!!recordToInvalidate}
        title="确认作废？"
        message="作废后该条记录不会再进入统计。"
        onConfirm={confirmInvalidate}
        onCancel={() => setRecordToInvalidate(null)}
      />
    </div>
  );
}

function buildCompletionProgressData(
  scope: DrillScope,
  students: Student[],
  records: SportRecord[],
  projects: Array<{ id: string; name: string }>,
): CompletionProgressItem[] {
  if (students.length === 0) return [];

  if (scope.level === "student") {
    const projectNames = new Map(projects.map((project) => [project.id, project.name]));
    return Object.entries(groupBy(records, (record) => record.projectId))
      .map(([projectId, projectRecords]) => ({
        name: projectNames.get(projectId) || projectId,
        value: getTotalTimes(projectRecords.filter((record) => record.isPassed)),
        helper: `${projectRecords.filter((record) => record.isPassed).length}/${projectRecords.length}条达标`,
      }))
      .filter((item) => item.value > 0 || item.helper !== "0/0条达标");
  }

  const keyGetter =
    scope.level === "school"
      ? (student: Student) => student.grade
      : scope.level === "grade"
        ? getStudentLabel
        : (student: Student) => student.name;

  const studentGroups = groupBy(students, keyGetter);
  return Object.entries(studentGroups).map(([name, groupStudents]) => {
    const ids = new Set(groupStudents.map((student) => student.id));
    const groupRecords = records.filter((record) => ids.has(record.studentId));
    const passedRecords = groupRecords.filter((record) => record.isPassed);
    const passedStudentCount = new Set(passedRecords.map((record) => record.studentId)).size;
    return {
      name,
      value: getTotalTimes(passedRecords),
      helper: `${passedStudentCount}/${groupStudents.length}人达标`,
    };
  });
}

function buildProjectBarData(
  records: SportRecord[],
  projects: Array<{ id: string; name: string }>,
): ProjectBarItem[] {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  return Object.entries(groupBy(records, (record) => record.projectId))
    .map(([projectId, projectRecords]) => {
      const passed = projectRecords.filter((record) => record.isPassed);
      const participants = new Set(projectRecords.map((record) => record.studentId)).size;
      return {
        name: projectNames.get(projectId) || projectId,
        participants,
        completedTimes: getTotalTimes(passed),
        reports: projectRecords.length,
        passRate:
          projectRecords.length > 0
            ? Math.round((passed.length / projectRecords.length) * 100)
            : 0,
      };
    })
    .filter((item) => item.reports > 0 || item.completedTimes > 0);
}

function getCompletionProgressTitle(scope: DrillScope) {
  if (scope.level === "school") return "各年级完成次数进度";
  if (scope.level === "grade") return "各班级完成次数进度";
  if (scope.level === "class") return "各学生完成次数进度";
  return "个人各项目完成次数";
}

function RecordCard({
  record,
  canInvalidate,
  onInvalidate,
}: {
  key?: string | number;
  record: SportRecord;
  canInvalidate: boolean;
  onInvalidate: () => void;
}) {
  const { projects, categories } = useAppStore();
  const project = projects.find((item) => item.id === record.projectId);
  const student = DUMMY_STUDENTS.find((item) => item.id === record.studentId);
  const unit = project?.indicators?.[0]?.unit || "";

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[16px] font-bold text-gray-950">
              {student?.name || record.studentId}
            </div>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
              {student ? getStudentLabel(student) : "未知班级"}
            </span>
          </div>
          <div className="mt-1 truncate text-[12px] text-gray-500">
            {project?.name || record.projectId} ·{" "}
            {project ? getCategoryName(project, categories) : "未分类"}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[20px] font-bold leading-none text-[#1677ff]">
            {record.achievedValue}
            <span className="ml-1 text-[12px] font-medium text-gray-400">
              {unit}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            +{record.totalTimes || (record.isPassed ? 1 : 0)} 次
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2 text-[12px] text-gray-500">
          {record.isPassed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-orange-500" />
          )}
          <span>{record.isPassed ? "已完成" : "未达标"}</span>
          <span>{format(new Date(record.datetime), "MM-dd HH:mm")}</span>
        </div>
        {canInvalidate && (
          <button
            onClick={onInvalidate}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 active:bg-red-50 active:text-red-500"
            aria-label="作废记录"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function PassRateCircularChart({
  value,
  passed,
  total,
}: {
  value: number;
  passed: number;
  total: number;
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const strokeOffset = circumference - (circumference * clampedValue) / 100;

  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="mb-3 text-[13px] font-bold text-gray-900">上报达标率</div>
      <div className="rounded-lg bg-white p-4">
        <div className="flex items-center gap-4">
          <div className="relative h-[118px] w-[118px] shrink-0">
            <svg className="h-full w-full" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#eef2f7"
                strokeWidth="12"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#1677ff"
                strokeLinecap="round"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[26px] font-bold leading-none text-gray-950">
                {clampedValue}%
              </div>
              <div className="mt-1 text-[10px] font-medium text-gray-400">达标率</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold text-gray-950">
              {passed}/{total} 条达标
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-blue-50 px-2.5 py-2">
                <div className="text-[18px] font-bold leading-none text-[#1677ff]">
                  {passed}
                </div>
                <div className="mt-1 text-[10px] font-medium text-blue-500">达标记录</div>
              </div>
              <div className="rounded-lg bg-orange-50 px-2.5 py-2">
                <div className="text-[18px] font-bold leading-none text-orange-600">
                  {Math.max(0, total - passed)}
                </div>
                <div className="mt-1 text-[10px] font-medium text-orange-500">未达标</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletionProgressChart({
  title,
  data,
}: {
  title: string;
  data: CompletionProgressItem[];
}) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[13px] font-bold text-gray-900">{title}</div>
        <div className="text-[11px] font-medium text-gray-400">按完成次数占比</div>
      </div>
      {data.length === 0 || total === 0 ? (
        <EmptyChart />
      ) : (
        <div className="space-y-3 rounded-lg bg-white p-3">
          {data.map((item, index) => {
            const percent = Math.round((item.value / maxValue) * 100);
            return (
              <div key={item.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-bold text-gray-900">
                      {item.name}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium text-gray-400">
                      {item.helper}
                    </div>
                  </div>
                  <div className="shrink-0 text-[13px] font-bold text-gray-950">
                    {item.value} 次
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: chartColors[index % chartColors.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectBarChartBlock({
  title,
  data,
}: {
  title: string;
  data: ProjectBarItem[];
}) {
  const total = data.reduce(
    (sum, item) => sum + item.participants + item.completedTimes,
    0,
  );

  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[13px] font-bold text-gray-900">{title}</div>
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-medium text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-[#4d7ec7]" />
            参与
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-[#62b798]" />
            完成
          </span>
        </div>
      </div>
      {data.length === 0 || total === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="h-[240px] min-w-0 rounded-lg bg-white px-1 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 8 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="name"
                  interval={0}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(value) =>
                    String(value).length > 5 ? `${String(value).slice(0, 5)}…` : value
                  }
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickLine={false}
                  width={34}
                />
                <Tooltip
                  formatter={(tooltipValue, name) => [
                    `${tooltipValue}`,
                    name === "participants" ? "参与人数" : "完成次数",
                  ]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    boxShadow: "0 10px 24px rgba(30,41,59,0.12)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="participants"
                  fill="#4d7ec7"
                  name="participants"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="completedTimes"
                  fill="#62b798"
                  name="completedTimes"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {data.map((item) => (
              <div
                key={item.name}
                className="min-w-0 rounded-lg bg-white px-2.5 py-2 text-[11px]"
              >
                <div className="truncate font-bold text-gray-900">{item.name}</div>
                <div className="mt-1 text-gray-500">
                  {item.participants}人参与 · {item.completedTimes}次完成
                </div>
                <div className="mt-0.5 font-semibold text-[#1677ff]">
                  达标率 {item.passRate}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-lg bg-white text-[13px] text-gray-400">
      当前范围暂无可视化数据
    </div>
  );
}

function DateNavigator({
  dateMode,
  selectedDate,
  dates,
  recordCounts,
  onSelectDate,
  onToday,
  onAll,
}: {
  dateMode: "day" | "all";
  selectedDate: string;
  dates: DateNavOption[];
  recordCounts: Map<string, number>;
  onSelectDate: (value: string) => void;
  onToday: () => void;
  onAll: () => void;
}) {
  return (
    <section className="sticky top-12 z-30 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[15px] font-bold text-gray-950">
            <CalendarDays className="h-4 w-4 text-[#1677ff]" />
            日期
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-gray-500">
            {dateMode === "all"
              ? "当前查看全部历史记录"
              : `${formatSelectedDate(selectedDate)} 当日记录`}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={onToday}
            className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${
              dateMode === "day" && selectedDate === today
                ? "bg-gray-950 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            今日
          </button>
          <button
            onClick={onAll}
            className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${
              dateMode === "all"
                ? "bg-gray-950 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            全部
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {dates.map((date) => {
          const active = dateMode === "day" && selectedDate === date.value;
          const count = recordCounts.get(date.value) || 0;

          return (
            <button
              key={date.value}
              onClick={() => onSelectDate(date.value)}
              className={`min-w-[68px] shrink-0 rounded-lg border px-2.5 py-2 text-center transition-colors ${
                active
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-gray-100 bg-gray-50 text-gray-700 active:border-[#1677ff] active:bg-blue-50"
              }`}
            >
              <span className="block text-[11px] font-semibold leading-none">
                {date.label}
              </span>
              <span className="mt-1 block text-[18px] font-bold leading-none">
                {date.countLabel}
              </span>
              <span
                className={`mt-1 block text-[10px] font-medium leading-none ${
                  active ? "text-white/70" : "text-gray-400"
                }`}
              >
                {date.weekday} · {count}条
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RecordKpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <div className="text-[20px] font-bold leading-none text-gray-950">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-medium text-gray-500">{label}</div>
    </div>
  );
}

function ProgressKpi({
  label,
  value,
  percent,
}: {
  label: string;
  value: number;
  percent: number;
}) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="flex items-end justify-center gap-1">
        <span className="text-[20px] font-bold leading-none text-gray-950">
          {value}
        </span>
        <span className="pb-0.5 text-[10px] font-medium text-gray-400">
          次
        </span>
      </div>
      <div className="mt-1 text-center text-[11px] font-medium text-gray-500">
        {label}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-[#1677ff]"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}

function InsightPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "orange" | "red";
}) {
  const toneClass = {
    orange: "bg-orange-50 text-orange-600",
    red: "bg-rose-50 text-rose-600",
  }[tone];

  return (
    <div className={`rounded-lg px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] font-medium opacity-80">{label}</div>
      <div className="mt-1 text-[18px] font-bold leading-none">{value}</div>
    </div>
  );
}

function SectionLabel({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff]">
        {icon}
      </div>
      <h2 className="text-[16px] font-bold text-gray-950">{title}</h2>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  key?: string | number;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold ${
        active ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}
