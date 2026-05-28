import {
  type ChangeEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Gauge,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Layers3,
  Link2,
  Loader2,
  Lock,
  Medal,
  Mic,
  Paperclip,
  Plus,
  Printer,
  RefreshCw,
  School,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
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
import {
  askStatsAi,
  buildPolicyAiReport,
  type AnalyticsReportCategory,
  type DrillReportRow,
  type ReportSection,
  type ReportVisual,
  type StatsAiAttachmentInput,
  type StatsReport,
  type StatsReportInput,
  type StatsReportKind,
} from "../../lib/statsReports";

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

type SnapshotMetricTone = "blue" | "green" | "orange" | "rose";

type SnapshotMetric = {
  label: string;
  value: string;
  helper: string;
  tone: SnapshotMetricTone;
};

type RoleSnapshotConfig = {
  eyebrow: string;
  title: string;
  metrics: SnapshotMetric[];
  aiHint: string;
  aiPlaceholder: string;
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

type AiConversationMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  source?: "AI生成" | "本地分析";
  attachments?: AiAttachmentDraft[];
};

type AiAttachmentDraft = StatsAiAttachmentInput & {
  previewUrl?: string;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = Event & {
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = Event & {
  error?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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
  const [activeReport, setActiveReport] = useState<StatsReport | null>(null);
  const [reportBusy, setReportBusy] = useState<StatsReportKind | null>(null);
  const [coreOverviewOpenSignal, setCoreOverviewOpenSignal] = useState(0);

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

  const allowedStudentIds = useMemo(
    () => new Set(allowedStudents.map((student) => student.id)),
    [allowedStudents],
  );

  const allowedMonthRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          !record.isInvalid &&
          record.datetime.startsWith(statsMonth) &&
          allowedStudentIds.has(record.studentId),
      ),
    [allowedStudentIds, records, statsMonth],
  );

  const allowedPassedRecords = allowedMonthRecords.filter((record) => record.isPassed);
  const passedRecords = monthRecords.filter((record) => record.isPassed);
  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "open"),
    [projects],
  );
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

  const allowedClassRows = Object.entries(groupBy(allowedStudents, getStudentLabel))
    .map(([className, students]) =>
      buildGroupRow(className, students, allowedMonthRecords, allowedPassedRecords),
    )
    .sort((a, b) => b.rate - a.rate || b.totalTimes - a.totalTimes);

  const allowedStudentRows = allowedStudents
    .map((student) => {
      const studentRecords = allowedMonthRecords.filter(
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
  const currentScopeAnalytics = useMemo(
    () =>
      buildTopLevelAnalytics({
        students: scopedStudents,
        projects: activeProjects,
        records: monthRecords,
        categories,
        statsMonth,
      }),
    [activeProjects, categories, monthRecords, scopedStudents, statsMonth],
  );
  const healthGovernanceIndex = Math.round(
    currentScopeAnalytics.reduce((sum, category) => sum + category.score, 0) /
      Math.max(1, currentScopeAnalytics.length),
  );
  const sportsPassRate = toPercent(passedRecords.length, monthRecords.length);
  const schoolProgressRate = Number(
    currentScopeAnalytics
      .find((category) => category.id === "advanced-index")
      ?.metrics.find((item) => item.name === "年级体育发展指数")?.value ??
      healthGovernanceIndex,
  );
  const riskStudentCount = useMemo(
    () =>
      scopedStudents.filter((student) => {
        const studentRecords = monthRecords.filter(
          (record) => record.studentId === student.id,
        );
        const studentPassedRecords = studentRecords.filter((record) => record.isPassed);
        return studentRecords.length === 0 || getTotalTimes(studentPassedRecords) === 0;
      }).length,
    [monthRecords, scopedStudents],
  );

  const snapshotConfig = buildRoleSnapshotConfig({
    viewer,
    targetLabel,
    passRate: sportsPassRate,
    governanceIndex: healthGovernanceIndex,
    progressRate: schoolProgressRate,
    riskStudentCount,
    completionRate,
    totalTimes,
    scopedStudents,
    allowedClassRows,
    allowedStudentRows,
    selectedClassKey,
    selectedStudentId,
  });

  const currentReportInput: StatsReportInput = {
    scope: dataScope,
    targetLabel,
    statsMonth,
    students: scopedStudents,
    records: monthRecords,
    projects: activeProjects,
    categories,
    categoryRows,
    projectRows,
    drillRows: drillRows as DrillReportRow[],
    analyticsCategories: currentScopeAnalytics.map(
      ({ icon: _icon, ...category }) => category,
    ) as AnalyticsReportCategory[],
  };

  const handlePolicyReport = async () => {
    setReportBusy("policy-ai");
    toast("正在生成政策AI报告...", { icon: "AI", duration: 1200 });

    try {
      const report = await buildPolicyAiReport(currentReportInput);
      setActiveReport(report);
      toast.success(
        report.source === "AI生成"
          ? "AI报告已生成"
          : "AI不可用，已生成本地分析报告",
      );
    } catch {
      toast.error("报告生成失败，请稍后再试");
    } finally {
      setReportBusy(null);
    }
  };

  const handleViewAllData = () => {
    setCoreOverviewOpenSignal((signal) => signal + 1);
    window.requestAnimationFrame(() => {
      document
        .getElementById("core-overview")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#fbfdff_0%,#edf4fb_44%,#f8fafc_100%)] pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(220,236,255,0.42)_48%,rgba(255,255,255,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(128deg,rgba(255,255,255,0.5)_0%,rgba(255,255,255,0)_38%,rgba(180,215,255,0.2)_72%,rgba(255,255,255,0.34)_100%)]" />
      <Header
        title="统计"
        showBack={false}
        bg="bg-white/45 backdrop-blur-2xl border-b border-white/55 shadow-none"
        titleClassName="text-slate-950"
      />

      <div className="relative z-10 space-y-4 p-4">
        <LeadershipSnapshotPanel
          viewerProfiles={viewerProfiles}
          activeViewerId={viewerId}
          onViewerChange={setViewerId}
          targetLabel={targetLabel}
          monthLabel={getMonthLabel(statsMonth)}
          riskStudentCount={riskStudentCount}
          snapshotConfig={snapshotConfig}
          onViewData={handleViewAllData}
          onGenerateReport={handlePolicyReport}
          isGenerating={reportBusy === "policy-ai"}
          reportInput={currentReportInput}
        />

        <div id="all-stats-data" className="space-y-4 scroll-mt-4">
          <CollapsibleStatsSection
            icon={<ShieldCheck className="h-4 w-4" />}
            title="统计设置"
            aside={`${viewer.name} · ${scopeOptions.find((option) => option.key === dataScope)?.label || "当前范围"}`}
            defaultOpen={false}
            headerAction={
              <input
                type="month"
                value={statsMonth}
                onChange={(event) => setStatsMonth(event.target.value)}
                className="h-9 shrink-0 rounded-full border border-white/70 bg-white/58 px-3 text-[12px] font-medium text-gray-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none backdrop-blur-xl focus:border-[#1677ff]"
              />
            }
          >
            <div>
              <h1 className="text-[23px] font-bold leading-tight text-gray-950">
                {viewer.name}
              </h1>
              <p className="mt-1 text-[12px] leading-5 text-gray-500">
                {viewer.title} · 可见 {allowedStudents.length} 名学生的统计数据
              </p>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {viewerProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setViewerId(profile.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-left text-[12px] font-semibold ${
                    viewer.id === profile.id
                      ? "bg-slate-950/88 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.18)]"
                      : "bg-white/46 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]"
                  }`}
                >
                  <span className="block">{profile.name}</span>
                  <span className="mt-0.5 block text-[10px] opacity-70">
                    {profile.title}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-white/48 pt-4">
              <div className="mb-2 text-[12px] font-bold text-gray-500">
                数据范围
              </div>
              <div className="grid grid-cols-2 gap-2">
                {scopeOptions.map((option) => {
                  const allowed = allowedScopes.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      disabled={!allowed}
                      onClick={() => allowed && setDataScope(option.key)}
                      className={`flex min-h-[50px] items-center justify-between rounded-2xl border px-3 py-2 text-left backdrop-blur-xl ${
                        dataScope === option.key
                          ? "border-[#1677ff]/45 bg-blue-50/68 text-[#1677ff] shadow-[0_10px_24px_rgba(0,122,255,0.12),inset_0_1px_0_rgba(255,255,255,0.86)]"
                          : allowed
                            ? "border-white/58 bg-white/42 text-gray-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                            : "border-white/42 bg-white/28 text-gray-300"
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
            </div>
          </CollapsibleStatsSection>

          <CollapsibleStatsSection
            id="core-overview"
            icon={<HeartPulse className="h-4 w-4" />}
            title="核心概览"
            aside={`${targetLabel} · 参与率 ${completionRate}%`}
            defaultOpen={false}
            forceOpenSignal={coreOverviewOpenSignal}
          >
            <div className="grid grid-cols-2 gap-2">
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

            {viewer.level === "top" && (
              <TopLevelAnalyticsPanel
                categories={topLevelAnalytics}
                metricCount={topLevelMetricCount}
                statsMonth={statsMonth}
              />
            )}
          </CollapsibleStatsSection>

          <CollapsibleStatsSection
            icon={<TrendingUp className="h-4 w-4" />}
            title="趋势与结构"
            aside={`${targetLabel} · 分类和趋势`}
            defaultOpen={false}
          >
            <div className="flex rounded-full border border-white/58 bg-white/34 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl">
              {trendOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setTrendPeriod(option.key)}
                  className={`h-8 flex-1 rounded-md text-[13px] font-semibold ${
                    trendPeriod === option.key
                      ? "bg-white/82 text-[#1677ff] shadow-[0_10px_22px_rgba(83,105,132,0.13),inset_0_1px_0_rgba(255,255,255,0.92)]"
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

            <div className="mt-5 border-t border-white/48 pt-4">
              <SectionTitle
                icon={<Layers3 className="h-4 w-4" />}
                title="分类结构"
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
            </div>
          </CollapsibleStatsSection>

          <CollapsibleStatsSection
            icon={<BarChart3 className="h-4 w-4" />}
            title="下钻明细"
            aside="层级 / 项目"
            defaultOpen={false}
            headerAction={
              <button
                onClick={() => navigate("/stats/projects")}
                className="flex items-center gap-1 text-[13px] font-medium text-[#1677ff]"
              >
                更多
                <ChevronRight className="h-4 w-4" />
              </button>
            }
          >
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
                <div className="rounded-2xl border border-white/55 bg-white/35 py-10 text-center text-[13px] text-gray-400 backdrop-blur-xl">
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

            <div className="mt-5 border-t border-white/48 pt-4">
              <SectionTitle
                icon={<Activity className="h-4 w-4" />}
                title="项目数据"
                aside="项目维度"
              />
              <div className="mt-4 space-y-2">
                {projectRows.length === 0 ? (
                  <div className="rounded-2xl border border-white/55 bg-white/35 py-8 text-center text-[13px] text-gray-400 backdrop-blur-xl">
                    当前范围暂无项目数据
                  </div>
                ) : (
                  projectRows.slice(0, 8).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/stats/projects/${project.id}`)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/55 bg-white/35 px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl active:bg-white/55"
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
            </div>
          </CollapsibleStatsSection>
        </div>
      </div>

      {activeReport && (
        <ReportPreviewModal
          report={activeReport}
          onClose={() => setActiveReport(null)}
          onRegenerate={handlePolicyReport}
          isRegenerating={reportBusy === activeReport.kind}
        />
      )}
    </div>
  );
}

function createStatsAiWelcomeMessage(
  targetLabel: string,
  monthLabel: string,
  riskStudentCount: number,
): AiConversationMessage {
  return {
    id: `welcome-${targetLabel}-${monthLabel}`,
    role: "assistant",
    text: `我已接入${targetLabel}${monthLabel}的统计数据。你可以直接问我哪些班级或项目需要优先整改、达标率为什么波动，或者下月先盯哪些指标。当前识别到重点风险学生 ${riskStudentCount} 人。`,
  };
}

function buildRoleSnapshotConfig({
  viewer,
  targetLabel,
  passRate,
  governanceIndex,
  progressRate,
  riskStudentCount,
  completionRate,
  totalTimes,
  scopedStudents,
  allowedClassRows,
  allowedStudentRows,
  selectedClassKey,
  selectedStudentId,
}: {
  viewer: ViewerProfile;
  targetLabel: string;
  passRate: number;
  governanceIndex: number;
  progressRate: number;
  riskStudentCount: number;
  completionRate: number;
  totalTimes: number;
  scopedStudents: Student[];
  allowedClassRows: ReturnType<typeof buildGroupRow>[];
  allowedStudentRows: Array<{
    id: string;
    name: string;
    className: string;
    records: number;
    totalTimes: number;
    rate: number;
  }>;
  selectedClassKey: string;
  selectedStudentId: string;
}): RoleSnapshotConfig {
  const classRates = allowedClassRows.map((row) => row.rate);
  const classBalanceIndex =
    classRates.length > 0
      ? clampPercent(100 - (Math.max(...classRates) - Math.min(...classRates)))
      : 0;
  const selectedClassRow =
    allowedClassRows.find((row) => row.name === selectedClassKey) || allowedClassRows[0];
  const selectedClassRank = selectedClassRow
    ? Math.max(
        1,
        allowedClassRows.findIndex((row) => row.name === selectedClassRow.name) + 1,
      )
    : 1;
  const rankDelta = progressRate >= 78 ? "+2" : progressRate >= 68 ? "+1" : "持平";
  const selectedStudent =
    allowedStudentRows.find((row) => row.id === selectedStudentId) || allowedStudentRows[0];
  const selectedStudentRank = selectedStudent
    ? allowedStudentRows.findIndex((row) => row.id === selectedStudent.id) + 1
    : 0;
  const peerPosition =
    selectedStudentRank > 0 && allowedStudentRows.length > 1
      ? clampPercent((selectedStudentRank / allowedStudentRows.length) * 100)
      : 35;
  const weeklyTarget = 5;
  const weeklyDone = Math.min(
    weeklyTarget,
    Math.max(0, Math.round(totalTimes / 4) || selectedStudent?.records || 0),
  );
  const trendValue = formatSignedPercent(Math.max(-12, (progressRate - 70) / 1.1));
  const studentName = scopedStudents[0]?.name || targetLabel || "学生";

  if (viewer.level === "medium") {
    return {
      eyebrow: "年级均衡驾驶舱",
      title: `${targetLabel || viewer.gradeScope || "当前"}年级统计入口`,
      metrics: [
        {
          label: "年级达成率",
          value: `${completionRate}%`,
          helper: "本年级整体完成情况",
          tone: "blue",
        },
        {
          label: "班级均衡指数",
          value: `${classBalanceIndex}分`,
          helper: "各班差距是否过大",
          tone: "green",
        },
        {
          label: "年级发展趋势",
          value: trendValue,
          helper: "较上月/上周变化",
          tone: "orange",
        },
      ],
      aiHint: "年级主任视角会优先分析班级差距、重点关注班级和低参与学生。",
      aiPlaceholder: "问我：哪个班级拖慢了年级达标？",
    };
  }

  if (viewer.level === "basic") {
    return {
      eyebrow: "班级执行驾驶舱",
      title: `${targetLabel || selectedClassKey || "授权班级"}统计入口`,
      metrics: [
        {
          label: "本班达成率",
          value: `${completionRate}%`,
          helper: "本班整体完成情况",
          tone: "blue",
        },
        {
          label: "年级位次变化",
          value: `第${selectedClassRank}名`,
          helper: `较上月 ${rankDelta}`,
          tone: "green",
        },
        {
          label: "待达标学生",
          value: `${riskStudentCount}人`,
          helper: "接下来重点推进",
          tone: "rose",
        },
      ],
      aiHint: "班级负责人视角会优先生成未达标学生、连续缺席学生和本班执行动作。",
      aiPlaceholder: "问我：本班先提醒哪几名学生？",
    };
  }

  if (viewer.level === "student") {
    return {
      eyebrow: "个人成长仪表盘",
      title: `${studentName}个人统计入口`,
      metrics: [
        {
          label: "本周完成度",
          value: `${weeklyDone}/${weeklyTarget}次`,
          helper: "有没有完成学校要求",
          tone: "blue",
        },
        {
          label: "体质成长趋势",
          value: trendValue,
          helper: "孩子是不是在进步",
          tone: "green",
        },
        {
          label: "同班水平对比",
          value: `班级前${peerPosition}%`,
          helper: "在同龄人中的位置",
          tone: "orange",
        },
      ],
      aiHint: "学生/家长视角会聚焦完成要求、成长趋势和同伴水平对比。",
      aiPlaceholder: "问我：这周还差哪些运动任务？",
    };
  }

  return {
    eyebrow: "学校治理驾驶舱",
    title: "全校统计入口",
    metrics: [
      {
        label: "综合健康治理",
        value: `${governanceIndex}分`,
        helper: "全校体育健康整体水平",
        tone: "green",
      },
      {
        label: "政策落实率",
        value: `${passRate}%`,
        helper: "政策和任务是否落地",
        tone: "blue",
      },
      {
        label: "体质发展指数",
        value: trendValue,
        helper: "学生健康状态是否向好",
        tone: "orange",
      },
    ],
    aiHint: "校领导视角会优先生成全校治理判断、政策落实结论和发展趋势建议。",
    aiPlaceholder: "问我：全校下月先抓哪三个问题？",
  };
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatSignedPercent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function getAttachmentKind(file: File): StatsAiAttachmentInput["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function getAttachmentLabel(kind: StatsAiAttachmentInput["kind"]) {
  if (kind === "image") return "图片";
  if (kind === "video") return "视频";
  if (kind === "audio") return "音频";
  return "文件";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  if (size >= 1024) return `${Math.round(size / 1024)}KB`;
  return `${size}B`;
}

function revokeAttachmentPreviews(attachments: AiAttachmentDraft[]) {
  attachments.forEach((attachment) => {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  });
}

function getSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function LeadershipSnapshotPanel({
  viewerProfiles,
  activeViewerId,
  onViewerChange,
  targetLabel,
  monthLabel,
  riskStudentCount,
  snapshotConfig,
  onViewData,
  onGenerateReport,
  isGenerating,
  reportInput,
}: {
  viewerProfiles: ViewerProfile[];
  activeViewerId: string;
  onViewerChange: (viewerId: string) => void;
  targetLabel: string;
  monthLabel: string;
  riskStudentCount: number;
  snapshotConfig: RoleSnapshotConfig;
  onViewData: () => void;
  onGenerateReport: () => void;
  isGenerating: boolean;
  reportInput: StatsReportInput;
}) {
  const [aiMessage, setAiMessage] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<AiAttachmentDraft[]>([]);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiConversationMessage[]>(() => [
    createStatsAiWelcomeMessage(targetLabel, monthLabel, riskStudentCount),
  ]);
  const aiContextKey = `${activeViewerId}-${targetLabel}-${monthLabel}`;
  const latestAiContextKey = useRef(aiContextKey);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiTextInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechBaseTextRef = useRef("");
  const voiceHoldTimerRef = useRef<number | null>(null);
  const voiceHoldActivatedRef = useRef(false);

  useEffect(() => {
    latestAiContextKey.current = aiContextKey;
    setAiBusy(false);
    setIsListening(false);
    setAiMessage("");
    setIsUploadMenuOpen(false);
    if (voiceHoldTimerRef.current !== null) {
      window.clearTimeout(voiceHoldTimerRef.current);
      voiceHoldTimerRef.current = null;
    }
    voiceHoldActivatedRef.current = false;
    speechRecognitionRef.current?.abort();
    speechRecognitionRef.current = null;
    setAttachments((current) => {
      revokeAttachmentPreviews(current);
      return [];
    });
    setAiMessages([createStatsAiWelcomeMessage(targetLabel, monthLabel, riskStudentCount)]);
  }, [aiContextKey, monthLabel, riskStudentCount, targetLabel]);

  useEffect(
    () => () => {
      if (voiceHoldTimerRef.current !== null) {
        window.clearTimeout(voiceHoldTimerRef.current);
      }
      speechRecognitionRef.current?.abort();
      speechRecognitionRef.current = null;
    },
    [],
  );

  const handleAttachmentPick = (
    event: ChangeEvent<HTMLInputElement>,
    fallbackKind: StatsAiAttachmentInput["kind"],
  ) => {
    const files = Array.from(event.currentTarget.files ?? []) as File[];
    event.currentTarget.value = "";

    if (files.length === 0) return;

    const nextAttachments = files.map((file, index) => {
      const kind = fallbackKind === "file" ? getAttachmentKind(file) : fallbackKind;
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        kind,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        file,
        previewUrl:
          kind === "image" || kind === "video" || kind === "audio"
            ? URL.createObjectURL(file)
            : undefined,
      };
    });

    setAttachments((current) => [...current, ...nextAttachments].slice(0, 6));
    setIsUploadMenuOpen(false);
    toast.success(`已添加 ${Math.min(files.length, 6)} 个附件`);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments((current) => {
      const target = current.find((item) => item.id === attachmentId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== attachmentId);
    });
  };

  const stopVoiceInput = () => {
    speechRecognitionRef.current?.stop();
    setIsListening(false);
  };

  const startVoiceInput = () => {
    if (aiBusy || isListening) return;
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      toast.error("当前浏览器不支持语音识别，请使用 Chrome 或 Edge");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const baseText = aiMessage.trim();

      speechBaseTextRef.current = baseText;
      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const finalParts: string[] = [];
        const interimParts: string[] = [];

        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0]?.transcript?.trim();
          if (!transcript) continue;

          if (result.isFinal) finalParts.push(transcript);
          else interimParts.push(transcript);
        }

        const recognizedText = [...finalParts, ...interimParts].join("");
        const nextMessage = [speechBaseTextRef.current, recognizedText]
          .filter(Boolean)
          .join(" ");

        setAiMessage(nextMessage);
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        speechRecognitionRef.current = null;

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast.error("麦克风权限被拒绝，请在浏览器地址栏允许麦克风");
        } else if (event.error !== "no-speech") {
          toast.error("语音识别失败，请再试一次");
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        speechRecognitionRef.current = null;
      };

      speechRecognitionRef.current = recognition;
      setIsUploadMenuOpen(false);
      setIsListening(true);
      aiTextInputRef.current?.blur();
      recognition.start();
      toast("正在听你说话，松开输入栏结束语音输入", { icon: "语音" });
    } catch {
      setIsListening(false);
      speechRecognitionRef.current = null;
      toast.error("语音识别启动失败，请检查麦克风权限");
    }
  };

  const handleInputBarPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (aiBusy || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    voiceHoldActivatedRef.current = false;
    if (voiceHoldTimerRef.current !== null) {
      window.clearTimeout(voiceHoldTimerRef.current);
    }

    voiceHoldTimerRef.current = window.setTimeout(() => {
      voiceHoldActivatedRef.current = true;
      voiceHoldTimerRef.current = null;
      startVoiceInput();
    }, 450);
  };

  const handleInputBarPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (voiceHoldTimerRef.current !== null) {
      window.clearTimeout(voiceHoldTimerRef.current);
      voiceHoldTimerRef.current = null;
    }

    if (voiceHoldActivatedRef.current || isListening) {
      stopVoiceInput();
      voiceHoldActivatedRef.current = false;
      return;
    }

    aiTextInputRef.current?.focus();
  };

  const handleInputBarPointerCancel = (event?: PointerEvent<HTMLDivElement>) => {
    if (
      event &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (voiceHoldTimerRef.current !== null) {
      window.clearTimeout(voiceHoldTimerRef.current);
      voiceHoldTimerRef.current = null;
    }

    if (voiceHoldActivatedRef.current || isListening) stopVoiceInput();
    voiceHoldActivatedRef.current = false;
  };

  const handleAiSubmit = async () => {
    const typedQuestion = aiMessage.trim();
    const question =
      typedQuestion ||
      (attachments.length > 0
        ? "请结合我上传的附件和当前统计数据，分析问题并给出处理建议。"
        : "");

    if (!question) {
      toast("可以输入想追问的整改方向，或先上传图片、视频、音频、文件", {
        icon: "AI",
      });
      return;
    }

    if (aiBusy) return;

    const requestContextKey = aiContextKey;
    const userMessage: AiConversationMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: question,
      attachments,
    };
    const nextMessages = [...aiMessages, userMessage];

    setAiMessages(nextMessages);
    setAiMessage("");
    speechRecognitionRef.current?.abort();
    speechRecognitionRef.current = null;
    setIsListening(false);
    setAttachments([]);
    setIsUploadMenuOpen(false);
    setAiBusy(true);

    try {
      const reply = await askStatsAi(
        reportInput,
        question,
        nextMessages.map(({ role, text }) => ({ role, text })),
        attachments,
      );

      if (latestAiContextKey.current !== requestContextKey) return;

      setAiMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: reply.text,
          source: reply.source,
        },
      ]);
      toast.success(
        reply.source === "AI生成"
          ? "AI建议已更新"
          : "AI不可用，已给出本地分析建议",
      );
    } catch {
      if (latestAiContextKey.current !== requestContextKey) return;

      setAiMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          text: "暂时无法完成本次分析，请稍后再试。",
          source: "本地分析",
        },
      ]);
      toast.error("AI暂时不可用，请稍后再试");
    } finally {
      if (latestAiContextKey.current === requestContextKey) {
        setAiBusy(false);
      }
    }
  };

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/42 p-4 shadow-[0_24px_70px_rgba(83,105,132,0.18),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-2xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-[#007aff]">
            {snapshotConfig.eyebrow}
          </div>
          <h2 className="mt-1 text-[24px] font-black leading-tight text-[#111827]">
            {snapshotConfig.title}
          </h2>
        </div>
        <div className="rounded-full border border-white/70 bg-white/50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-[0_8px_24px_rgba(83,105,132,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
          {monthLabel}
        </div>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto rounded-[20px] border border-white/55 bg-white/32 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl">
        {viewerProfiles.map((profile) => {
          const active = profile.id === activeViewerId;
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => onViewerChange(profile.id)}
              className={`shrink-0 rounded-[16px] px-3 py-2 text-left transition-colors ${
                active
                  ? "bg-white/82 text-[#111827] shadow-[0_10px_24px_rgba(83,105,132,0.14),inset_0_1px_0_rgba(255,255,255,0.95)]"
                  : "text-slate-500 active:bg-white/55"
              }`}
            >
              <span className="block text-[12px] font-black leading-4">
                {profile.name}
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold opacity-60">
                {profile.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {snapshotConfig.metrics.map((metric) => (
          <div
            key={metric.label}
            className={`flex min-h-[96px] flex-col justify-between rounded-[18px] border p-2.5 text-center shadow-[0_14px_28px_rgba(83,105,132,0.10),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl ${
              metric.tone === "green"
                ? "border-emerald-200/60 bg-emerald-50/58 text-emerald-950"
                : metric.tone === "rose"
                  ? "border-rose-200/60 bg-rose-50/58 text-rose-950"
                : metric.tone === "orange"
                  ? "border-orange-200/60 bg-orange-50/58 text-orange-950"
                  : "border-blue-200/60 bg-blue-50/58 text-blue-950"
            }`}
          >
            <div className="text-[12px] font-bold leading-4">{metric.label}</div>
            <div>
              <div
                className={`text-[24px] font-black leading-none ${
                  metric.tone === "green"
                    ? "text-[#34c759]"
                    : metric.tone === "rose"
                      ? "text-[#ef4444]"
                    : metric.tone === "orange"
                      ? "text-[#ff9500]"
                      : "text-[#007aff]"
                }`}
              >
                {metric.value}
              </div>
              <div className="mt-1 text-[9px] font-semibold text-gray-500">
                {metric.helper}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          onClick={onViewData}
          className="h-12 rounded-full border border-white/75 bg-white/85 text-[16px] font-bold text-[#111827] shadow-[0_14px_34px_rgba(83,105,132,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl active:bg-white/95"
        >
          所有数据
        </button>
        <button
          type="button"
          onClick={onGenerateReport}
          disabled={isGenerating}
          className="flex h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-[linear-gradient(135deg,rgba(0,122,255,0.96),rgba(64,156,255,0.9))] text-[15px] font-bold text-white shadow-[0_18px_34px_rgba(0,122,255,0.32),inset_0_1px_0_rgba(255,255,255,0.45)] active:bg-[#006edc] disabled:opacity-70"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          报告分析与解决方案生成
        </button>
      </div>

      <div className="mt-3 flex min-h-[330px] flex-col rounded-[26px] border border-white/75 bg-white/80 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.86),0_18px_48px_rgba(83,105,132,0.16)] backdrop-blur-2xl">
        <div className="text-center text-[16px] font-black text-[#111827]">
          AI交互界面
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {aiMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-[22px] px-4 py-3 text-[13px] leading-6 shadow-sm ${
                  message.role === "user"
                    ? "bg-[#007aff]/90 text-white shadow-[0_12px_26px_rgba(0,122,255,0.22)]"
                    : "border border-white/80 bg-white/90 text-[#111827] backdrop-blur-xl"
                }`}
              >
                {message.role === "assistant" && message.source && (
                  <div
                    className={`mb-1 text-[10px] font-bold ${
                      message.source === "AI生成"
                        ? "text-[#007aff]"
                        : "text-[#f59e0b]"
                    }`}
                  >
                    {message.source}
                  </div>
                )}
                {message.text}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {message.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold ${
                          message.role === "user"
                            ? "bg-white/15 text-white"
                            : "bg-white/80 text-slate-700"
                        }`}
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {getAttachmentLabel(attachment.kind)} · {attachment.name}
                        </span>
                        <span className="shrink-0 opacity-80">
                          {formatFileSize(attachment.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {aiBusy && (
            <div className="flex justify-start">
              <div className="flex max-w-[88%] items-center gap-2 rounded-[22px] border border-white/80 bg-white/90 px-4 py-3 text-[13px] font-semibold text-[#111827] shadow-[0_10px_26px_rgba(83,105,132,0.12)] backdrop-blur-xl">
                <Loader2 className="h-4 w-4 animate-spin text-[#007aff]" />
                正在结合当前统计数据生成建议...
              </div>
            </div>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex max-w-[220px] shrink-0 items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-[12px] font-semibold text-gray-800 shadow-[0_10px_24px_rgba(83,105,132,0.12)] backdrop-blur-xl"
              >
                {attachment.kind === "image" ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-[#007aff]" />
                ) : attachment.kind === "video" ? (
                  <Video className="h-4 w-4 shrink-0 text-[#ff9500]" />
                ) : attachment.kind === "audio" ? (
                  <Mic className="h-4 w-4 shrink-0 text-[#34c759]" />
                ) : (
                  <Paperclip className="h-4 w-4 shrink-0 text-gray-500" />
                )}
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/85 text-gray-600 active:bg-white"
                  aria-label="移除附件"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => handleAttachmentPick(event, "image")}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => handleAttachmentPick(event, "image")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(event) => handleAttachmentPick(event, "video")}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(event) => handleAttachmentPick(event, "audio")}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          multiple
          className="hidden"
          onChange={(event) => handleAttachmentPick(event, "file")}
        />

        <div className="relative mt-3 flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-[0_16px_34px_rgba(83,105,132,0.18),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl">
          {isUploadMenuOpen && (
            <div className="absolute bottom-[58px] left-1/2 z-20 w-[min(320px,calc(100vw-64px))] -translate-x-1/2 rounded-[28px] border border-white/90 bg-white/95 p-2.5 shadow-[0_22px_54px_rgba(83,105,132,0.30),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-2xl">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-slate-600">添加素材</span>
                <span className="text-[10px] font-semibold text-slate-400">用于 AI 分析</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/80 bg-white/90 px-1 text-center text-[10px] font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] active:bg-blue-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#007aff]/10 text-[#007aff]">
                  <Camera className="h-4 w-4" />
                </span>
                拍照
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/80 bg-white/90 px-1 text-center text-[10px] font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] active:bg-blue-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#007aff]/10 text-[#007aff]">
                  <ImageIcon className="h-4 w-4" />
                </span>
                图片
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/80 bg-white/90 px-1 text-center text-[10px] font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] active:bg-orange-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff9500]/12 text-[#ff9500]">
                  <Video className="h-4 w-4" />
                </span>
                视频
              </button>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/80 bg-white/90 px-1 text-center text-[10px] font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] active:bg-emerald-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#34c759]/12 text-[#34c759]">
                  <Mic className="h-4 w-4" />
                </span>
                音频
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] border border-white/80 bg-white/90 px-1 text-center text-[10px] font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] active:bg-slate-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/8 text-slate-500">
                  <Paperclip className="h-4 w-4" />
                </span>
                文件
              </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsUploadMenuOpen((current) => !current)}
            disabled={aiBusy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] active:bg-white disabled:opacity-70"
            aria-label="打开上传菜单"
          >
            <Plus className={`h-4 w-4 transition-transform ${isUploadMenuOpen ? "rotate-45" : ""}`} />
          </button>
          <div
            role="button"
            tabIndex={0}
            onPointerDown={handleInputBarPointerDown}
            onPointerUp={handleInputBarPointerEnd}
            onPointerLeave={handleInputBarPointerCancel}
            onPointerCancel={handleInputBarPointerCancel}
            onContextMenu={(event) => {
              if (isListening || voiceHoldActivatedRef.current) event.preventDefault();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") aiTextInputRef.current?.focus();
            }}
            className={`flex min-w-0 flex-1 select-none items-center gap-2 rounded-full px-1 transition-colors ${
              isListening
                ? "bg-[#ff3b30]/10 text-[#ff3b30]"
                : "text-gray-500 active:bg-white/45"
            }`}
            aria-label="短按输入文字，长按语音输入"
          >
            {isListening && (
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff3b30] text-white">
                <span className="absolute inset-0 rounded-full bg-[#ff3b30]/35 animate-ping" />
                <Mic className="relative h-3.5 w-3.5" />
              </span>
            )}
            <input
              ref={aiTextInputRef}
              value={aiMessage}
              readOnly={isListening}
              onChange={(event) => setAiMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !aiBusy) handleAiSubmit();
              }}
              placeholder={
                isListening
                  ? "松开结束语音输入..."
                  : "短按输入，长按说话"
              }
              className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-[#111827] outline-none placeholder:text-gray-400"
            />
          </div>
          <button
            type="button"
            onClick={handleAiSubmit}
            disabled={aiBusy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#007aff] text-white shadow-[0_8px_18px_rgba(0,122,255,0.28),inset_0_1px_0_rgba(255,255,255,0.42)] disabled:opacity-70"
            aria-label="发送AI追问"
          >
            {aiBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

function ReportPreviewModal({
  report,
  onClose,
  onRegenerate,
  isRegenerating,
}: {
  report: StatsReport;
  onClose: () => void;
  onRegenerate: () => void | Promise<void>;
  isRegenerating: boolean;
}) {
  const handlePrint = () => {
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    document.title = report.title;
    window.addEventListener("afterprint", restoreTitle);
    setTimeout(() => {
      window.print();
      setTimeout(restoreTitle, 1000);
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-gray-950/45 px-3 pb-3 pt-10">
      <div className="max-h-[88vh] w-full overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="report-modal-actions flex items-start justify-between gap-3 border-b border-gray-100 p-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-[#1677ff]">
              {report.badge} · {report.source}
            </div>
            <h3 className="mt-0.5 text-[18px] font-bold leading-6 text-gray-950">
              报告预览
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 active:bg-gray-200"
            aria-label="关闭报告预览"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-142px)] overflow-y-auto bg-gray-100 p-3">
          <ReportScreenDocument report={report} />
          <ReportPrintDocument report={report} />
        </div>

        <div className="report-modal-actions grid grid-cols-3 gap-2 border-t border-gray-100 bg-white p-3">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-gray-100 text-[13px] font-bold text-gray-700 active:bg-gray-200 disabled:opacity-70"
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            重生成
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#1677ff] text-[13px] font-bold text-white active:bg-[#0958d9]"
          >
            <Printer className="h-4 w-4" />
            导出PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportScreenDocument({ report }: { report: StatsReport }) {
  return (
    <article className="report-screen-document rounded-lg bg-white p-4 text-gray-950">
      <ReportDocumentBody report={report} />
    </article>
  );
}

function ReportPrintDocument({ report }: { report: StatsReport }) {
  const visualPages = chunkArray(report.visuals, 2);
  const sectionPages = buildReportSectionPages(report.sections);
  let pageNumber = 1;

  return (
    <article className="report-print-document text-gray-950">
      <ReportPage pageNumber={pageNumber++}>
        <ReportCoverHeader report={report} />
        <ReportExecutiveSummary report={report} />
        <ReportKpiSection report={report} />
      </ReportPage>

      {visualPages.map((visuals, index) => (
        <ReportPage key={`visual-page-${index}`} pageNumber={pageNumber++}>
          <ReportBlockHeader
            title="图表诊断"
            badge="数据可视化"
            description="按完整图表卡片分页，避免雷达图、柱状图在页面中间被切开。"
          />
          <div className="mt-3 grid gap-3">
            {visuals.map((visual) => (
              <ReportVisualCard
                key={`${visual.kind}-${visual.title}`}
                visual={visual}
              />
            ))}
          </div>
        </ReportPage>
      ))}

      {sectionPages.map((sections, index) => (
        <ReportPage key={`section-page-${index}`} pageNumber={pageNumber++}>
          <ReportBlockHeader
            title="文字说明与整改闭环"
            badge={index === 0 ? "可汇报" : "续页"}
            description="AI 结论、整改动作和统计依据按内容长度自动拆页。"
          />
          <ReportSectionsList sections={sections} />
        </ReportPage>
      ))}
    </article>
  );
}

function ReportDocumentBody({ report }: { report: StatsReport }) {
  return (
    <>
      <ReportCoverHeader report={report} />
      <ReportExecutiveSummary report={report} />
      <ReportKpiSection report={report} />

      {report.visuals.length > 0 && (
        <ReportBlockHeader title="图表诊断" badge="数据可视化" />
      )}

      {report.visuals.length > 0 && (
        <div className="mt-2 grid gap-3">
          {report.visuals.map((visual) => (
            <ReportVisualCard key={`${visual.kind}-${visual.title}`} visual={visual} />
          ))}
        </div>
      )}

      <ReportBlockHeader title="文字说明与整改闭环" badge="可汇报" />
      <ReportSectionsList sections={report.sections} />
    </>
  );
}

function ReportPage({
  pageNumber,
  children,
}: {
  key?: string | number;
  pageNumber: number;
  children: ReactNode;
}) {
  return (
    <section className="report-page">
      <div className="report-page-watermark">
        {String(pageNumber).padStart(2, "0")}
      </div>
      {children}
    </section>
  );
}

function ReportBlockHeader({
  title,
  badge,
  description,
}: {
  title: string;
  badge: string;
  description?: string;
}) {
  return (
    <div className="mt-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[16px] font-bold leading-6">{title}</h2>
        {description && (
          <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
            {description}
          </p>
        )}
      </div>
      <span className="shrink-0 rounded bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
        {badge}
      </span>
    </div>
  );
}

function ReportKpiSection({ report }: { report: StatsReport }) {
  return (
    <>
      <ReportBlockHeader title="领导核心数据" badge="一眼判断" />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {report.kpis.map((item) => (
          <div key={item.label} className="rounded-lg bg-gray-50 p-3">
            <div className="text-[11px] font-medium text-gray-500">
              {item.label}
            </div>
            <div className="mt-1 text-[20px] font-bold leading-none">
              {item.value}
            </div>
            {item.helper && (
              <div className="mt-1 text-[10px] text-gray-400">
                {item.helper}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function ReportSectionsList({ sections }: { sections: ReportSection[] }) {
  return (
    <div className="mt-5 space-y-5">
      {sections.map((section, sectionIndex) => (
        <ReportSectionBlock
          key={`${section.title}-${sectionIndex}`}
          section={section}
        />
      ))}
    </div>
  );
}

function ReportSectionBlock({
  section,
}: {
  key?: string | number;
  section: ReportSection;
}) {
  return (
    <section className="report-section-block">
      <h2 className="text-[16px] font-bold leading-6">{section.title}</h2>
      {section.paragraphs && (
        <div className="mt-2 space-y-2 text-[13px] leading-6 text-gray-700">
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}
      {section.bullets && (
        <ul className="mt-2 space-y-1.5 text-[13px] leading-5 text-gray-700">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1677ff]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
      {section.rows && section.rows.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full min-w-[420px] text-left text-[11px]">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {Object.keys(section.rows[0]).map((key) => (
                  <th key={key} className="px-2 py-2 font-semibold">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-gray-100">
                  {Object.values(row).map((value, valueIndex) => (
                    <td key={valueIndex} className="px-2 py-2">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function buildReportSectionPages(sections: ReportSection[]) {
  const normalized = sections.flatMap(splitOversizedReportSection);
  const pages: ReportSection[][] = [];
  let currentPage: ReportSection[] = [];
  let currentWeight = 0;
  const maxPageWeight = 30;

  normalized.forEach((section) => {
    const weight = getReportSectionWeight(section);
    const shouldStartNewPage =
      currentPage.length > 0 && currentWeight + weight > maxPageWeight;

    if (shouldStartNewPage) {
      pages.push(currentPage);
      currentPage = [];
      currentWeight = 0;
    }

    currentPage.push(section);
    currentWeight += weight;
  });

  if (currentPage.length > 0) pages.push(currentPage);

  return pages.length > 0 ? pages : [[]];
}

function splitOversizedReportSection(section: ReportSection): ReportSection[] {
  if (section.rows && section.rows.length > 8) {
    return chunkArray(section.rows, 8).map((rows, index) => ({
      ...section,
      title: index === 0 ? section.title : `${section.title}（续 ${index + 1}）`,
      paragraphs: index === 0 ? section.paragraphs : undefined,
      bullets: index === 0 ? section.bullets : undefined,
      rows,
    }));
  }

  if (section.bullets && section.bullets.length > 6) {
    return chunkArray(section.bullets, 6).map((bullets, index) => ({
      ...section,
      title: index === 0 ? section.title : `${section.title}（续 ${index + 1}）`,
      paragraphs: index === 0 ? section.paragraphs : undefined,
      bullets,
    }));
  }

  return [section];
}

function getReportSectionWeight(section: ReportSection) {
  const paragraphWeight =
    section.paragraphs?.reduce(
      (sum, paragraph) => sum + Math.max(2, Math.ceil(paragraph.length / 56)),
      0,
    ) ?? 0;
  const bulletWeight =
    section.bullets?.reduce(
      (sum, bullet) => sum + Math.max(1.5, Math.ceil(bullet.length / 42)),
      0,
    ) ?? 0;
  const rowWeight = section.rows ? 4 + section.rows.length * 2 : 0;

  return 4 + paragraphWeight + bulletWeight + rowWeight;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function ReportCoverHeader({ report }: { report: StatsReport }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <div className="flex items-start justify-between gap-4 bg-gray-950 p-4 text-white">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">
            Campus Sports Health
          </div>
          <h1 className="mt-2 text-[24px] font-black leading-8">
            {report.title}
          </h1>
          <p className="mt-2 max-w-[760px] text-[12px] leading-5 text-gray-300">
            {report.subtitle}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[20px] font-bold text-blue-200">AI Report</div>
          <div className="mt-1 rounded bg-white/10 px-2 py-1 text-[10px] font-semibold text-gray-200">
            {report.badge}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 bg-gray-50 px-4 py-3 text-[11px] text-gray-500">
        <span className="rounded bg-white px-2 py-1 shadow-sm">
          生成时间：{report.generatedAt}
        </span>
        <span className="rounded bg-white px-2 py-1 shadow-sm">
          来源：{report.source}
        </span>
        <span className="rounded bg-white px-2 py-1 shadow-sm">
          结构：政策判断 / 结论 / 优缺点 / 整改 / 追踪
        </span>
      </div>
    </div>
  );
}

function ReportExecutiveSummary({ report }: { report: StatsReport }) {
  const conclusion = getReportSection(report, "综合结论");
  const advantage = getReportSection(report, "优点");
  const risk = getReportSection(report, "缺陷") || getReportSection(report, "风险");
  const suggestion = getReportSection(report, "整改建议");
  const policy = getReportSection(report, "政策落实");
  const mainText =
    conclusion?.paragraphs?.[0] ||
    policy?.paragraphs?.[0] ||
    policy?.bullets?.[0] ||
    "本报告依据当前统计数据生成学校体育与学生健康治理判断。";
  const cards = [
    {
      label: "本月亮点",
      title: "优点",
      text: advantage?.bullets?.[0] || "基础数据与统计链路已形成，可支撑月度监测。",
      color: "#10b981",
    },
    {
      label: "主要短板",
      title: "风险",
      text: risk?.bullets?.[0] || "需要继续关注低参与、低达标和数据缺口。",
      color: "#ef4444",
    },
    {
      label: "管理动作",
      title: "整改",
      text: suggestion?.bullets?.[0] || "建议建立重点对象清单并按周复盘。",
      color: "#1677ff",
    },
  ];

  return (
    <section className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#1677ff]" />
          <span className="text-[12px] font-bold text-[#1677ff]">
            AI本月综合判断
          </span>
        </div>
        <p className="mt-2 text-[18px] font-black leading-7 text-gray-950">
          {mainText}
        </p>
        {policy?.bullets && (
          <div className="mt-3 grid gap-2 text-[12px] leading-5 text-gray-600">
            {policy.bullets.slice(0, 2).map((item) => (
              <div key={item} className="rounded bg-white px-3 py-2">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2">
        {cards.map((card) => (
          <div
            key={card.title}
            className="grid grid-cols-[5px_1fr] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm"
          >
            <div style={{ backgroundColor: card.color }} />
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-gray-400">
                  {card.label}
                </span>
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: card.color }}
                >
                  {card.title}
                </span>
              </div>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-gray-800">
                {card.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function getReportSection(report: StatsReport, keyword: string) {
  return report.sections.find((section) => section.title.includes(keyword));
}

function ReportVisualCard({ visual }: { key?: string; visual: ReportVisual }) {
  return (
    <section className="report-visual-card min-w-0 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold leading-5 text-gray-950">
            {visual.title}
          </h2>
          <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
            {visual.subtitle}
          </p>
        </div>
      </div>

      {visual.kind === "donut" && <DonutVisual visual={visual} />}
      {visual.kind === "bar" && <BarVisual visual={visual} />}
      {visual.kind === "radar" && <RadarVisual visual={visual} />}
      {visual.kind === "stacked" && <StackedVisual visual={visual} />}
    </section>
  );
}

function DonutVisual({
  visual,
}: {
  visual: Extract<ReportVisual, { kind: "donut" }>;
}) {
  const total = visual.data.reduce((sum, item) => sum + item.value, 0);
  let start = 0;
  const gradient =
    total > 0
      ? visual.data
          .map((item) => {
            const angle = (item.value / total) * 360;
            const segment = `${item.color} ${start}deg ${start + angle}deg`;
            start += angle;
            return segment;
          })
          .join(", ")
      : "#e5e7eb 0deg 360deg";

  return (
    <div className="mt-3 grid grid-cols-[150px_1fr] items-center gap-2">
      <div className="relative h-[150px] min-w-0">
        <div
          className="absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        />
        <div className="absolute left-1/2 top-1/2 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-inner" />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[20px] font-black leading-none text-gray-950">
            {visual.centerValue}
          </div>
          <div className="mt-1 text-[10px] font-medium text-gray-400">
            {visual.centerLabel}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {visual.data.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-[12px] font-medium text-gray-600">
                {item.name}
              </span>
            </div>
            <span className="text-[12px] font-bold text-gray-950">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarVisual({
  visual,
}: {
  visual: Extract<ReportVisual, { kind: "bar" }>;
}) {
  const maxValue = Math.max(1, ...visual.data.map((item) => item.value));

  return (
    <div className="mt-3 overflow-x-auto pb-1">
      <div
        className="grid h-[210px] items-end gap-2 border-b border-gray-100"
        style={{
          gridTemplateColumns: `repeat(${visual.data.length}, minmax(34px, 1fr))`,
          minWidth: Math.max(360, visual.data.length * 48),
        }}
      >
        {visual.data.map((item) => {
          const height = Math.max(6, Math.round((item.value / maxValue) * 150));
          return (
            <div key={item.name} className="flex h-full min-w-0 flex-col justify-end">
              <div className="mb-1 text-center text-[10px] font-bold text-gray-600">
                {item.value}
                {visual.unit}
              </div>
              <div className="flex h-[150px] items-end justify-center">
                <div
                  className="w-full max-w-[28px] rounded-t-md"
                  style={{
                    height,
                    backgroundColor: item.color || "#1677ff",
                  }}
                />
              </div>
              <div className="mt-2 h-8 text-center text-[9px] leading-3 text-gray-500">
                {item.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadarVisual({
  visual,
}: {
  visual: Extract<ReportVisual, { kind: "radar" }>;
}) {
  const size = 220;
  const center = size / 2;
  const radius = 76;
  const angleStep = (Math.PI * 2) / Math.max(1, visual.data.length);
  const getPoint = (index: number, value: number, extra = 0) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const currentRadius = radius * value + extra;
    return {
      x: center + Math.cos(angle) * currentRadius,
      y: center + Math.sin(angle) * currentRadius,
    };
  };
  const polygonPoints = visual.data
    .map((item, index) => {
      const point = getPoint(index, Math.min(100, item.value) / 100);
      return `${point.x},${point.y}`;
    })
    .join(" ");
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="mt-3 flex justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-[230px] w-full max-w-[280px]"
        role="img"
        aria-label={visual.title}
      >
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={visual.data
              .map((_, index) => {
                const point = getPoint(index, level);
                return `${point.x},${point.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        {visual.data.map((item, index) => {
          const end = getPoint(index, 1);
          const label = getPoint(index, 1, 20);
          return (
            <g key={item.name}>
              <line
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="#eef2f7"
                strokeWidth="1"
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="#4b5563"
              >
                {item.name}
              </text>
            </g>
          );
        })}
        <polygon
          points={polygonPoints}
          fill="#1677ff"
          fillOpacity="0.26"
          stroke="#1677ff"
          strokeWidth="2"
        />
        {visual.data.map((item, index) => {
          const point = getPoint(index, Math.min(100, item.value) / 100);
          return <circle key={item.name} cx={point.x} cy={point.y} r="3" fill="#1677ff" />;
        })}
      </svg>
    </div>
  );
}

function StackedVisual({
  visual,
}: {
  visual: Extract<ReportVisual, { kind: "stacked" }>;
}) {
  const priorityStyle = {
    高: "bg-red-50 text-red-600 ring-red-100",
    中: "bg-amber-50 text-amber-600 ring-amber-100",
    低: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  };

  return (
    <div className="mt-3">
      <div className="space-y-3">
        {visual.data.map((row) => {
          const total = Math.max(1, row.达标 + row.待提升 + row.风险);
          const segments = [
            { key: "达标", value: row.达标, color: "#10b981" },
            { key: "待提升", value: row.待提升, color: "#f59e0b" },
            { key: "风险", value: row.风险, color: "#ef4444" },
          ];
          return (
            <div
              key={row.name}
              className="rounded-xl border border-gray-100 bg-gray-50/70 p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-800">{row.name}</span>
                    {row.priority && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${
                          priorityStyle[row.priority]
                        }`}
                      >
                        {row.priority}优先级
                      </span>
                    )}
                  </div>
                  {row.insight && (
                    <p className="mt-1 text-[11px] leading-4 text-gray-500">
                      {row.insight}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded bg-white px-2 py-1 text-[10px] font-bold text-gray-400 shadow-sm">
                  合计 {total}
                  {visual.unit}
                </span>
              </div>
              <div className="flex h-8 overflow-hidden rounded-md bg-gray-100">
                {segments.map((segment) => (
                  <div
                    key={segment.key}
                    className="flex items-center justify-center text-[10px] font-bold text-white"
                    style={{
                      width: `${(segment.value / total) * 100}%`,
                      minWidth: segment.value > 0 ? 16 : 0,
                      backgroundColor: segment.color,
                    }}
                  >
                    {segment.value > 0 ? segment.value : ""}
                  </div>
                ))}
              </div>
              {row.action && (
                <div className="mt-2 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold leading-4 text-gray-700">
                  建议动作：{row.action}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-gray-500">
        <LegendDot color="#10b981" label="达标" />
        <LegendDot color="#f59e0b" label="待提升" />
        <LegendDot color="#ef4444" label="风险" />
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
    <div className="mt-5 border-t border-white/48 pt-4">
      <div className="rounded-[24px] border border-white/62 bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(225,239,255,0.46))] p-4 text-slate-950 shadow-[0_18px_44px_rgba(83,105,132,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[12px] font-medium text-[#1677ff]">
                Top level 全域管理驾驶舱
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/65 bg-white/54 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] active:bg-white/72"
                aria-label="查看采集说明"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-1 text-[22px] font-bold leading-tight">
              12 大类指标与指数数据
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              只对校长/体育主管开放，覆盖运动、作业、成绩、睡眠、心理、家庭和环境。
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/68 bg-white/62 px-3 py-2 text-right text-gray-950 shadow-[0_12px_28px_rgba(83,105,132,0.14),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl">
            <div className="text-[24px] font-bold leading-none">{averageScore}</div>
            <div className="mt-0.5 text-[10px] text-gray-500">综合均值</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
          <div className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-white/56 bg-white/46 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
            <HeartPulse className="h-3.5 w-3.5 shrink-0 text-[#1677ff]" />
            <span className="truncate">{categories.length}类</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-white/56 bg-white/46 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
            <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[#1677ff]" />
            <span className="truncate">{metricCount}项</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-white/56 bg-white/46 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
            <Timer className="h-3.5 w-3.5 shrink-0 text-[#1677ff]" />
            <span className="truncate">{getMonthLabel(statsMonth)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-white/58 bg-white/36 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl">
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
            className="h-11 w-full appearance-none rounded-2xl border border-white/70 bg-white/62 pl-3 pr-9 text-[14px] font-bold text-gray-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none backdrop-blur-xl focus:border-[#1677ff]"
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
    </div>
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
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
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
    <div className="min-w-0 rounded-2xl border border-white/58 bg-white/38 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl">
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
            className={`shrink-0 rounded-2xl px-3 py-2 text-[13px] font-semibold backdrop-blur-xl ${
              value === item
                ? "bg-slate-950/88 text-white shadow-[0_12px_24px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.18)]"
                : "bg-white/44 text-gray-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]"
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
    blue: "bg-blue-50/70 text-blue-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    green: "bg-emerald-50/70 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    amber: "bg-amber-50/70 text-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    rose: "bg-rose-50/70 text-rose-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
  }[tone];

  return (
    <div className="rounded-[22px] border border-white/58 bg-white/38 p-3 shadow-[0_12px_28px_rgba(83,105,132,0.10),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl">
      <div className={`flex h-8 w-8 items-center justify-center rounded-2xl ${toneClass}`}>
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

function CollapsibleStatsSection({
  id,
  icon,
  title,
  aside,
  children,
  defaultOpen = false,
  headerAction,
  forceOpenSignal = 0,
}: {
  id?: string;
  icon: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  headerAction?: ReactNode;
  forceOpenSignal?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpenSignal > 0) {
      setOpen(true);
    }
  }, [forceOpenSignal]);

  return (
    <section
      id={id}
      className="rounded-[24px] border border-white/64 bg-white/42 p-4 shadow-[0_16px_42px_rgba(83,105,132,0.13),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/62 bg-white/52 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold text-gray-950">
              {title}
            </h2>
            {aside && (
              <div className="mt-0.5 truncate text-[11px] font-medium text-gray-400">
                {aside}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {headerAction}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "收起板块" : "展开板块"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/62 bg-white/48 text-gray-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition backdrop-blur-xl active:bg-white/70"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {open && <div className="mt-4">{children}</div>}
    </section>
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
        <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/62 bg-white/52 text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
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
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/56 shadow-[inset_0_1px_2px_rgba(83,105,132,0.16)]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#1677ff,#66b7ff)]" style={{ width: `${width}%` }} />
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
      <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-[13px] font-bold text-[#1677ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
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
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/56 shadow-[inset_0_1px_2px_rgba(83,105,132,0.16)]">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#10b981,#6ee7b7)]" style={{ width: `${rate}%` }} />
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
