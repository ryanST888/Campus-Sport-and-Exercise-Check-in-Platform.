import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Bed,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Gauge,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Home,
  Layers3,
  Link2,
  Lock,
  Medal,
  School,
  ShieldCheck,
  Smile,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Header } from "../../components/ui/Header";
import {
  type Category,
  DUMMY_STUDENTS,
  type Project,
  type Record as SportRecord,
  type Student,
  useAppStore,
} from "../../store";
import {
  getCategoryName,
  getStudentLabel,
  getTotalTimes,
  groupBy,
} from "../../lib/sportMetrics";
import {
  calculateAcademicChangeIndex,
  calculateClassActivityIndex,
  calculateEmotionPressureIndex,
  calculateGradeSportsDevelopmentIndex,
  calculateHealthRiskIndex,
  calculateLearningLoadIndex,
  calculateSleepRecoveryIndex,
  calculateSportMotivationIndex,
  calculateSportsParticipationIndex,
  calculateStudentGrowthIndex,
  toPercent,
} from "../../lib/studentIndexMetrics";

type ViewerLevel = "top" | "medium" | "basic" | "student";
type DataScope = "school" | "grade" | "class" | "student";
type TrendPeriod = "term" | "month" | "week";

type ViewerProfile = {
  id: string;
  name: string;
  title: string;
  level: ViewerLevel;
  gradeScope?: string;
  classScopes?: string[];
  studentId?: string;
};

type MetricSource = "已接入" | "待接入" | "模型";

type TopMetric = {
  name: string;
  value: string | number;
  unit?: string;
  trend?: string;
  source: MetricSource;
};

type TopAnalyticsCategory = {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  score: number;
  scoreLabel: string;
  metrics: TopMetric[];
};

type CollectionCode = {
  code: string;
  name: string;
  detail: string;
};

type CategoryCollectionMethod = {
  title: string;
  method: string;
  detail: string;
};

