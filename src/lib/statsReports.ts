import type {
  Category,
  Project,
  Record as SportRecord,
  Student,
} from "../store";
import { getStudentLabel, getTotalTimes } from "./sportMetrics";
import { toPercent } from "./studentIndexMetrics";

export type StatsReportKind = "activity-detail" | "policy-ai";
export type StatsReportScope = "school" | "grade" | "class" | "student";

export type ReportKpi = {
  label: string;
  value: string;
  helper?: string;
};

export type ReportSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  rows?: Array<Record<string, string | number>>;
};

export type ReportVisual =
  | {
      kind: "donut";
      title: string;
      subtitle: string;
      centerLabel: string;
      centerValue: string;
      data: Array<{ name: string; value: number; color: string }>;
    }
  | {
      kind: "bar";
      title: string;
      subtitle: string;
      unit: string;
      data: Array<{ name: string; value: number; color?: string }>;
    }
  | {
      kind: "radar";
      title: string;
      subtitle: string;
      data: Array<{ name: string; value: number }>;
    }
  | {
      kind: "stacked";
      title: string;
      subtitle: string;
      unit: string;
      data: Array<{
        name: string;
        达标: number;
        待提升: number;
        风险: number;
        insight?: string;
        action?: string;
        priority?: "高" | "中" | "低";
      }>;
    };

export type StatsReport = {
  kind: StatsReportKind;
  title: string;
  subtitle: string;
  badge: string;
  generatedAt: string;
  source: "AI生成" | "本地分析";
  kpis: ReportKpi[];
  visuals: ReportVisual[];
  sections: ReportSection[];
};

export type CategoryReportRow = {
  name: string;
  totalTimes: number;
  participants: number;
  target: number;
};

export type ProjectReportRow = {
  name: string;
  category: string;
  totalTimes: number;
  participants: number;
};

export type DrillReportRow = {
  id?: string;
  name: string;
  totalTimes: number;
  participants?: number;
  students?: number;
  records?: number;
  rate?: number;
  className?: string;
  category?: string;
};

export type AnalyticsReportCategory = {
  id: string;
  title: string;
  subtitle: string;
  score: number;
  scoreLabel: string;
  metrics: Array<{
    name: string;
    value: string | number;
    unit?: string;
    trend?: string;
    source: "已接入" | "待接入" | "模型";
  }>;
};

export type StatsReportInput = {
  scope: StatsReportScope;
  targetLabel: string;
  statsMonth: string;
  students: Student[];
  records: SportRecord[];
  projects: Project[];
  categories: Category[];
  categoryRows: CategoryReportRow[];
  projectRows: ProjectReportRow[];
  drillRows: DrillReportRow[];
  analyticsCategories: AnalyticsReportCategory[];
};

export type StatsAiReply = {
  text: string;
  source: "AI生成" | "本地分析";
};

export type StatsAiAttachmentKind = "image" | "video" | "audio" | "file";

export type StatsAiAttachmentInput = {
  id: string;
  kind: StatsAiAttachmentKind;
  name: string;
  type: string;
  size: number;
  file?: File;
};

type CozeUploadedAttachment = {
  id: string;
  file_id?: string;
  kind: StatsAiAttachmentKind;
  name: string;
  type: string;
  size: number;
};

type AiReportJson = {
  summary?: string;
  policyJudgement?: string[];
  advantages?: string[];
  defects?: string[];
  focusTargets?: string[];
  suggestions?: string[];
  nextMonthMetrics?: string[];
};

type StatsAiHistoryMessage = {
  role: "user" | "assistant";
  text: string;
};

type CozeWorkflowResponse = {
  code?: number;
  msg?: string;
  data?: unknown;
  debug_url?: string;
};

type CozeWorkflowMode = "policy_report" | "stats_chat";

const policyBasis = [
  "坚持健康第一，把学生体质健康作为学校体育工作的核心结果。",
  "落实每天综合体育活动、体育课、大课间和课后体育锻炼的常态化要求。",
  "关注国家学生体质健康标准相关的达标率、优良率、低分和下降人群。",
  "推进教会、勤练、常赛，既看参与覆盖，也看运动质量和持续习惯。",
  "把睡眠、作业、心理、伤病、肥胖近视防控纳入学生健康治理闭环。",
  "形成监测、分析、预警、干预、复盘的学校体育管理闭环。",
];

export function buildActivityDetailReport(input: StatsReportInput): StatsReport {
  const facts = getReportFacts(input);
  const weakCategories = getWeakCategories(input.categoryRows);
  const strongCategories = [...input.categoryRows]
    .sort((a, b) => b.totalTimes - a.totalTimes)
    .slice(0, 3);
  const topProjects = input.projectRows.slice(0, 8);
  const activityRows = input.projectRows.map((project) => ({
    项目: project.name,
    类别: project.category,
    参与人数: project.participants,
    完成次数: project.totalTimes,
  }));

  return {
    kind: "activity-detail",
    title: `${input.targetLabel}${getMonthLabel(input.statsMonth)}活动明细数据报告`,
    subtitle: "覆盖当前统计范围内所有活动、分类、参与和完成数据，并给出简要优缺点解释。",
    badge: "活动明细",
    generatedAt: formatReportTime(),
    source: "本地分析",
    kpis: buildBaseKpis(facts),
    visuals: buildActivityVisuals(input, facts),
    sections: [
      {
        title: "一、数据概览",
        paragraphs: [
          `${input.targetLabel}本月共形成 ${facts.recordCount} 条有效活动记录，${facts.participantCount}/${facts.studentCount} 名学生有参与记录，参与率为 ${facts.participationRate}%。`,
          `合格记录 ${facts.passedRecordCount} 条，按记录口径测算达标率为 ${facts.passRate}%，累计完成 ${facts.totalTimes} 次。`,
        ],
      },
      {
        title: "二、Pro / 优点",
        bullets: [
          facts.participationRate >= 70
            ? `参与覆盖达到 ${facts.participationRate}%，说明运动打卡已具备较好的基础覆盖。`
            : `已有 ${facts.participantCount} 名学生产生记录，系统可以识别参与基础和未覆盖群体。`,
          facts.passRate >= 75
            ? `达标率 ${facts.passRate}% 处于可汇报水平，说明大部分有效记录质量合格。`
            : `已形成达标率口径，可用于定位项目难度、学生能力和审核标准之间的偏差。`,
          strongCategories.length > 0
            ? `优势分类集中在 ${strongCategories.map((item) => item.name).join("、")}，可作为后续示范项目。`
            : "项目数据结构已经覆盖分类、项目、人数和次数，具备持续追踪基础。",
        ],
      },
      {
        title: "三、Cons / 缺点",
        bullets: [
          facts.participationRate < 85
            ? `参与率距离全覆盖仍有差距，未参与或低频参与学生需要单独拉清单。`
            : "虽然参与率较高，但仍需持续关注低频和中断学生，避免只看总量。",
          weakCategories.length > 0
            ? `薄弱分类为 ${weakCategories.map((item) => `${item.name}(${item.progress}%)`).join("、")}，说明运动结构不够均衡。`
            : "分类完成情况整体较均衡，但仍需检查各项目是否长期集中在少数学生。",
          facts.projectCount > 0 && topProjects.length < facts.projectCount
            ? "部分活动项目贡献度较低，建议继续看项目参与人数，而不只看总完成次数。"
            : "当前项目数量较少，后续应增加不同运动能力和兴趣方向的项目选择。",
        ],
      },
      {
        title: "四、分类完成情况",
        rows: input.categoryRows.map((row) => ({
          分类: row.name,
          参与人数: row.participants,
          完成次数: row.totalTimes,
          目标下限: row.target,
          完成度: `${getTargetProgress(row.totalTimes, row.target)}%`,
        })),
      },
      {
        title: "五、所有活动明细",
        rows: activityRows,
      },
    ],
  };
}

export async function buildPolicyAiReport(
  input: StatsReportInput,
): Promise<StatsReport> {
  const fallback = buildPolicyFallbackReport(input);
  const workflowId = getCozeWorkflowId("policy_report");

  try {
    const prompt = buildPolicyPrompt(input);
    const response = await runCozeWorkflow(workflowId, {
      mode: "policy_report",
      input: prompt,
      prompt,
      output_format: "json",
      target_label: input.targetLabel,
      stats_month: input.statsMonth,
      stats_context: JSON.stringify(buildPolicyPayload(input)),
    });
    const parsed = parseAiReportFromUnknown(response);
    const aiText = extractCozeText(response).trim();

    if (parsed) return buildPolicyReportFromAiJson(input, fallback, parsed);
    if (aiText) return buildPolicyReportFromAiText(input, fallback, aiText);

    return fallback;
  } catch {
    return fallback;
  }
}

export async function askStatsAi(
  input: StatsReportInput,
  question: string,
  history: StatsAiHistoryMessage[] = [],
  attachments: StatsAiAttachmentInput[] = [],
): Promise<StatsAiReply> {
  const fallback = buildStatsAiFallbackReply(input, question);
  const workflowId = getCozeWorkflowId("stats_chat");

  try {
    const uploadedAttachments = await uploadCozeAttachments(attachments);
    const prompt = buildStatsAiPrompt(
      input,
      question,
      history,
      uploadedAttachments,
    );
    const response = await runCozeWorkflow(workflowId, {
      mode: "stats_chat",
      input: prompt,
      prompt,
      question,
      user_input: question,
      BOT_USER_INPUT: question,
      target_label: input.targetLabel,
      stats_month: input.statsMonth,
      history: JSON.stringify(history.slice(-6)),
      attachments: JSON.stringify(uploadedAttachments),
      stats_context: JSON.stringify(buildStatsContextPayload(input)),
    });
    const text = extractCozeText(response).trim();

    if (!text) return fallback;

    return {
      text,
      source: "AI生成",
    };
  } catch {
    return fallback;
  }
}

function getCozeWorkflowId(mode: CozeWorkflowMode) {
  if (mode === "policy_report") {
    return process.env.COZE_POLICY_WORKFLOW_ID || process.env.COZE_WORKFLOW_ID;
  }

  return process.env.COZE_CHAT_WORKFLOW_ID || process.env.COZE_WORKFLOW_ID;
}

async function runCozeWorkflow(
  workflowId: string | undefined,
  parameters: Record<string, unknown>,
) {
  const token = process.env.COZE_API_TOKEN;

  if (!token || !workflowId) {
    throw new Error("Missing Coze workflow config");
  }

  const apiBase = (process.env.COZE_API_BASE || "https://api.coze.cn").replace(
    /\/$/,
    "",
  );
  const requestBody: Record<string, unknown> = {
    workflow_id: workflowId,
    parameters: shouldStringifyCozeParameters()
      ? JSON.stringify(parameters)
      : parameters,
  };

  if (process.env.COZE_BOT_ID) requestBody.bot_id = process.env.COZE_BOT_ID;
  if (process.env.COZE_APP_ID) requestBody.app_id = process.env.COZE_APP_ID;

  const response = await fetch(`${apiBase}/v1/workflow/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Coze workflow request failed: ${response.status}`);
  }

  const result = (await response.json()) as CozeWorkflowResponse;

  if (typeof result.code === "number" && result.code !== 0) {
    throw new Error(result.msg || `Coze workflow failed: ${result.code}`);
  }

  return result.data ?? result;
}

async function uploadCozeAttachments(attachments: StatsAiAttachmentInput[]) {
  if (attachments.length === 0) return [];

  return Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment.file) return toAttachmentPayload(attachment);

      try {
        const fileId = await uploadCozeFile(attachment.file);
        return {
          ...toAttachmentPayload(attachment),
          file_id: fileId,
        };
      } catch {
        return toAttachmentPayload(attachment);
      }
    }),
  );
}