type IndexFunctionGuide = {
  name: string;
  inputs: string;
  formula: string;
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

const scopeOptions: Array<{
  key: DataScope;
  label: string;
  title: string;
}> = [
  { key: "school", label: "全校数据", title: "全校汇总" },
  { key: "grade", label: "年级数据", title: "年级汇总" },
  { key: "class", label: "班级数据", title: "班级汇总" },
  { key: "student", label: "学生个人数据", title: "个人汇总" },
];

const trendOptions: Array<{
  key: TrendPeriod;
  label: string;
}> = [
  { key: "term", label: "学期" },
  { key: "month", label: "月" },
  { key: "week", label: "星期" },
];

const collectionCodes: CollectionCode[] = [
  {
    code: "A",
    name: "系统自动生成",
    detail: "打卡时间、项目、次数、达标率、趋势、上传和审核状态。",
  },
  {
    code: "B",
    name: "管理员/学校导入",
    detail: "学生档案、班级、成绩、课表、作业量、体测数据。",
  },
  {
    code: "C",
    name: "教师录入/评价",
    detail: "运动态度、课堂表现、请假、体育课占用、伤病记录。",
  },
  {
    code: "D",
    name: "学生轻量问卷",
    detail: "兴趣、疲劳、压力、睡眠、心情、运动后感受。",
  },
  {
    code: "E",
    name: "家长问卷",
    detail: "家庭支持、周末运动、补习、通勤、作息和场地条件。",
  },
  {
    code: "F",
    name: "设备/传感器",
    detail: "心率、步数、GPS、睡眠、配速、运动强度。",
  },
  {
    code: "G",
    name: "模型计算",
    detail: "指数、相关性、风险预警、趋势预测、综合成长评估。",
  },
];

const categoryCollectionMethods: CategoryCollectionMethod[] = [
  {
    title: "一、学生基础维度",
    method: "B 为主，C/E 补充",
    detail: "学校、年级、班级、姓名由学校导入；身高体重来自体测或教师录入；住宿、通勤、补习由家长问卷补充。",
  },
  {
    title: "二、运动参与度指标",
    method: "A 为主，C 补充",
    detail: "每日/每周/月运动次数、完成率、达标率、上传率和审核通过率由系统自动生成；请假和特殊缺席由教师确认。",
  },
  {
    title: "三、运动质量指标",
    method: "A/F 为主，D/C 补充",
    detail: "跑步用时、距离、次数来自打卡；心率、配速和强度来自设备；疲劳、热身、拉伸和伤病由问卷或教师记录。",
  },
  {
    title: "四、作业与学习压力指标",
    method: "B/D/E 采集",
    detail: "作业量、完成率、迟交来自作业系统；实际完成时间、难度和压力由学生轻量问卷；补习和娱乐时间由家长或学生补充。",
  },
  {
    title: "五、运动积极度指标",
    method: "A/D/C/E + G",
    detail: "主动预约、自愿选择、挑战次数来自系统行为；兴趣、成就感、满意度来自学生问卷；老师和家长提供态度与支持度评价。",
  },
  {
    title: "六、学业成绩指标",
    method: "B 为主，C/D 补充",
    detail: "总分、单科、排名、月考、期中、期末、小测和作业正确率由教务或学习平台导入；课堂表现和学习效率由教师/学生补充。",
  },
  {
    title: "七、睡眠与恢复指标",
    method: "D/F + G",
    detail: "入睡、起床、睡眠时长和质量由学生填报或手环采集；运动后睡眠改善、作业压缩睡眠由模型关联计算。",
  },
  {
    title: "八、心理与情绪指标",
    method: "D 为主，G 预警",
    detail: "压力、焦虑、心情、自信、疲惫、社交和体育课感受通过低敏轻问卷收集；低动力趋势只做聚合预警。",
  },
  {
    title: "九、家庭与环境指标",
    method: "E 为主，D 补充",
    detail: "家长支持、家庭运动习惯、作息、周末运动、场地装备、体育培训和体育中考重视度由家长问卷采集。",
  },
  {
    title: "十、学校与班级环境指标",
    method: "B/C/D + 外部数据",
    detail: "班级作业量、课表和体育课占用来自学校系统或教师记录；运动氛围来自学生/教师反馈；天气和空气质量接外部数据。",
  },
  {
    title: "十一、关系型指标",
    method: "G 模型计算",
    detail: "作业量与运动、睡眠与积极度、运动与成绩、考试前运动下降、家长支持与持续运动等关系由多源数据关联分析得出。",
  },
  {
    title: "十二、高级指数",
    method: "G 综合计算",
    detail: "运动参与、积极度、学习负担、睡眠恢复、学业变化、情绪压力、健康风险、班级活跃、年级发展和综合成长指数由模型计算。",
  },
];

const indexFunctionGuides: IndexFunctionGuide[] = [
  {
    name: "calculateSportsParticipationIndex",
    inputs: "参与率、达标率、月运动次数、连续运动天数、缺席率",
    formula: "35%参与率 + 25%达标率 + 20%月频次 + 10%连续性 + 10%低缺席",
  },
  {
    name: "calculateSportMotivationIndex",
    inputs: "主动选择率、主动预约率、挑战率、兴趣、成就感、最低完成比例",
    formula: "行为主动性 + 问卷兴趣/成就感 + 挑战意愿 - 只做最低要求",
  },
  {
    name: "calculateLearningLoadIndex",
    inputs: "作业时长、补习时长、迟交率、作业压力、睡眠压缩率",
    formula: "负担越高分越高，用于识别学习压力风险",
  },
  {
    name: "calculateSleepRecoveryIndex",
    inputs: "睡眠时长、睡眠质量、白天困倦、入睡时间、运动后恢复",
    formula: "接近8小时睡眠 + 高质量 + 低困倦 + 不晚睡 + 恢复改善",
  },
  {
    name: "calculateAcademicChangeIndex",
    inputs: "总分变化、排名提升、作业正确率、小测变化、注意力",
    formula: "成绩趋势 + 排名趋势 + 学习过程质量",
  },
  {
    name: "calculateEmotionPressureIndex",
    inputs: "学习压力、考试焦虑、疲惫、心情、自信",
    formula: "压力越高分越高，心情和自信使用反向计分",
  },
  {
    name: "calculateHealthRiskIndex",
    inputs: "BMI风险、伤病率、运动限制、高疲劳、心率异常",
    formula: "健康风险越高分越高，用于管理层预警",
  },
  {
    name: "calculateClassActivityIndex",
    inputs: "班级参与率、集体活动次数、班级氛围、连续性、项目覆盖",
    formula: "班级层面的运动活跃与组织健康度",
  },
  {
    name: "calculateGradeSportsDevelopmentIndex",
    inputs: "年级参与率、达标率、项目覆盖、提升率、班级均衡度",
    formula: "年级体育发展水平和均衡程度",
  },
  {
    name: "calculateStudentGrowthIndex",
    inputs: "所有核心指数",
    formula: "正向指数加权 + 学习负担/压力/健康风险反向计分",
  },
  {
    name: "calculatePearsonCorrelation",
    inputs: "两组时间序列，例如每日作业量与每日运动次数",
    formula: "输出 -1 到 1 的相关系数，用于关系型指标",
  },
];

function getAllowedScopes(viewer: ViewerProfile): DataScope[] {
  if (viewer.level === "top") return ["school", "grade", "class", "student"];
  if (viewer.level === "medium") return ["grade", "class", "student"];
  if (viewer.level === "basic") return ["class", "student"];
  return ["student"];
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

function getDefaultScope(viewer: ViewerProfile): DataScope {
  return getAllowedScopes(viewer)[0];
}

function getScopeTitle(scope: DataScope, targetLabel: string) {
  if (scope === "school") return "从全校下钻到年级、班级和项目";
  if (scope === "grade") return `${targetLabel} 年级统计`;
  if (scope === "class") return `${targetLabel} 班级统计`;
  return `${targetLabel} 个人统计`;
}

export function StatsOverview() {
  const navigate = useNavigate();
  const { records, projects, categories, statsMonth, setStatsMonth } = useAppStore();
  const [viewerId, setViewerId] = useState(viewerProfiles[0].id);
  const viewer =
    viewerProfiles.find((profile) => profile.id === viewerId) || viewerProfiles[0];
  const allowedScopes = getAllowedScopes(viewer);
  const [dataScope, setDataScope] = useState<DataScope>(getDefaultScope(viewer));
  const allowedStudents = useMemo(() => getAllowedStudents(viewer), [viewer]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("month");

  const grades = useMemo(
    () => Array.from(new Set<string>(allowedStudents.map((student) => student.grade))),
    [allowedStudents],
  );

  const classKeys = useMemo(
    () => Array.from(new Set<string>(allowedStudents.map(getStudentLabel))),
    [allowedStudents],
  );

  useEffect(() => {
    const defaultScope = getDefaultScope(viewer);
    setDataScope(defaultScope);
    setSelectedGrade(viewer.gradeScope || grades[0] || "");
    setSelectedClassKey(classKeys[0] || "");
    setSelectedStudentId(viewer.studentId || allowedStudents[0]?.id || "");
  }, [viewerId, viewer, grades, classKeys, allowedStudents]);

  useEffect(() => {
    if (!allowedScopes.includes(dataScope)) {
      setDataScope(getDefaultScope(viewer));
    }
  }, [allowedScopes, dataScope, viewer]);

  useEffect(() => {
    if (dataScope === "grade" && !selectedGrade) {
      setSelectedGrade(viewer.gradeScope || grades[0] || "");
    }
    if (dataScope === "class" && !selectedClassKey) {
      setSelectedClassKey(classKeys[0] || "");
    }
    if (dataScope === "student" && !selectedStudentId) {
      setSelectedStudentId(viewer.studentId || allowedStudents[0]?.id || "");
    }
  }, [
    allowedStudents,
    classKeys,
    dataScope,
    grades,
    selectedClassKey,
    selectedGrade,
    selectedStudentId,
    viewer,
  ]);

  const scopedStudents = useMemo(() => {
    if (dataScope === "school") return allowedStudents;
    if (dataScope === "grade") {
      const grade = viewer.level === "medium" ? viewer.gradeScope : selectedGrade;
      return allowedStudents.filter((student) => student.grade === grade);
    }
    if (dataScope === "class") {
      return allowedStudents.filter(
        (student) => getStudentLabel(student) === selectedClassKey,
      );
    }
    return allowedStudents.filter((student) => student.id === selectedStudentId);
  }, [allowedStudents, dataScope, selectedClassKey, selectedGrade, selectedStudentId, viewer]);

  const scopedStudentIds = useMemo(
    () => new Set(scopedStudents.map((student) => student.id)),
    [scopedStudents],
  );

  const monthRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          !record.isInvalid &&
          record.datetime.startsWith(statsMonth) &&
          scopedStudentIds.has(record.studentId),
      ),
    [records, scopedStudentIds, statsMonth],
  );

  const schoolMonthRecords = useMemo(
    () =>
      records.filter(
        (record) => !record.isInvalid && record.datetime.startsWith(statsMonth),
      ),
    [records, statsMonth],
  );

  const passedRecords = monthRecords.filter((record) => record.isPassed);
  const activeProjects = projects.filter((project) => project.status === "open");
  const participantCount = new Set(monthRecords.map((record) => record.studentId)).size;
  const completionRate =
    scopedStudents.length > 0
      ? Math.round((participantCount / scopedStudents.length) * 100)
      : 0;
  const totalTimes = getTotalTimes(passedRecords);
  const trendData = useMemo(
    () =>
      buildTrendData({
        records,
        scopedStudentIds,
        statsMonth,
        trendPeriod,
      }),
    [records, scopedStudentIds, statsMonth, trendPeriod],
  );
  const targetLabel =
    dataScope === "school"
      ? "全校"
      : dataScope === "grade"
        ? viewer.level === "medium"
          ? viewer.gradeScope || "年级"
          : selectedGrade || "年级"
        : dataScope === "class"
          ? selectedClassKey || "班级"
          : scopedStudents[0]?.name || "学生";

  const categoryRows = categories.map((category) => {
    const categoryProjectIds = new Set(
      projects
        .filter((project) => project.categoryId === category.id)
        .map((project) => project.id),
    );
    const categoryRecords = monthRecords.filter((record) =>
      categoryProjectIds.has(record.projectId),
    );
    const categoryPassed = categoryRecords.filter((record) => record.isPassed);
    return {
      name: category.name,
      totalTimes: getTotalTimes(categoryPassed),
      participants: new Set(categoryRecords.map((record) => record.studentId)).size,
      target: category.monthlyRules?.[statsMonth] ?? category.targetCompletions,
    };
  });

  const gradeRows = grades.map((grade) => {
    const gradeStudents = allowedStudents.filter((student) => student.grade === grade);
    return buildGroupRow(grade, gradeStudents, monthRecords, passedRecords);
  });

  const classRows = Object.entries(groupBy(scopedStudents, getStudentLabel))
    .map(([className, students]) =>
      buildGroupRow(className, students, monthRecords, passedRecords),
    )
    .sort((a, b) => b.rate - a.rate || b.totalTimes - a.totalTimes);

  const studentRows = scopedStudents
    .map((student) => {
      const studentRecords = monthRecords.filter(
        (record) => record.studentId === student.id,
      );
      const studentPassed = studentRecords.filter((record) => record.isPassed);
      return {
        id: student.id,
        name: student.name,
        className: getStudentLabel(student),
        records: studentRecords.length,
        totalTimes: getTotalTimes(studentPassed),
        rate: studentRecords.length > 0 ? 100 : 0,
      };
    })
    .sort((a, b) => b.totalTimes - a.totalTimes || b.records - a.records);

  const projectRows = activeProjects
    .map((project) => {
      const projectRecords = monthRecords.filter(
        (record) => record.projectId === project.id,
      );
      const projectPassed = projectRecords.filter((record) => record.isPassed);
      return {
        id: project.id,
        name: project.name,
        category: getCategoryName(project, categories),
        totalTimes: getTotalTimes(projectPassed),
        participants: new Set(projectRecords.map((record) => record.studentId)).size,
      };
    })
    .filter((project) => dataScope === "school" || project.totalTimes > 0 || project.participants > 0)
    .sort((a, b) => b.totalTimes - a.totalTimes);

  const maxCategoryTimes = Math.max(1, ...categoryRows.map((item) => item.totalTimes));
  const drillRows =
    dataScope === "school"
      ? gradeRows
      : dataScope === "grade"
        ? classRows
        : dataScope === "class"
          ? studentRows
          : projectRows;

  const topLevelAnalytics = useMemo(
    () =>
      buildTopLevelAnalytics({
        students: DUMMY_STUDENTS,
        projects: activeProjects,
        records: schoolMonthRecords,
        categories,
        statsMonth,
      }),
    [activeProjects, categories, schoolMonthRecords, statsMonth],
  );
  const topLevelMetricCount = topLevelAnalytics.reduce(
    (sum, category) => sum + category.metrics.length,
    0,
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f5f8] pb-24">
      <Header title="统计" showBack={false} />

      <div className="space-y-4 p-4">
        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium text-gray-500">
                当前登录视角
              </div>
              <h1 className="mt-1 text-[23px] font-bold leading-tight text-gray-950">
                {viewer.name}
              </h1>
              <p className="mt-1 text-[12px] leading-5 text-gray-500">
                {viewer.title} · 可见 {allowedStudents.length} 名学生的统计数据
              </p>
            </div>
            <input
              type="month"
              value={statsMonth}
              onChange={(event) => setStatsMonth(event.target.value)}
              className="h-9 shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 text-[12px] font-medium text-gray-700 outline-none focus:border-[#1677ff]"
            />
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
        </section>

        {viewer.level === "top" && (
          <TopLevelAnalyticsPanel
            categories={topLevelAnalytics}
            metricCount={topLevelMetricCount}
            statsMonth={statsMonth}
          />
        )}

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <SectionTitle
            icon={<ShieldCheck className="h-4 w-4" />}
            title="数据层级"
            aside="按权限启用"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {scopeOptions.map((option) => {
              const allowed = allowedScopes.includes(option.key);
              return (
                <button
                  key={option.key}
                  disabled={!allowed}
                  onClick={() => allowed && setDataScope(option.key)}
                  className={`flex min-h-[50px] items-center justify-between rounded-lg border px-3 py-2 text-left ${
                    dataScope === option.key
                      ? "border-[#1677ff] bg-blue-50 text-[#1677ff]"
                      : allowed
                        ? "border-gray-100 bg-gray-50 text-gray-700"
                        : "border-gray-100 bg-gray-50 text-gray-300"
                  }`}
                >
                  <span className="text-[13px] font-bold">{option.label}</span>
                  {!allowed && <Lock className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>

          {dataScope === "grade" && viewer.level === "top" && (
            <SelectorRow
              label="选择年级"
              items={grades}
              value={selectedGrade}
              onChange={setSelectedGrade}
            />
          )}

          {dataScope === "class" && (
            <SelectorRow
              label="选择班级"
              items={classKeys}
              value={selectedClassKey}
              onChange={setSelectedClassKey}
            />
          )}

          {dataScope === "student" && viewer.level !== "student" && (
            <SelectorRow
              label="选择学生"
              items={allowedStudents.map((student) => student.id)}
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              getLabel={(studentId) =>
                allowedStudents.find((student) => student.id === studentId)?.name || studentId
              }
            />
          )}
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium text-gray-500">
                {scopeOptions.find((option) => option.key === dataScope)?.title}
              </div>
              <h2 className="mt-1 text-[22px] font-bold leading-tight text-gray-950">
                {getScopeTitle(dataScope, targetLabel || "当前范围")}
              </h2>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff]">
              {dataScope === "student" ? (
                <UserRound className="h-5 w-5" />
              ) : dataScope === "class" ? (
                <Users className="h-5 w-5" />
              ) : dataScope === "grade" ? (
                <GraduationCap className="h-5 w-5" />
              ) : (
                <BarChart3 className="h-5 w-5" />
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <KpiCard
              icon={<ClipboardCheck className="h-4 w-4" />}
              label="有效记录"
              value={monthRecords.length}
              unit="条"
              tone="blue"
            />
            <KpiCard
              icon={<Users className="h-4 w-4" />}
              label="参与学生"
              value={participantCount}
              unit="人"
              tone="green"
            />
            <KpiCard
              icon={<Target className="h-4 w-4" />}
              label="完成次数"
              value={totalTimes}
              unit="次"
              tone="amber"
            />
            <KpiCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="参与率"
              value={completionRate}
              unit="%"
              tone="rose"
            />
          </div>
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <SectionTitle
            icon={<TrendingUp className="h-4 w-4" />}
            title="趋势对比"
            aside={targetLabel || "当前范围"}
          />

          <div className="mt-3 flex rounded-lg bg-gray-100 p-1">
            {trendOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setTrendPeriod(option.key)}
                className={`h-8 flex-1 rounded-md text-[13px] font-semibold ${
                  trendPeriod === option.key
                    ? "bg-white text-[#1677ff] shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 h-[232px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#eef2f7"
                  strokeDasharray="3 7"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tick={{ fill: "#8a93a3", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: "#c2c8d0", fontSize: 11 }}
                  width={34}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${value}${name === "participants" ? "人" : name === "totalTimes" ? "次" : "条"}`,
                    name === "participants"
                      ? "参与学生"
                      : name === "totalTimes"
                        ? "完成次数"
                        : "有效记录",
                  ]}
                  labelFormatter={(label) => `时间：${label}`}
                  contentStyle={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    boxShadow: "0 10px 24px rgba(30,41,59,0.12)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalTimes"
                  name="完成次数"
                  stroke="#1677ff"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#ffffff", stroke: "#1677ff", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="participants"
                  name="参与学生"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#ffffff", stroke: "#10b981", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="records"
                  name="有效记录"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[12px] text-gray-500">
            <LegendDot color="#1677ff" label="完成次数" />
            <LegendDot color="#10b981" label="参与学生" />
            <LegendDot color="#f59e0b" label="有效记录" />
          </div>
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <SectionTitle
            icon={<Layers3 className="h-4 w-4" />}
            title="分类统计"
            aside="完成次数"
          />
          <div className="mt-4 space-y-3">
            {categoryRows.map((item) => (
              <ProgressRow
                key={item.name}
                label={item.name}
                value={item.totalTimes}
                helper={`${item.participants}人参与 / 目标 ${item.target}次`}
                max={maxCategoryTimes}
              />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <SectionTitle
            icon={<BarChart3 className="h-4 w-4" />}
            title={
              dataScope === "school"
                ? "年级数据"
                : dataScope === "grade"
                  ? "班级数据"
                  : dataScope === "class"
                    ? "学生数据"
                    : "个人项目"
            }
            aside="当前层级"
          />
          <div className="mt-4 space-y-3">
            {drillRows.length === 0 ? (
              <div className="rounded-lg bg-gray-50 py-10 text-center text-[13px] text-gray-400">
                当前范围暂无统计数据
              </div>
            ) : (
              drillRows.map((row, index) => (
                <DrillRow
                  key={row.id || row.name}
                  row={row}
                  rank={index + 1}
                  scope={dataScope}
                />
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <SectionTitle
              icon={<Activity className="h-4 w-4" />}
              title="项目数据"
              aside="项目维度"
            />
            <button
              onClick={() => navigate("/stats/projects")}
              className="flex items-center gap-1 text-[13px] font-medium text-[#1677ff]"
            >
              更多
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {projectRows.length === 0 ? (
              <div className="rounded-lg bg-gray-50 py-8 text-center text-[13px] text-gray-400">
                当前范围暂无项目数据
              </div>
            ) : (
              projectRows.slice(0, 8).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/stats/projects/${project.id}`)}
                  className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-3 text-left active:bg-gray-100"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold text-gray-900">
                      {project.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      {project.category} · {project.participants}人参与
                    </div>
                  </div>
                  <div className="shrink-0 text-[15px] font-bold text-[#1677ff]">
                    {project.totalTimes}次
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function buildTopLevelAnalytics({
  students,
  projects,
  records,
  categories,
  statsMonth,
}: {
  students: Student[];
  projects: Project[];
  records: SportRecord[];
  categories: Category[];
  statsMonth: string;
}): TopAnalyticsCategory[] {
  const passedRecords = records.filter((record) => record.isPassed);
  const participantCount = new Set(records.map((record) => record.studentId)).size;
  const gradeCount = new Set(students.map((student) => student.grade)).size;
  const classCount = new Set(students.map(getStudentLabel)).size;
  const totalTimes = getTotalTimes(passedRecords);
  const participationRate = toPercent(participantCount, students.length);
  const passRate = toPercent(passedRecords.length, records.length);
  const avgDurationMinutes =
    records.length > 0
      ? Math.round(
          records.reduce((sum, record) => sum + record.durationSeconds, 0) /
            records.length /
            60,
        )
      : 0;
  const projectTypeCount = new Set(projects.map((project) => project.type)).size;
  const schoolMonthLabel = getMonthLabel(statsMonth);
  const averageMonthlyExerciseTimes =
    students.length > 0 ? Number((totalTimes / students.length).toFixed(1)) : 0;
  const sportsParticipationIndex = calculateSportsParticipationIndex({
    participationRate,
    passRate,
    monthlyExerciseTimes: averageMonthlyExerciseTimes,
    continuityDays: 5.6,
    absenceRate: 18,
  });
  const sportMotivationIndex = calculateSportMotivationIndex({
    activeChoiceRate: 68,
    activeBookingRate: 54,
    challengeRate: 42,
    interestScore: 7.1,
    achievementScore: 7.6,
    minimumOnlyRate: 31,
  });
  const learningLoadIndex = calculateLearningLoadIndex({
    homeworkMinutes: 151,
    tutoringHoursPerWeek: 5.2,
    lateHomeworkRate: 21,
    homeworkPressureScore: 7.2,
    sleepCompressionRate: 37,
  });
  const sleepRecoveryIndex = calculateSleepRecoveryIndex({
    sleepHours: 7.1,
    sleepQualityScore: 6.6,
    daytimeSleepinessScore: 5.9,
    bedtimeHour: 23.12,
    recoveryImprovementRate: 13,
  });
  const academicChangeIndex = calculateAcademicChangeIndex({
    totalScoreDelta: 8.5,
    rankImprovement: 15,
    homeworkAccuracyRate: 86,
    quizScoreDelta: 4,
    attentionScore: 7.4,
  });
  const emotionPressureIndex = calculateEmotionPressureIndex({
    stressScore: 7.4,
    examAnxietyScore: 6.9,
    fatigueScore: 6.2,
    moodScore: 6.8,
    confidenceScore: 7,
  });
  const healthRiskIndex = calculateHealthRiskIndex({
    bmiRiskRate: 11,
    injuryRate: 8,
    restrictedRate: 7,
    highFatigueRate: 18,
    abnormalHeartRateRate: 9,
  });
  const classActivityIndex = calculateClassActivityIndex({
    participationRate,
    groupActivityTimes: 6,
    classAtmosphereScore: 7.6,
    continuityDays: 5.6,
    projectCoverageRate: 82,
  });
  const gradeDevelopmentIndex = calculateGradeSportsDevelopmentIndex({
    participationRate,
    passRate,
    projectCoverageRate: 84,
    improvementRate: 73,
    classBalanceRate: 78,
  });
  const growthIndex = calculateStudentGrowthIndex({
    sportsParticipationIndex,
    sportMotivationIndex,
    learningLoadIndex,
    sleepRecoveryIndex,
    academicChangeIndex,
    emotionPressureIndex,
    healthRiskIndex,
    classActivityIndex,
    gradeDevelopmentIndex,
  });

  return [
    {
      id: "student-base",
      title: "一、学生基础维度",
      subtitle: "身份、身体基础、通勤和补习背景",
      icon: <Users className="h-4 w-4" />,
      score: 92,
      scoreLabel: "档案完整度",
      metrics: [
        metric("学校", "示范中学", "", "", "待接入"),
        metric("年级数", gradeCount, "个", "", "已接入"),
        metric("班级数", classCount, "个", "", "已接入"),
        metric("学生数", students.length, "人", "", "已接入"),
        metric("性别结构", "男52 / 女48", "%", "", "待接入"),
        metric("平均年龄", 14.2, "岁", "", "待接入"),
        metric("平均身高", 164.8, "cm", "+0.6", "待接入"),
        metric("平均体重", 54.6, "kg", "+0.4", "待接入"),
        metric("平均BMI", 20.1, "", "正常", "待接入"),
        metric("住宿学生", 36, "%", "", "待接入"),
        metric("体育特长生", 4, "人", "", "待接入"),
        metric("运动限制/伤病/哮喘", 7, "人", "需关注", "待接入"),
        metric("家庭到校距离", 3.8, "km", "", "待接入"),
        metric("平均通勤时间", 24, "分钟", "", "待接入"),
        metric("校外补习参与", 61, "%", "", "待接入"),
      ],
    },
    {
      id: "sport-participation",
      title: "二、运动参与度指标",
      subtitle: "频次、持续性、达标和审核闭环",
      icon: <Dumbbell className="h-4 w-4" />,
      score: sportsParticipationIndex,
      scoreLabel: "参与指数",
      metrics: [
        metric("每日参加运动", participantCount, "人", schoolMonthLabel, "已接入"),
        metric("每周运动次数", 3.2, "次/人", "+0.4", "模型"),
        metric("每月运动次数", totalTimes, "次", "", "已接入"),
        metric("每次运动时长", avgDurationMinutes || 28, "分钟", "", "已接入"),
        metric("项目分类数", categories.length, "类", "", "已接入"),
        metric("运动项目类型", projectTypeCount, "类", "", "已接入"),
        metric("主动参加次数", 68, "%", "+6%", "模型"),
        metric("被动完成次数", 24, "%", "-3%", "模型"),
        metric("缺席次数", 18, "次", "-5", "待接入"),
        metric("连续运动天数", 5.6, "天", "+1.1", "模型"),
        metric("中断天数", 2.1, "天", "-0.8", "模型"),
        metric("项目完成率", participationRate, "%", "", "已接入"),
        metric("达标率", passRate, "%", "", "已接入"),
        metric("迟交/补录次数", 9, "次", "", "待接入"),
        metric("照片/视频上传率", 86, "%", "", "待接入"),
        metric("老师审核通过率", 94, "%", "", "待接入"),
      ],
    },
    {
      id: "sport-quality",
      title: "三、运动质量指标",
      subtitle: "强度、恢复、技术表现和伤病风险",
      icon: <Gauge className="h-4 w-4" />,
      score: 76,
      scoreLabel: "运动质量",
      metrics: [
        metric("跑步用时", 72, "秒", "-3.2", "已接入"),
        metric("平均配速", "5'42\"", "/km", "-0'18\"", "模型"),
        metric("平均心率", 148, "bpm", "", "待接入"),
        metric("恢复心率", 96, "bpm", "3分钟后", "待接入"),
        metric("运动强度", "中高", "", "", "模型"),
        metric("疲劳程度", 5.8, "/10", "", "待接入"),
        metric("有效强度达成率", 72, "%", "+5%", "待接入"),
        metric("热身完成率", 81, "%", "", "待接入"),
        metric("拉伸完成率", 63, "%", "", "待接入"),
        metric("运动后主观感受", 7.4, "/10", "", "待接入"),
        metric("运动后精神状态", 7.1, "/10", "+0.6", "待接入"),
        metric("运动后学习专注度", 6.9, "/10", "+0.4", "待接入"),
        metric("伤病发生次数", 3, "次", "低", "待接入"),
      ],
    },
    {
      id: "homework-pressure",
      title: "四、作业与学习压力指标",
      subtitle: "作业量、补习、熬夜和压力负荷",
      icon: <BookOpen className="h-4 w-4" />,
      score: learningLoadIndex,
      scoreLabel: "学习负担",
      metrics: [
        metric("每日作业总量", 142, "分钟", "+18", "待接入"),
        metric("各科作业量", "语32/数45/英38/理27", "分钟", "", "待接入"),
        metric("预计完成时间", 128, "分钟", "", "待接入"),
        metric("实际完成时间", 151, "分钟", "+23", "待接入"),
        metric("作业完成率", 91, "%", "", "待接入"),
        metric("延迟提交次数", 21, "次", "+4", "待接入"),
        metric("作业难度自评", 6.8, "/10", "", "待接入"),
        metric("作业压力自评", 7.2, "/10", "", "待接入"),
        metric("晚上完成作业时间", "22:18", "", "", "待接入"),
        metric("熬夜完成作业", 28, "%", "+7%", "待接入"),
        metric("考试周/非考试周", "月考周", "", "", "待接入"),
        metric("周末作业量", 4.6, "小时", "", "待接入"),
        metric("校外补习时长", 5.2, "小时/周", "", "待接入"),
        metric("自习时间", 68, "分钟/日", "", "待接入"),
        metric("手机/娱乐时间", 46, "分钟/日", "", "待接入"),
      ],
    },
    {
      id: "sport-motivation",
      title: "五、运动积极度指标",
      subtitle: "主动性、兴趣、挑战意愿和支持系统",
      icon: <Medal className="h-4 w-4" />,
      score: sportMotivationIndex,
      scoreLabel: "积极度指数",
      metrics: [
        metric("自愿选择运动", 64, "%", "+8%", "待接入"),
        metric("主动预约项目", 38, "次", "+11", "待接入"),
        metric("集体运动意愿", 7.3, "/10", "", "待接入"),
        metric("挑战更高目标意愿", 42, "%", "+5%", "待接入"),
        metric("请假频率", 0.6, "次/人", "-0.2", "待接入"),
        metric("只完成最低要求", 31, "%", "-4%", "模型"),
        metric("运动兴趣自评", 7.1, "/10", "", "待接入"),
        metric("老师评价态度", 8.0, "/10", "", "待接入"),
        metric("同伴影响程度", 6.7, "/10", "", "待接入"),
        metric("家长支持程度", 6.9, "/10", "", "待接入"),
        metric("运动后成就感", 7.6, "/10", "+0.5", "待接入"),
        metric("体育课满意度", 7.8, "/10", "", "待接入"),
      ],
    },
    {
      id: "academic",
      title: "六、学业成绩指标",
      subtitle: "总分、排名、单科、小测和课堂状态",
      icon: <GraduationCap className="h-4 w-4" />,
      score: academicChangeIndex,
      scoreLabel: "学业变化",
      metrics: [
        metric("总分", 612, "分", "+8.5", "待接入"),
        metric("班级排名", "12 → 10", "名", "上升2", "待接入"),
        metric("年级排名", "186 → 171", "名", "上升15", "待接入"),
        metric("语文成绩变化", "+3.0", "分", "", "待接入"),
        metric("数学成绩变化", "+5.5", "分", "", "待接入"),
        metric("英语成绩变化", "+2.0", "分", "", "待接入"),
        metric("物理成绩变化", "-1.5", "分", "", "待接入"),
        metric("化学成绩变化", "+1.0", "分", "", "待接入"),
        metric("月考成绩", 608, "分", "+6", "待接入"),
        metric("期中成绩", 612, "分", "+9", "待接入"),
        metric("期末预测", 618, "分", "+6", "模型"),
        metric("作业正确率", 86, "%", "+3%", "待接入"),
        metric("小测成绩", 82, "分", "+4", "待接入"),
        metric("课堂表现", 7.9, "/10", "", "待接入"),
        metric("缺课次数", 2, "次", "", "待接入"),
        metric("注意力评价", 7.4, "/10", "+0.3", "待接入"),
        metric("学习效率自评", 6.8, "/10", "", "待接入"),
      ],
    },
    {
      id: "sleep-recovery",
      title: "七、睡眠与恢复指标",
      subtitle: "睡眠时长、质量、困倦和运动后的恢复",
      icon: <Bed className="h-4 w-4" />,
      score: sleepRecoveryIndex,
      scoreLabel: "恢复指数",
      metrics: [
        metric("入睡时间", "23:07", "", "+18分钟", "待接入"),
        metric("起床时间", "06:31", "", "", "待接入"),
        metric("睡眠总时长", 7.1, "小时", "-0.3", "待接入"),
        metric("睡眠质量自评", 6.6, "/10", "", "待接入"),
        metric("午休时长", 24, "分钟", "", "待接入"),
        metric("白天困倦程度", 5.9, "/10", "", "待接入"),
        metric("运动后睡眠改善", 13, "%", "+4%", "模型"),
        metric("作业压缩睡眠", 37, "%", "+8%", "模型"),
        metric("睡眠不足时运动参与下降", 22, "%", "", "模型"),
      ],
    },
    {
      id: "mood",
      title: "八、心理与情绪指标",
      subtitle: "压力、焦虑、自信、社交和运动情绪反馈",
      icon: <Smile className="h-4 w-4" />,
      score: emotionPressureIndex,
      scoreLabel: "压力指数",
      metrics: [
        metric("学习压力", 7.4, "/10", "+0.5", "待接入"),
        metric("考试焦虑", 6.9, "/10", "+0.7", "待接入"),
        metric("心情评分", 6.8, "/10", "", "待接入"),
        metric("自信心", 7.0, "/10", "+0.4", "待接入"),
        metric("疲惫感", 6.2, "/10", "", "待接入"),
        metric("社交状态", 7.5, "/10", "", "待接入"),
        metric("喜欢体育课", 76, "%", "+6%", "待接入"),
        metric("害怕体育测试", 18, "%", "-2%", "待接入"),
        metric("成绩压力导致少运动", 33, "%", "+5%", "模型"),
        metric("运动改善情绪", 47, "%", "+9%", "模型"),
        metric("厌学/低动力预警", 5, "人", "需关注", "模型"),
      ],
    },
    {
      id: "family",
      title: "九、家庭与环境指标",
      subtitle: "家长态度、家庭作息、场地装备和校外资源",
      icon: <Home className="h-4 w-4" />,
      score: 71,
      scoreLabel: "家庭支持",
      metrics: [
        metric("家长支持运动", 72, "%", "", "待接入"),
        metric("家长更重视成绩", 64, "%", "", "待接入"),
        metric("家庭运动习惯", 41, "%", "", "待接入"),
        metric("家庭作息稳定", 66, "%", "", "待接入"),
        metric("周末允许运动", 58, "%", "", "待接入"),
        metric("运动场地可获得", 74, "%", "", "待接入"),
        metric("运动装备充足", 82, "%", "", "待接入"),
        metric("校外体育培训", 19, "%", "", "待接入"),
        metric("体育中考重视程度", 8.2, "/10", "", "待接入"),
      ],
    },
    {
      id: "school-class",
      title: "十、学校与班级环境指标",
      subtitle: "班级氛围、场地、天气、空气和课程保障",
      icon: <School className="h-4 w-4" />,
      score: 78,
      scoreLabel: "环境支持",
      metrics: [
        metric("班级整体作业量", 142, "分钟/日", "", "待接入"),
        metric("班级运动氛围", 7.6, "/10", "+0.4", "待接入"),
        metric("体育老师要求强度", 7.8, "/10", "", "待接入"),
        metric("班主任支持运动", 8.1, "/10", "", "待接入"),
        metric("年级考试压力", 7.2, "/10", "", "待接入"),
        metric("校内场地使用率", 68, "%", "", "待接入"),
        metric("天气适宜天数", 19, "天", schoolMonthLabel, "待接入"),
        metric("空气质量可运动天数", 22, "天", schoolMonthLabel, "待接入"),
        metric("体育课被占用", 6, "节", "需治理", "待接入"),
        metric("课间活动时间", 24, "分钟/日", "", "待接入"),
        metric("社团活动参与", 29, "%", "", "待接入"),
      ],
    },
    {
      id: "relationships",
      title: "十一、关系型指标",
      subtitle: "作业、睡眠、运动、成绩和情绪之间的关联",
      icon: <Link2 className="h-4 w-4" />,
      score: 69,
      scoreLabel: "关联可信度",
      metrics: [
        metric("作业量增加后运动参与", "-18", "%", "负相关 r=-0.42", "模型"),
        metric("作业完成越晚次日运动表现", "-9", "%", "r=-0.31", "模型"),
        metric("睡眠不足对运动积极度", "-22", "%", "r=-0.46", "模型"),
        metric("每周运动3次以上成绩稳定性", "+14", "%", "更稳定", "模型"),
        metric("运动参与提高后总分变化", "+3.6", "分", "4周均值", "模型"),
        metric("高强度运动对次日学习状态", "-6", "%", "强度过高", "模型"),
        metric("适度运动对课堂专注度", "+11", "%", "正相关", "模型"),
        metric("考试前两周运动量", "-26", "%", "明显下降", "模型"),
        metric("体育成绩提升对自信心", "+0.7", "/10", "r=0.38", "模型"),
        metric("班级运动氛围对个人参与", "+16", "%", "r=0.44", "模型"),
        metric("家长支持对持续运动", "+19", "%", "r=0.41", "模型"),
        metric("不同项目对学习状态", "有氧最佳", "", "球类其次", "模型"),
      ],
    },
    {
      id: "advanced-index",
      title: "十二、高级指数",
      subtitle: "把多源数据合成为管理层可直接判断的指数",
      icon: <Sparkles className="h-4 w-4" />,
      score: growthIndex,
      scoreLabel: "综合成长",
      metrics: [
        metric("运动参与指数", sportsParticipationIndex, "/100", "", "模型"),
        metric("运动积极度指数", sportMotivationIndex, "/100", "", "模型"),
        metric("学习负担指数", learningLoadIndex, "/100", "高", "模型"),
        metric("睡眠恢复指数", sleepRecoveryIndex, "/100", "", "模型"),
        metric("学业变化指数", academicChangeIndex, "/100", "", "模型"),
        metric("情绪压力指数", emotionPressureIndex, "/100", "中高", "模型"),
        metric("健康风险指数", healthRiskIndex, "/100", "低", "模型"),
        metric("班级活跃指数", classActivityIndex, "/100", "", "模型"),
        metric("年级体育发展指数", gradeDevelopmentIndex, "/100", "", "模型"),
        metric("学生综合成长指数", growthIndex, "/100", "", "模型"),
      ],
    },
  ];
}

function buildTrendData({
  records,
  scopedStudentIds,
  statsMonth,
  trendPeriod,
}: {
  records: SportRecord[];
  scopedStudentIds: Set<string>;
  statsMonth: string;
  trendPeriod: TrendPeriod;
}) {
  const buckets = getTrendBuckets(statsMonth, trendPeriod);

  return buckets.map((bucket) => {
    const bucketRecords = records.filter((record) => {
      if (record.isInvalid || !scopedStudentIds.has(record.studentId)) return false;
      const recordTime = new Date(record.datetime).getTime();
      return recordTime >= bucket.start.getTime() && recordTime < bucket.end.getTime();
    });
    const passedRecords = bucketRecords.filter((record) => record.isPassed);

    return {
      label: bucket.label,
      records: bucketRecords.length,
      participants: new Set(bucketRecords.map((record) => record.studentId)).size,
      totalTimes: getTotalTimes(passedRecords),
    };
  });
}

function getTrendBuckets(statsMonth: string, trendPeriod: TrendPeriod) {
  const anchor = getAnchorDate(statsMonth);

  if (trendPeriod === "week") {
    const start = getWeekStart(anchor);
    return Array.from({ length: 7 }).map((_, index) => {
      const day = addDays(start, index);
      return {
        label: ["一", "二", "三", "四", "五", "六", "日"][index],
        start: day,
        end: addDays(day, 1),
      };
    });
  }

  if (trendPeriod === "month") {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }).map((_, index) => {
      const day = new Date(year, month, index + 1);
      return {
        label: `${index + 1}`,
        start: day,
        end: addDays(day, 1),
      };
    });
  }

  return getSemesterMonths(anchor).map((monthStart) => ({
    label: `${monthStart.getMonth() + 1}月`,
    start: monthStart,
    end: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1),
  }));
}

function getAnchorDate(statsMonth: string) {
  const [yearText, monthText] = statsMonth.split("-");
  const selectedYear = Number(yearText);
  const selectedMonth = Number(monthText) - 1;
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (statsMonth === currentMonthKey) return now;
  return new Date(selectedYear, selectedMonth, 1);
}

function getWeekStart(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getSemesterMonths(anchor: Date) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  let startYear = year;
  let startMonth = 1;

  if (month === 0) {
    startYear = year - 1;
    startMonth = 8;
  } else if (month >= 1 && month <= 6) {
    startMonth = 1;
  } else {
    startMonth = 8;
  }

  return Array.from({ length: 6 }).map(
    (_, index) => new Date(startYear, startMonth + index, 1),
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function metric(
  name: string,
  value: string | number,
  unit: string,
  trend: string,
  source: MetricSource,
): TopMetric {
  return { name, value, unit, trend, source };
}

function getMonthLabel(statsMonth: string) {
  const [year, month] = statsMonth.split("-");
  return `${year}年${Number(month)}月`;
}

function TopLevelAnalyticsPanel({
  categories,
  metricCount,
  statsMonth,
}: {
  categories: TopAnalyticsCategory[];
  metricCount: number;
  statsMonth: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const averageScore = Math.round(
    categories.reduce((sum, category) => sum + category.score, 0) /
      Math.max(1, categories.length),
  );
  const activeCategory = categories[activeIndex % Math.max(1, categories.length)];

  if (!activeCategory) return null;

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="rounded-lg bg-gray-950 p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[12px] font-medium text-blue-100">
                Top level 全域管理驾驶舱
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-blue-100 active:bg-white/20"
                aria-label="查看采集说明"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-1 text-[22px] font-bold leading-tight">
              12 大类指标与指数数据
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-gray-300">
              只对校长/体育主管开放，覆盖运动、作业、成绩、睡眠、心理、家庭和环境。
            </p>
          </div>
          <div className="shrink-0 rounded-lg bg-white px-3 py-2 text-right text-gray-950">
            <div className="text-[24px] font-bold leading-none">{averageScore}</div>
            <div className="mt-0.5 text-[10px] text-gray-500">综合均值</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/10 px-2 py-2">
            <HeartPulse className="h-3.5 w-3.5 shrink-0 text-blue-200" />
            <span className="truncate">{categories.length}类</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/10 px-2 py-2">
            <BarChart3 className="h-3.5 w-3.5 shrink-0 text-blue-200" />
            <span className="truncate">{metricCount}项</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/10 px-2 py-2">
            <Timer className="h-3.5 w-3.5 shrink-0 text-blue-200" />
            <span className="truncate">{getMonthLabel(statsMonth)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-[12px] font-medium text-gray-500">
              选择指标类
            </div>
            <div className="mt-0.5 text-[11px] text-gray-400">
              第 {activeIndex + 1}/{categories.length} 类
            </div>
          </div>
          <div className="text-[11px] font-medium text-[#1677ff]">
            点击选择
          </div>
        </div>
        <div className="relative">
          <select
            aria-label="选择指标类"
            value={activeIndex}
            onChange={(event) => setActiveIndex(Number(event.target.value))}
            className="h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-[14px] font-bold text-gray-950 outline-none focus:border-[#1677ff]"
          >
            {categories.map((category, index) => (
              <option key={category.id} value={index}>
                {category.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <TopAnalyticsCard category={activeCategory} />
      {showGuide && <CollectionGuideModal onClose={() => setShowGuide(false)} />}
    </section>
  );
}

function CollectionGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-gray-950/45 px-3 pb-3 pt-16">
      <div className="max-h-[82vh] w-full overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
          <div>
            <div className="text-[12px] font-medium text-[#1677ff]">
              指标采集说明
            </div>
            <h3 className="mt-0.5 text-[18px] font-bold text-gray-950">
              采集形式代码与 12 类指标来源
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 active:bg-gray-200"
            aria-label="关闭采集说明"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(82vh-76px)] overflow-y-auto p-4">
          <section>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff]">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <h4 className="text-[15px] font-bold text-gray-950">
                采集形式代码
              </h4>
            </div>
            <div className="grid gap-2">
              {collectionCodes.map((item) => (
                <div
                  key={item.code}
                  className="grid grid-cols-[34px_1fr] gap-2 rounded-lg bg-gray-50 p-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-950 text-[14px] font-bold text-white">
                    {item.code}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-gray-950">
                      {item.name}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff]">
                <Layers3 className="h-4 w-4" />
              </div>
              <h4 className="text-[15px] font-bold text-gray-950">
                12 类指标采集方式
              </h4>
            </div>
            <div className="space-y-2">
              {categoryCollectionMethods.map((item) => (
                <div key={item.title} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="min-w-0 text-[13px] font-bold leading-5 text-gray-950">
                      {item.title}
                    </h5>
                    <span className="shrink-0 rounded bg-blue-50 px-2 py-1 text-[10px] font-semibold text-[#1677ff]">
                      {item.method}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-gray-500">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff]">
                <Sparkles className="h-4 w-4" />
              </div>
              <h4 className="text-[15px] font-bold text-gray-950">
                各指数计算函数
              </h4>
            </div>
            <div className="space-y-2">
              {indexFunctionGuides.map((item) => (
                <div key={item.name} className="rounded-lg bg-gray-50 p-3">
                  <div className="break-words font-mono text-[12px] font-bold text-gray-950">
                    {item.name}()
                  </div>
                  <div className="mt-1 text-[11px] leading-4 text-gray-500">
                    输入：{item.inputs}
                  </div>
                  <div className="mt-1 text-[11px] leading-4 text-[#1677ff]">
                    计算：{item.formula}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TopAnalyticsCard({ category }: { category: TopAnalyticsCategory }) {
  return (
    <div className="mt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff]">
              {category.icon}
            </div>
            <h3 className="min-w-0 text-[15px] font-bold leading-5 text-gray-950">
              {category.title}
            </h3>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-gray-500">
            {category.subtitle}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[22px] font-bold leading-none text-gray-950">
            {category.score}
          </div>
          <div className="mt-0.5 text-[10px] text-gray-400">
            {category.scoreLabel}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {category.metrics.map((item) => (
          <div key={`${category.id}-${item.name}`}>
            <MetricChip item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricChip({ item }: { item: TopMetric }) {
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 px-2 py-2">
      <div className="flex items-start justify-between gap-1.5">
        <span className="min-w-0 text-[11px] font-medium leading-4 text-gray-500">
          {item.name}
        </span>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${getSourceClass(
            item.source,
          )}`}
        >
          {item.source}
        </span>
      </div>
      <div className="mt-1 min-w-0 text-[15px] font-bold leading-5 text-gray-950">
        <span className="break-words">{item.value}</span>
        {item.unit && (
          <span className="ml-0.5 text-[10px] font-medium text-gray-400">
            {item.unit}
          </span>
        )}
      </div>
      {item.trend && (
        <div className="mt-0.5 break-words text-[10px] font-medium text-[#1677ff]">
          {item.trend}
        </div>
      )}
    </div>
  );
}

function getSourceClass(source: MetricSource) {
  if (source === "已接入") return "bg-blue-50 text-blue-600";
  if (source === "模型") return "bg-amber-50 text-amber-600";
  return "bg-gray-100 text-gray-500";
}

function buildGroupRow(
  name: string,
  students: Student[],
  monthRecords: Array<{ studentId: string; isPassed: boolean; totalTimes?: number }>,
  passedRecords: Array<{ studentId: string; isPassed: boolean; totalTimes?: number }>,
) {
  const ids = new Set(students.map((student) => student.id));
  const groupRecords = monthRecords.filter((record) => ids.has(record.studentId));
  const groupPassed = passedRecords.filter((record) => ids.has(record.studentId));
  const participants = new Set(groupRecords.map((record) => record.studentId)).size;

  return {
    id: name,
    name,
    students: students.length,
    participants,
    records: groupRecords.length,
    totalTimes: getTotalTimes(groupPassed as any),
    rate: students.length > 0 ? Math.round((participants / students.length) * 100) : 0,
  };
}

function SelectorRow({
  label,
  items,
  value,
  onChange,
  getLabel = (item) => item,
}: {
  label: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
  getLabel?: (item: string) => string;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 text-[12px] font-medium text-gray-500">{label}</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onChange(item)}
            className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold ${
              value === item ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {getLabel(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  unit: string;
  tone: "blue" | "green" | "amber" | "rose";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  }[tone];

  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
        {icon}
      </div>
      <div className="mt-3 text-[12px] font-medium text-gray-500">{label}</div>
      <div className="mt-1 flex items-end gap-1">
        <span className="text-[28px] font-bold leading-none text-gray-950">
          {value}
        </span>
        <span className="pb-0.5 text-[12px] text-gray-400">{unit}</span>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  aside,
}: {
  icon: ReactNode;
  title: string;
  aside: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#1677ff]">
          {icon}
        </div>
        <h2 className="text-[16px] font-bold text-gray-950">{title}</h2>
      </div>
      <span className="shrink-0 text-[12px] text-gray-400">{aside}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-[3px] w-5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  helper,
  max,
}: {
  key?: string | number;
  label: string;
  value: number;
  helper: string;
  max: number;
}) {
  const width = value > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="font-semibold text-gray-800">{label}</span>
        <span className="font-bold text-gray-950">{value}次</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-[#1677ff]" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-gray-400">{helper}</div>
    </div>
  );
}

function DrillRow({
  row,
  rank,
  scope,
}: {
  key?: string | number;
  row: any;
  rank: number;
  scope: DataScope;
}) {
  const isProject = "category" in row;
  const label = isProject ? row.name : row.name;
  const subLabel = isProject
    ? `${row.category} · ${row.participants}人参与`
    : scope === "class"
      ? `${row.className} · ${row.records}条记录`
      : `${row.participants}/${row.students} 人参与`;
  const rate = isProject ? 0 : row.rate;

  return (
    <div className="grid grid-cols-[32px_1fr_64px] items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[13px] font-bold text-[#1677ff]">
        {rank}
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[14px] font-bold text-gray-900">
            {label}
          </span>
          {!isProject && (
            <span className="text-[12px] font-semibold text-emerald-600">
              {rate}%
            </span>
          )}
        </div>
        {!isProject && (
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
          </div>
        )}
        <div className="mt-1 text-[10px] text-gray-400">{subLabel}</div>
      </div>
      <div className="text-right text-[13px] font-bold text-gray-950">
        {row.totalTimes}次
      </div>
    </div>
  );
}