async function uploadCozeFile(file: File) {
  const token = process.env.COZE_API_TOKEN;
  if (!token) throw new Error("Missing Coze token");

  const apiBase = (process.env.COZE_API_BASE || "https://api.coze.cn").replace(
    /\/$/,
    "",
  );
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBase}/v1/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Coze file upload failed: ${response.status}`);
  }

  const result = (await response.json()) as CozeWorkflowResponse;
  if (typeof result.code === "number" && result.code !== 0) {
    throw new Error(result.msg || `Coze file upload failed: ${result.code}`);
  }

  const data = parseMaybeJson(result.data);
  if (!isRecord(data)) throw new Error("Missing Coze file data");

  const fileId =
    data.file_id ||
    data.id ||
    (isRecord(data.file) ? data.file.id || data.file.file_id : undefined);

  if (typeof fileId !== "string" || !fileId) {
    throw new Error("Missing Coze file id");
  }

  return fileId;
}

function toAttachmentPayload(
  attachment: StatsAiAttachmentInput,
): CozeUploadedAttachment {
  return {
    id: attachment.id,
    kind: attachment.kind,
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
  };
}

function shouldStringifyCozeParameters() {
  return process.env.COZE_PARAMETERS_FORMAT === "string";
}

export function buildPolicyFallbackReport(input: StatsReportInput): StatsReport {
  const facts = getReportFacts(input);
  const analytics = input.analyticsCategories;
  const averageScore = getAverageScore(analytics);
  const lowestScores = [...analytics].sort((a, b) => a.score - b.score).slice(0, 4);
  const highestScores = [...analytics].sort((a, b) => b.score - a.score).slice(0, 3);
  const weakCategories = getWeakCategories(input.categoryRows);
  const lowRows = input.drillRows
    .filter((row) => typeof row.rate === "number" && row.rate < 60)
    .slice(0, 5);
  const inactiveStudents = getInactiveStudents(input);

  return {
    kind: "policy-ai",
    title: `${input.targetLabel}${getMonthLabel(input.statsMonth)}学校体育与学生健康治理报告`,
    subtitle:
      "依据中小学体育教育、学生体质健康管理和健康学校建设相关政策口径，对本月统计数据形成治理结论。",
    badge: "政策AI报告",
    generatedAt: formatReportTime(),
    source: "本地分析",
    kpis: [
      {
        label: "综合健康治理指数",
        value: `${averageScore}分`,
        helper: getScoreJudgement(averageScore),
      },
      {
        label: "体质运动达标率",
        value: `${facts.passRate}%`,
        helper: "政策落实硬指标",
      },
      {
        label: "重点风险学生",
        value: `${getRiskStudentCount(input)}人`,
        helper: "零参与或无达标记录",
      },
      {
        label: "参与覆盖率",
        value: `${facts.participationRate}%`,
        helper: `${facts.participantCount}/${facts.studentCount}人参与`,
      },
      {
        label: "有效记录",
        value: `${facts.recordCount}条`,
        helper: "本月统计样本",
      },
      {
        label: "完成次数",
        value: `${facts.totalTimes}次`,
        helper: "达标记录折算",
      },
    ],
    visuals: buildPolicyVisuals(input, facts, analytics),
    sections: [
      {
        title: "一、政策落实判断",
        bullets: [
          `从“健康第一”和学生体质健康管理要求看，当前已具备活动记录、分类统计、达标判断和层级钻取能力，能够支撑学校开展月度监测。`,
          facts.participationRate >= 80
            ? `参与率 ${facts.participationRate}% 表明体育活动覆盖较好，基本具备常态化锻炼基础。`
            : `参与率 ${facts.participationRate}% 尚未达到理想覆盖，需要把低参与学生纳入体质健康管理闭环。`,
          `从“教会、勤练、常赛”和健康学校建设角度看，后续还应补齐睡眠、心理、伤病、体育课占用和家庭支持数据。`,
        ],
      },
      {
        title: "二、本月综合结论",
        paragraphs: [
          `${input.targetLabel}本月综合均值约 ${averageScore} 分，整体判断为${getScoreJudgement(averageScore)}。`,
          `本月共有 ${facts.recordCount} 条有效记录，${facts.participantCount}/${facts.studentCount} 名学生参与，累计完成 ${facts.totalTimes} 次，记录达标率为 ${facts.passRate}%。`,
          highestScores.length > 0
            ? `优势维度集中在 ${highestScores.map((item) => `${item.title.replace(/^[一二三四五六七八九十]+、/, "")}${item.score}分`).join("、")}。`
            : "当前优势维度仍需随数据积累进一步确认。",
        ],
      },
      {
        title: "三、优点",
        bullets: [
          `基础数据和统计链路较完整，能够按学校、年级、班级、学生和项目多层级查看。`,
          facts.passRate >= 75
            ? `达标率 ${facts.passRate}% 说明活动质量总体可控，可作为阶段性工作亮点。`
            : `已建立达标判断口径，能够识别运动任务难度、执行质量和学生能力差异。`,
          highestScores.length > 0
            ? `${highestScores.map((item) => item.scoreLabel).join("、")}表现相对靠前，可沉淀为学校体育管理经验。`
            : "项目、分类和参与记录已经形成可追踪数据资产。",
        ],
      },
      {
        title: "四、缺陷/风险",
        bullets: [
          lowestScores.length > 0
            ? `低分维度为 ${lowestScores.map((item) => `${item.scoreLabel}${item.score}分`).join("、")}，提示治理短板不只在运动次数，也涉及恢复、压力、家庭或数据可信度。`
            : "当前缺陷需要继续通过更多维度数据识别。",
          weakCategories.length > 0
            ? `分类结构不均衡，${weakCategories.map((item) => item.name).join("、")}完成度偏低。`
            : "分类完成度暂未暴露明显短板，但仍需关注学生是否只集中完成少数项目。",
          inactiveStudents.length > 0
            ? `${inactiveStudents.length} 名学生本月暂无有效参与记录，应纳入班主任和体育教师联合提醒。`
            : "暂无明显零参与学生，但仍需追踪低频参与和连续中断情况。",
        ],
      },
      {
        title: "五、重点班级/学生",
        bullets: [
          lowRows.length > 0
            ? `优先关注 ${lowRows.map((row) => row.name).join("、")}，这些对象在当前口径下参与率或达标表现偏低。`
            : `当前层级未发现明显低于60%的对象，建议继续关注排名后20%的班级或学生。`,
          inactiveStudents.length > 0
            ? `零记录学生包括 ${inactiveStudents.slice(0, 6).map((student) => `${student.name}(${getStudentLabel(student)})`).join("、")}${inactiveStudents.length > 6 ? "等" : ""}。`
            : "无参与记录学生暂不突出，可改看低频、低达标、运动后疲劳高的人群。",
          "对运动限制、伤病、哮喘、肥胖、睡眠不足和心理压力高的学生，应避免只用统一次数要求评价。",
        ],
      },
      {
        title: "六、整改建议",
        bullets: [
          "建立“低参与学生清单、低达标项目清单、低活跃班级清单”三张表，按周复盘。",
          "考试周和作业高峰期保留低强度、短时长运动任务，避免运动习惯被学业压力完全打断。",
          "把热身、拉伸、运动后疲劳、伤病上报纳入打卡闭环，减少只重次数不重安全的问题。",
          "推动班主任、体育教师、家长协同，对零参与和连续中断学生做原因分类，而不是简单扣分。",
        ],
      },
      {
        title: "七、下月追踪指标",
        bullets: [
          "参与率、达标率、连续运动天数、人均运动次数。",
          "低参与学生人数、零记录学生人数、低达标分类数量。",
          "睡眠时长、作业压缩睡眠比例、考试周运动下降幅度。",
          "伤病/运动限制学生跟踪、体育课被占用节数、班级运动氛围。",
        ],
      },
    ],
  };
}

function buildPolicyPrompt(input: StatsReportInput) {
  const payload = buildPolicyPayload(input);
  const readableSummary = buildStatsReadableSummary(buildStatsContextPayload(input));

  return [
    "你是中国中小学体育与学生健康治理数据分析顾问。",
    "你已经获得当前统计页计算好的数据，必须基于【统计数据摘要】和【统计上下文JSON】生成报告。",
    "不要泛泛讲政策，不要要求用户补充统计数据，不要编造未提供的学校名称、班级、人数或具体政策条文编号。",
    "PDF 报告会直接使用你的返回内容，请让每条结论都带有可核对的数据依据，例如参与率、达标率、风险学生、薄弱分类、重点对象或低分指标。",
    "输出 JSON，字段为 summary, policyJudgement, advantages, defects, focusTargets, suggestions, nextMonthMetrics。",
    "summary 写 1 段综合结论；每个数组字段输出 3 到 5 条中文短句，语气面向校长、体育主管和教育局领导。",
    `【统计数据摘要】\n${readableSummary}`,
    `【统计上下文JSON】${JSON.stringify(payload)}`,
  ].join("\n\n");
}

function buildPolicyPayload(input: StatsReportInput) {
  const facts = getReportFacts(input);
  const weakCategories = getWeakCategories(input.categoryRows).map((item) => ({
    name: item.name,
    totalTimes: item.totalTimes,
    participants: item.participants,
    target: item.target,
    progress: item.progress,
  }));
  const analyticsSummary = input.analyticsCategories.map((item) => ({
    title: item.title,
    score: item.score,
    scoreLabel: item.scoreLabel,
    metrics: item.metrics.slice(0, 8),
  }));
  const payload = {
    scope: input.scope,
    targetLabel: input.targetLabel,
    statsMonth: input.statsMonth,
    facts,
    riskStudentCount: getRiskStudentCount(input),
    weakCategories,
    categoryRows: input.categoryRows,
    projectRows: input.projectRows.slice(0, 12),
    drillRows: input.drillRows.slice(0, 12),
    analyticsSummary,
    policyBasis,
  };

  return payload;
}

function buildPolicyReportFromAiJson(
  input: StatsReportInput,
  fallback: StatsReport,
  parsed: AiReportJson,
): StatsReport {
  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim()
      : "";
  const sections: ReportSection[] = [
    {
      title: "一、政策落实判断",
      paragraphs: [
        summary ||
          `${input.targetLabel}本月学校体育与学生健康治理整体处于可控状态，但仍需围绕参与、睡眠、压力和运动质量形成闭环。`,
      ],
      bullets: getAiReportBullets(parsed.policyJudgement, fallback.sections[0].bullets),
    },
    {
      title: "二、本月综合结论",
      paragraphs: summary ? [summary] : fallback.sections[1].paragraphs,
    },
    {
      title: "三、优点",
      bullets: getAiReportBullets(parsed.advantages, fallback.sections[2].bullets),
    },
    {
      title: "四、缺陷/风险",
      bullets: getAiReportBullets(parsed.defects, fallback.sections[3].bullets),
    },
    {
      title: "五、重点班级/学生",
      bullets: getAiReportBullets(parsed.focusTargets, fallback.sections[4].bullets),
    },
    {
      title: "六、整改建议",
      bullets: getAiReportBullets(parsed.suggestions, fallback.sections[5].bullets),
    },
    {
      title: "七、下月追踪指标",
      bullets: getAiReportBullets(parsed.nextMonthMetrics, fallback.sections[6].bullets),
    },
  ];

  return {
    ...fallback,
    source: "AI生成",
    sections: appendPolicyEvidenceSections(input, sections),
  };
}

function getAiReportBullets(value: unknown, fallback?: string[]) {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 5);
    return items.length > 0 ? items : fallback;
  }

  if (typeof value === "string" && value.trim()) {
    const items = normalizeAiReportLines(value).slice(0, 5);
    if (items.length > 0) return items;

    return splitAiTextIntoParagraphs(value).slice(0, 5);
  }

  return fallback;
}

function buildPolicyReportFromAiText(
  input: StatsReportInput,
  fallback: StatsReport,
  aiText: string,
): StatsReport {
  const paragraphs = splitAiTextIntoParagraphs(aiText);
  const lines = normalizeAiReportLines(aiText);
  const policyBullets =
    pickAiLines(lines, ["政策", "健康第一", "体质", "体育", "落实", "治理"], 4) ||
    fallback.sections[0].bullets;
  const advantageBullets =
    pickAiLines(lines, ["优势", "优点", "亮点", "较好", "可控", "提升"], 4) ||
    fallback.sections[2].bullets;
  const riskBullets =
    pickAiLines(lines, ["风险", "短板", "问题", "不足", "缺陷", "低", "未"], 5) ||
    fallback.sections[3].bullets;
  const focusBullets =
    pickAiLines(lines, ["重点", "班级", "学生", "对象", "低参与", "零记录"], 5) ||
    fallback.sections[4].bullets;
  const suggestionBullets =
    pickAiLines(lines, ["建议", "整改", "跟进", "优先", "复盘", "干预"], 5) ||
    fallback.sections[5].bullets;
  const metricBullets =
    pickAiLines(lines, ["下月", "指标", "监测", "追踪", "达标率", "参与率"], 5) ||
    fallback.sections[6].bullets;

  const sections: ReportSection[] = [
    {
      title: "一、政策落实判断",
      paragraphs: paragraphs.slice(0, 1),
      bullets: policyBullets,
    },
    {
      title: "二、本月综合结论",
      paragraphs: paragraphs.length > 0 ? paragraphs.slice(0, 3) : [aiText],
    },
    {
      title: "三、优点",
      bullets: advantageBullets,
    },
    {
      title: "四、缺陷/风险",
      bullets: riskBullets,
    },
    {
      title: "五、重点班级/学生",
      bullets: focusBullets,
    },
    {
      title: "六、整改建议",
      bullets: suggestionBullets,
    },
    {
      title: "七、下月追踪指标",
      bullets: metricBullets,
    },
  ];

  return {
    ...fallback,
    source: "AI生成",
    sections: appendPolicyEvidenceSections(input, sections),
  };
}

function appendPolicyEvidenceSections(
  input: StatsReportInput,
  sections: ReportSection[],
) {
  return [...sections, ...buildPolicyEvidenceSections(input)];
}

function buildPolicyEvidenceSections(input: StatsReportInput): ReportSection[] {
  const facts = getReportFacts(input);
  const weakCategories = getWeakCategories(input.categoryRows);
  const lowRows = [...input.drillRows]
    .filter((row) => typeof row.rate === "number")
    .sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100) || a.totalTimes - b.totalTimes)
    .slice(0, 8);

  return [
    {
      title: "八、AI统计依据明细",
      rows: [
        { 指标: "统计范围", 数值: input.targetLabel, 说明: input.scope },
        { 指标: "统计月份", 数值: input.statsMonth, 说明: "当前报告周期" },
        { 指标: "学生总数", 数值: `${facts.studentCount}人`, 说明: "当前权限范围" },
        {
          指标: "参与覆盖率",
          数值: `${facts.participationRate}%`,
          说明: `${facts.participantCount}/${facts.studentCount}人参与`,
        },
        {
          指标: "体质运动达标率",
          数值: `${facts.passRate}%`,
          说明: `${facts.passedRecordCount}/${facts.recordCount}条记录达标`,
        },
        {
          指标: "完成次数",
          数值: `${facts.totalTimes}次`,
          说明: "按达标记录折算",
        },
        {
          指标: "重点风险学生",
          数值: `${getRiskStudentCount(input)}人`,
          说明: "零参与或无达标记录",
        },
      ],
    },
    {
      title: "九、分类与重点对象",
      rows: [
        ...weakCategories.map((row) => ({
          对象: row.name,
          类型: "薄弱分类",
          完成次数: row.totalTimes,
          参与人数: row.participants,
          完成度: `${row.progress}%`,
        })),
        ...lowRows.map((row) => ({
          对象: row.name,
          类型: "重点对象",
          完成次数: row.totalTimes,
          参与人数: row.participants ?? row.students ?? "-",
          完成度: typeof row.rate === "number" ? `${row.rate}%` : "-",
        })),
      ],
    },
  ];
}

function splitAiTextIntoParagraphs(text: string) {
  const cleaned = cleanAiText(text);
  const blocks = cleaned
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (blocks.length > 1) return blocks.slice(0, 8);

  const sentences = cleaned.match(/[^。！？；]+[。！？；]?/g) ?? [cleaned];
  const paragraphs: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = `${current}${sentence}`.trim();
    if (current && next.length > 180) {
      paragraphs.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  }

  if (current) paragraphs.push(current);

  return paragraphs.slice(0, 8);
}

function normalizeAiReportLines(text: string) {
  return cleanAiText(text)
    .split(/\n+/)
    .flatMap((line) => line.split(/(?=\d+[.、]\s*)/))
    .map(stripAiLineMarker)
    .filter((line) => line.length >= 8);
}

function cleanAiText(text: string) {
  return text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .replace(/\r/g, "")
    .trim();
}

function stripAiLineMarker(line: string) {
  return line
    .replace(/^[\s>*-]+/, "")
    .replace(/^\d+[.、]\s*/, "")
    .replace(/^[一二三四五六七八九十]+[、.]\s*/, "")
    .trim();
}

function pickAiLines(lines: string[], keywords: string[], limit: number) {
  const picked = lines
    .filter((line) => keywords.some((keyword) => line.includes(keyword)))
    .slice(0, limit);

  return picked.length > 0 ? picked : undefined;
}

function buildStatsAiPrompt(
  input: StatsReportInput,
  question: string,
  history: StatsAiHistoryMessage[],
  attachments: CozeUploadedAttachment[],
) {
  const payload = buildStatsContextPayload(input);
  const readableSummary = buildStatsReadableSummary(payload);

  return [
    "你是学校运动统计 AI 助手。",
    "你已经获得当前统计页计算好的数据。必须先读取【统计数据摘要】和【统计上下文JSON】再回答。",
    "不要说“你未提供数据”“请明确统计结果”“无法分析”。除非摘要和 JSON 都没有可用数据。",
    "如果用户问“根据现有数据分析”“分析报告”“下月抓哪几个问题”，你要直接基于下方数据给结论。",
    "回答要求：",
    "1. 只能依据提供的数据作答，不得编造未提供的学校名称、班级、人数、政策条文编号或结论。",
    "2. 先给结论，再给依据，最后给 2 到 4 条可执行建议。",
    "3. 如果当前统计里没有某项数据，只说明该项缺失，但仍要使用已有数据完成分析。",
    "4. 输出中文纯文本，不要 Markdown 表格，控制在 220 到 360 字。",
    `【用户问题】${question}`,
    `【统计数据摘要】\n${readableSummary}`,
    `【最近对话】${JSON.stringify(history.slice(-6))}`,
    `【用户上传附件】${JSON.stringify(attachments)}`,
    `【统计上下文JSON】${JSON.stringify(payload)}`,
  ].join("\n\n");
}

function buildStatsContextPayload(input: StatsReportInput) {
  const facts = getReportFacts(input);
  const weakCategories = getWeakCategories(input.categoryRows).map((item) => ({
    name: item.name,
    totalTimes: item.totalTimes,
    participants: item.participants,
    target: item.target,
    progress: item.progress,
  }));
  const focusRows = [...input.drillRows]
    .filter((row) => typeof row.rate === "number")
    .sort(
      (a, b) =>
        (a.rate ?? Number.POSITIVE_INFINITY) -
          (b.rate ?? Number.POSITIVE_INFINITY) ||
        a.totalTimes - b.totalTimes,
    )
    .slice(0, 8);
  const analyticsSummary = input.analyticsCategories.map((item) => ({
    title: item.title,
    score: item.score,
    scoreLabel: item.scoreLabel,
    metrics: item.metrics.slice(0, 5),
  }));
  const payload = {
    scope: input.scope,
    targetLabel: input.targetLabel,
    statsMonth: input.statsMonth,
    facts,
    riskStudentCount: getRiskStudentCount(input),
    weakCategories,
    categoryRows: input.categoryRows.slice(0, 10),
    projectRows: input.projectRows.slice(0, 10),
    drillRows: focusRows.length > 0 ? focusRows : input.drillRows.slice(0, 10),
    analyticsSummary,
    policyBasis,
  };

  return payload;
}

function buildStatsReadableSummary(
  payload: ReturnType<typeof buildStatsContextPayload>,
) {
  const facts = payload.facts;
  const weakCategories =
    payload.weakCategories
      .slice(0, 5)
      .map(
        (item) =>
          `${item.name}: 完成${item.totalTimes}次, 参与${item.participants}人, 目标${item.target}次, 完成度${item.progress}%`,
      )
      .join("；") || "暂无薄弱分类数据";
  const projectRows =
    payload.projectRows
      .slice(0, 6)
      .map(
        (item) =>
          `${item.name}(${item.category}): 完成${item.totalTimes}次, 参与${item.participants}人`,
      )
      .join("；") || "暂无项目数据";
  const focusRows =
    payload.drillRows
      .slice(0, 8)
      .map((row) => {
        const details = [
          typeof row.rate === "number" ? `达成率${row.rate}%` : "",
          typeof row.totalTimes === "number" ? `完成${row.totalTimes}次` : "",
          typeof row.records === "number" ? `记录${row.records}条` : "",
          typeof row.participants === "number" ? `参与${row.participants}人` : "",
          typeof row.students === "number" ? `学生${row.students}人` : "",
          row.className ? `班级${row.className}` : "",
          row.category ? `分类${row.category}` : "",
        ].filter(Boolean);

        return `${row.name}(${details.join("，") || "暂无明细"})`;
      })
      .join("；") || "暂无重点对象数据";
  const lowScores =
    [...payload.analyticsSummary]
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((item) => {
        const metrics = item.metrics
          .slice(0, 4)
          .map((metric) => {
            const unit = metric.unit ?? "";
            return `${metric.name}${metric.value}${unit}`;
          })
          .join("，");

        return `${item.title}: ${item.scoreLabel}, 分值${item.score}, 指标${metrics || "暂无"}`;
      })
      .join("；") || "暂无指数数据";

  return [
    `统计范围：${payload.targetLabel}`,
    `统计月份：${payload.statsMonth}`,
    `基础结果：学生${facts.studentCount}人，有记录学生${facts.participantCount}人，参与率${facts.participationRate}%，记录${facts.recordCount}条，有效达标记录${facts.passedRecordCount}条，达标率${facts.passRate}%，完成次数${facts.totalTimes}次，运动分类${facts.categoryCount}类，项目${facts.projectCount}个。`,
    `重点风险学生：${payload.riskStudentCount}人。`,
    `薄弱运动分类：${weakCategories}`,
    `项目完成情况：${projectRows}`,
    `当前层级重点对象：${focusRows}`,
    `低分治理指标：${lowScores}`,
  ].join("\n");
}

function buildStatsAiFallbackReply(
  input: StatsReportInput,
  question: string,
): StatsAiReply {
  const facts = getReportFacts(input);
  const weakCategories = getWeakCategories(input.categoryRows);
  const lowRows = [...input.drillRows]
    .filter((row) => typeof row.rate === "number")
    .sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100) || a.totalTimes - b.totalTimes)
    .slice(0, 3);
  const lowScores = [...input.analyticsCategories]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
  const priorityParts: string[] = [];

  if (lowScores.length > 0) {
    priorityParts.push(`${lowScores.map((item) => item.scoreLabel).join("、")}分数偏低`);
  }
  if (weakCategories.length > 0) {
    priorityParts.push(
      `${weakCategories.map((item) => item.name).join("、")}完成度偏低`,
    );
  }
  if (lowRows.length > 0) {
    priorityParts.push(`${lowRows.map((row) => row.name).join("、")}需要重点跟进`);
  }

  const suggestions = [
    lowRows.length > 0
      ? `先逐个跟进 ${lowRows.map((row) => row.name).join("、")} 的参与和达标情况。`
      : "先按班级和学生名单排查零参与、低频参与对象。",
    weakCategories.length > 0
      ? `补齐 ${weakCategories.map((item) => item.name).join("、")} 这几类完成度偏低的运动项目。`
      : "继续保持项目供给均衡，避免只靠少数项目拉高总量。",
    "按周复盘参与率、达标率和连续运动天数，把提醒和干预落到人。",
  ];

  return {
    source: "本地分析",
    text: [
      `针对“${question}”，我先基于当前${input.targetLabel}${getMonthLabel(input.statsMonth)}统计给出建议。`,
      `目前共有 ${facts.recordCount} 条有效记录，参与率 ${facts.participationRate}%，达标率 ${facts.passRate}%，重点风险学生 ${getRiskStudentCount(input)} 人。`,
      priorityParts.length > 0
        ? `当前优先关注：${priorityParts.join("；")}。`
        : "当前没有特别突出的单项短板，建议继续盯住参与率、达标率和学生连续运动稳定性。",
      `建议先做：${suggestions.map((item, index) => `${index + 1}.${item}`).join(" ")}`,
    ].join("\n"),
  };
}

function parseAiReportFromUnknown(value: unknown): AiReportJson | null {
  const parsedValue = parseMaybeJson(value);

  if (isAiReportJson(parsedValue)) return parsedValue;

  if (isRecord(parsedValue)) {
    const nestedCandidates = [
      parsedValue.output,
      parsedValue.answer,
      parsedValue.result,
      parsedValue.content,
      parsedValue.text,
      parsedValue.data,
    ];

    for (const candidate of nestedCandidates) {
      const parsed = parseAiReportFromUnknown(candidate);
      if (parsed) return parsed;
    }
  }

  const text = extractCozeText(value);
  return text ? parseAiReport(text) : null;
}

function extractCozeText(value: unknown): string {
  const parsedValue = parseMaybeJson(value);

  if (typeof parsedValue === "string") return parsedValue;

  if (Array.isArray(parsedValue)) {
    return parsedValue.map(extractCozeText).filter(Boolean).join("\n");
  }

  if (!isRecord(parsedValue)) return "";

  const preferredKeys = [
    "output",
    "answer",
    "result",
    "content",
    "text",
    "message",
    "response",
    "data",
  ];

  for (const key of preferredKeys) {
    const text = extractCozeText(parsedValue[key]);
    if (text) return text;
  }

  return JSON.stringify(parsedValue);
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function isAiReportJson(value: unknown): value is AiReportJson {
  if (!isRecord(value)) return false;

  return [
    "summary",
    "policyJudgement",
    "advantages",
    "defects",
    "focusTargets",
    "suggestions",
    "nextMonthMetrics",
  ].some((key) => key in value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAiReport(text: string): AiReportJson | null {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
    const parsed = JSON.parse(cleaned) as AiReportJson;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function getReportFacts(input: StatsReportInput) {
  const passedRecords = input.records.filter((record) => record.isPassed);
  const participantCount = new Set(input.records.map((record) => record.studentId)).size;
  const totalTimes = getTotalTimes(passedRecords);
  const recordCount = input.records.length;
  const studentCount = input.students.length;

  return {
    studentCount,
    recordCount,
    passedRecordCount: passedRecords.length,
    participantCount,
    totalTimes,
    categoryCount: input.categories.length,
    projectCount: input.projects.length,
    participationRate: toPercent(participantCount, studentCount),
    passRate: toPercent(passedRecords.length, recordCount),
  };
}

function buildBaseKpis(facts: ReturnType<typeof getReportFacts>): ReportKpi[] {
  return [
    { label: "学生数", value: `${facts.studentCount}人` },
    { label: "参与率", value: `${facts.participationRate}%` },
    { label: "达标率", value: `${facts.passRate}%` },
    { label: "完成次数", value: `${facts.totalTimes}次` },
  ];
}

function buildActivityVisuals(
  input: StatsReportInput,
  facts: ReturnType<typeof getReportFacts>,
): ReportVisual[] {
  const inactiveCount = Math.max(0, facts.studentCount - facts.participantCount);
  const failedRecordCount = Math.max(0, facts.recordCount - facts.passedRecordCount);

  return [
    {
      kind: "donut",
      title: "学生参与覆盖",
      subtitle: "用于判断体育活动是否覆盖到大多数学生，而不是只看总次数。",
      centerLabel: "参与率",
      centerValue: `${facts.participationRate}%`,
      data: [
        { name: "已参与", value: facts.participantCount, color: "#1677ff" },
        { name: "未参与", value: inactiveCount, color: "#e5e7eb" },
      ],
    },
    {
      kind: "bar",
      title: "运动分类完成度",
      subtitle: "按分类目标下限折算，识别运动结构是否均衡。",
      unit: "%",
      data: input.categoryRows.map((row) => ({
        name: compactLabel(row.name),
        value: getTargetProgress(row.totalTimes, row.target),
        color: getProgressColor(getTargetProgress(row.totalTimes, row.target)),
      })),
    },
    {
      kind: "bar",
      title: "项目完成次数排行",
      subtitle: "查看活动是否集中在少数项目，辅助调整项目供给。",
      unit: "次",
      data: input.projectRows.slice(0, 8).map((row) => ({
        name: compactLabel(row.name),
        value: row.totalTimes,
        color: "#10b981",
      })),
    },
    {
      kind: "donut",
      title: "记录达标结构",
      subtitle: "按有效记录口径统计，观察运动任务质量。",
      centerLabel: "达标率",
      centerValue: `${facts.passRate}%`,
      data: [
        { name: "达标记录", value: facts.passedRecordCount, color: "#10b981" },
        { name: "未达标记录", value: failedRecordCount, color: "#f97316" },
      ],
    },
  ];
}

function buildPolicyVisuals(
  input: StatsReportInput,
  facts: ReturnType<typeof getReportFacts>,
  analytics: AnalyticsReportCategory[],
): ReportVisual[] {
  const averageScore = getAverageScore(analytics);
  const inactiveCount = Math.max(0, facts.studentCount - facts.participantCount);
  const failedRecordCount = Math.max(0, facts.recordCount - facts.passedRecordCount);
  const riskCount = getRiskStudentCount(input);
  const activeNonRiskCount = Math.max(0, facts.participantCount - riskCount);
  const participationWatchCount = Math.max(0, facts.studentCount - activeNonRiskCount - riskCount);
  const safeStudentCount = Math.max(0, facts.studentCount - riskCount);
  const recordWatchCount = Math.max(0, failedRecordCount);

  return [
    {
      kind: "radar",
      title: "健康治理五维雷达",
      subtitle: "把领导最关心的覆盖、达标、质量、恢复、风险防控合并成一张图。",
      data: [
        { name: "综合", value: averageScore },
        { name: "参与", value: facts.participationRate },
        { name: "达标", value: facts.passRate },
        { name: "质量", value: getAnalyticsScore(analytics, "运动质量") },
        { name: "恢复", value: getAnalyticsScore(analytics, "恢复指数") },
        {
          name: "风险防控",
          value: Math.max(0, 100 - getAnalyticsScore(analytics, "压力指数")),
        },
      ],
    },
    {
      kind: "stacked",
      title: "治理优先级诊断",
      subtitle: "把统计结果翻译成“先抓什么、为什么、怎么抓”。",
      unit: "",
      data: [
        {
          name: "参与覆盖",
          达标: activeNonRiskCount,
          待提升: participationWatchCount,
          风险: riskCount,
          priority: facts.participationRate < 80 ? "高" : facts.participationRate < 95 ? "中" : "低",
          insight: `${facts.participantCount}/${facts.studentCount}人有参与记录，参与率${facts.participationRate}%，未覆盖${inactiveCount}人。`,
          action:
            inactiveCount > 0
              ? "先由班主任核对未参与原因，再安排低门槛补参与任务。"
              : "继续按周观察是否出现连续中断学生。",
        },
        {
          name: "记录质量",
          达标: facts.passedRecordCount,
          待提升: recordWatchCount,
          风险: 0,
          priority: facts.passRate < 75 ? "高" : facts.passRate < 90 ? "中" : "低",
          insight: `${facts.passedRecordCount}/${facts.recordCount}条记录达标，达标率${facts.passRate}%，待提升${failedRecordCount}条。`,
          action:
            failedRecordCount > 0
              ? "复查未达标项目的规则、审核口径和学生完成难度。"
              : "保持当前审核标准，继续抽查异常记录。",
        },
        {
          name: "重点关注",
          达标: safeStudentCount,
          待提升: 0,
          风险: riskCount,
          priority: riskCount > 0 ? "高" : "低",
          insight: `当前识别重点风险学生${riskCount}人，口径为零参与或无达标记录。`,
          action:
            riskCount > 0
              ? "拉出学生名单，按伤病、兴趣不足、学业压力、家长支持不足分类干预。"
              : "暂无突出风险学生，重点转向低频参与预警。",
        },
      ],
    },
    {
      kind: "bar",
      title: "12类指标得分",
      subtitle: "从单一运动打卡上升到学校体育与学生健康治理诊断。",
      unit: "分",
      data: analytics.map((row) => ({
        name: compactLabel(row.scoreLabel),
        value: row.score,
        color: getProgressColor(row.score),
      })),
    },
    {
      kind: "bar",
      title: "运动分类完成度",
      subtitle: "用于判断项目供给是否均衡，避免只靠少数项目撑高总量。",
      unit: "%",
      data: input.categoryRows.map((row) => ({
        name: compactLabel(row.name),
        value: getTargetProgress(row.totalTimes, row.target),
        color: getProgressColor(getTargetProgress(row.totalTimes, row.target)),
      })),
    },
  ];
}

function getWeakCategories(rows: CategoryReportRow[]) {
  return rows
    .map((row) => ({
      ...row,
      progress: getTargetProgress(row.totalTimes, row.target),
    }))
    .sort((a, b) => a.progress - b.progress || a.totalTimes - b.totalTimes)
    .slice(0, 3);
}

function getTargetProgress(totalTimes: number, target: number) {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((totalTimes / target) * 100));
}

function getInactiveStudents(input: StatsReportInput) {
  const activeIds = new Set(input.records.map((record) => record.studentId));
  return input.students.filter((student) => !activeIds.has(student.id));
}

function getRiskStudentCount(input: StatsReportInput) {
  return input.students.filter((student) => {
    const studentRecords = input.records.filter(
      (record) => record.studentId === student.id,
    );
    const passedRecords = studentRecords.filter((record) => record.isPassed);
    return studentRecords.length === 0 || getTotalTimes(passedRecords) === 0;
  }).length;
}

function getAnalyticsScore(categories: AnalyticsReportCategory[], label: string) {
  return (
    categories.find(
      (category) =>
        category.scoreLabel.includes(label) ||
        category.title.includes(label) ||
        category.subtitle.includes(label),
    )?.score || 0
  );
}

function getAverageScore(categories: AnalyticsReportCategory[]) {
  if (categories.length === 0) return 0;
  return Math.round(
    categories.reduce((sum, category) => sum + category.score, 0) /
      categories.length,
  );
}

function getScoreJudgement(score: number) {
  if (score >= 85) return "优势明显、可形成示范经验";
  if (score >= 75) return "总体较稳、仍需补齐结构性短板";
  if (score >= 65) return "中等偏稳、风险可控但改善压力明显";
  if (score >= 55) return "基础存在，但需要专项整改";
  return "风险偏高，需要校级层面立即干预";
}

function getMonthLabel(statsMonth: string) {
  const [year, month] = statsMonth.split("-");
  return `${year}年${Number(month)}月`;
}

function getProgressColor(value: number) {
  if (value >= 85) return "#10b981";
  if (value >= 70) return "#1677ff";
  if (value >= 55) return "#f59e0b";
  return "#ef4444";
}

function compactLabel(label: string) {
  return label.replace(/^[一二三四五六七八九十]+、/, "").slice(0, 8);
}

function formatReportTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
