import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";

export type ProjectStatus = "open" | "archived";
export type IndicatorType = "count" | "distance" | "time" | "custom";
export type LimitPeriod = "none" | "weekly" | "monthly" | "custom";
export type MovementType = string;
export type RecognitionStatus =
  | "recognizing"
  | "success"
  | "failed"
  | "times_full";

// 第一层：运动类别 (Sport Category)
export interface Category {
  id: string;
  name: string; // e.g., 力量类, 速度类, 有氧类
  targetCompletions: number; // 默认周期完成次数下限
  periodType?: "term" | "month" | "week" | "day" | "none"; // 周期类型
  monthlyRules?: { [month: string]: number }; // { "2026-05": 10 }
}

// 第二层：运动项目 (Base Project)
export interface BaseProject {
  id: string;
  categoryId: string; // 所属第一层类别
  name: string; // e.g., 跑步, 引体向上
  mode: "timer" | "register";
  defaultIndicators: Omit<ProjectIndicator, "reqValue">[]; // 决定量纲
}

export interface ProjectIndicator {
  id: string;
  name: string;
  type: IndicatorType;
  reqValue: number;
  unit: string;
}

// 第三层：具体运动/动作 (Specific Action)
export interface Project {
  id: string;
  baseProjectId?: string; // 关联第二层
  categoryId?: string; // 冗余或直接关联第一层类别
  name: string;
  mode: "timer" | "register";
  type: MovementType;
  indicators: ProjectIndicator[];
  limitPeriod: LimitPeriod;
  targetCompletionsPerPeriod: number;
  maxCompletionsPerDay?: number;
  customDays?: number;
  targetGrades: string[];
  targetClasses: string[];
  status: ProjectStatus;
  createdAt: string;
  // Challenge features
  allowChallenge?: boolean;
  challengeIndicators?: ProjectIndicator[];
  challengeRewardTimes?: number;
}

export interface Student {
  id: string; // e.g., '20260101'
  name: string;
  grade: string;
  className: string;
  avatarUrl?: string;
}

export interface WaitingTask {
  taskId: string;
  student?: Student;
  status: RecognitionStatus;
  remainingTimes?: number;
  completedTimes?: number;
}

export interface Record {
  id: string;
  projectId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  datetime: string; // ISO string
  durationSeconds: number;
  achievedValue: number;
  isPassed: boolean;
  isInvalid: boolean; // 作废记录
  // Challenge features
  isChallenge?: boolean;
  rewardTimes?: number;
  totalTimes?: number;
}

// Dummy Students
export const DUMMY_STUDENTS: Student[] = [
  { id: "20260101", name: "张三", grade: "初一", className: "1班" },
  { id: "20260102", name: "李四", grade: "初一", className: "1班" },
  { id: "20260103", name: "王五", grade: "初一", className: "2班" },
  { id: "20260104", name: "赵六", grade: "初一", className: "2班" },
  { id: "20260105", name: "孙七", grade: "初二", className: "1班" },
  { id: "20260106", name: "周八", grade: "初二", className: "1班" },
  { id: "20260107", name: "吴九", grade: "初二", className: "2班" },
  { id: "20260108", name: "郑十", grade: "初二", className: "2班" },
  { id: "20260109", name: "陈一", grade: "初三", className: "1班" },
  { id: "20260110", name: "林二", grade: "初三", className: "1班" },
];

interface AppState {
  exemptPersonnel: { id: string; studentId: string; reason: string }[];
  reducedPersonnel: {
    id: string;
    studentId: string;
    reductions: { [categoryId: string]: number };
    reason: string;
  }[];

  categories: Category[];
  baseProjects: BaseProject[];
  projects: Project[];
  records: Record[];
  waitingTasks: WaitingTask[];
  inProgressGroups: {
    id: string;
    projectId: string;
    startTime: string; // ISO string
    students: {
      student: Student;
      targetValue: number;
      hasFinished: boolean;
    }[];
  }[];

  statsMonth: string;
  setStatsMonth: (m: string) => void;
  // Actions
  addCategory: (category: {
    name: string;
    targetCompletions: number;
    periodType?: Category["periodType"];
    baseProjectName?: string;
    mode?: BaseProject["mode"];
  }) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  addProject: (p: Omit<Project, "id" | "createdAt" | "status">) => void;
  updateProject: (id: string, p: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  archiveProject: (id: string) => void;
  unarchiveProject: (id: string) => void;

  addRecord: (r: Omit<Record, "id" | "isInvalid">) => void;
  invalidateRecord: (id: string) => void;
  updateRecord: (id: string, updates: Partial<Record>) => void;

  addExemptPersonnel: (p: Omit<AppState["exemptPersonnel"][0], "id">) => void;
  removeExemptPersonnel: (id: string) => void;
  updateExemptPersonnel: (
    id: string,
    updates: Partial<AppState["exemptPersonnel"][0]>,
  ) => void;

  addReducedPersonnel: (p: Omit<AppState["reducedPersonnel"][0], "id">) => void;
  removeReducedPersonnel: (id: string) => void;
  updateReducedPersonnel: (
    id: string,
    updates: Partial<AppState["reducedPersonnel"][0]>,
  ) => void;

  addPhotoTask: (projectId: string) => void;
  removePhotoTask: (taskId: string) => void;
  clearWaitingTasks: () => void;
  clearFailedTasks: () => void;
  addInProgressGroup: (projectId: string, taskIds: string[]) => void;
  completeStudentRecord: (
    groupId: string,
    studentId: string,
    durationSeconds: number,
    achievedValue: number,
    isPassed: boolean,
    isChallenge?: boolean,
    rewardTimes?: number,
    totalTimes?: number,
  ) => void;
  completeMultipleRecords: (
    groupId: string,
    studentIds: string[],
    durationSeconds: number,
    achievedValue: number,
    isPassed: boolean,
    isChallenge?: boolean,
    rewardTimes?: number,
    totalTimes?: number,
  ) => void;
  clearInProgressGroups: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      exemptPersonnel: [],
      reducedPersonnel: [],

      categories: [
        { id: "c1", name: "速度类", targetCompletions: 20, periodType: "term" },
        { id: "c2", name: "有氧类", targetCompletions: 30, periodType: "term" },
        { id: "c3", name: "力量类", targetCompletions: 15, periodType: "term" },
        { id: "c4", name: "灵敏类", targetCompletions: 10, periodType: "term" },
      ],
      baseProjects: [
        {
          id: "bp1",
          categoryId: "c1",
          name: "跑步(短)",
          mode: "timer",
          defaultIndicators: [
            { id: "di1", name: "距离", type: "distance", unit: "米" },
          ],
        },
        {
          id: "bp2",
          categoryId: "c2",
          name: "跑步(长)",
          mode: "timer",
          defaultIndicators: [
            { id: "di2", name: "距离", type: "distance", unit: "米" },
          ],
        },
        {
          id: "bp3",
          categoryId: "c4",
          name: "跳绳",
          mode: "register",
          defaultIndicators: [
            { id: "di3", name: "限时", type: "time", unit: "分钟" },
            { id: "di4", name: "个数", type: "count", unit: "个" },
          ],
        },
        {
          id: "bp4",
          categoryId: "c2",
          name: "游泳",
          mode: "timer",
          defaultIndicators: [
            { id: "di5", name: "距离", type: "distance", unit: "米" },
          ],
        },
        {
          id: "bp10",
          categoryId: "c2",
          name: "网球",
          mode: "register",
          defaultIndicators: [
            { id: "di11", name: "有氧时长", type: "time", unit: "分钟" },
          ],
        },
        {
          id: "bp5",
          categoryId: "c3",
          name: "引体向上",
          mode: "register",
          defaultIndicators: [
            { id: "di6", name: "次数", type: "count", unit: "次" },
          ],
        },
        {
          id: "bp6",
          categoryId: "c3",
          name: "仰卧起坐",
          mode: "register",
          defaultIndicators: [
            { id: "di7", name: "次数", type: "count", unit: "次" },
          ],
        },
        {
          id: "bp7",
          categoryId: "c3",
          name: "俯卧撑",
          mode: "register",
          defaultIndicators: [
            { id: "di8", name: "次数", type: "count", unit: "次" },
          ],
        },
        {
          id: "bp8",
          categoryId: "c1",
          name: "立定跳远",
          mode: "register",
          defaultIndicators: [
            { id: "di9", name: "距离", type: "distance", unit: "米" },
          ],
        },
        {
          id: "bp9",
          categoryId: "c4",
          name: "球类绕杆",
          mode: "timer",
          defaultIndicators: [
            { id: "di10", name: "限时", type: "time", unit: "秒" },
          ],
        },
      ],
      projects: [
        {
          id: "p1",
          name: "100米直线跑",
          mode: "timer",
          type: "跑步",
          categoryId: "c1",
          baseProjectId: "bp1",
          indicators: [
            {
              id: "i1",
              name: "指标",
              type: "distance",
              reqValue: 100,
              unit: "米",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 3,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p2",
          name: "800米长跑",
          mode: "timer",
          type: "跑步",
          categoryId: "c2",
          baseProjectId: "bp2",
          indicators: [
            {
              id: "i2",
              name: "指标",
              type: "distance",
              reqValue: 800,
              unit: "米",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 2,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p3",
          name: "初一年级1000米跑圈",
          mode: "timer",
          type: "跑步",
          categoryId: "c2",
          baseProjectId: "bp2",
          indicators: [
            {
              id: "i3",
              name: "距离",
              type: "distance",
              reqValue: 1000,
              unit: "米",
            },
          ],
          limitPeriod: "monthly",
          targetCompletionsPerPeriod: 6,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["初一1班", "初一2班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
          allowChallenge: true,
          challengeIndicators: [
            {
              id: "ci3",
              name: "耗时",
              type: "time",
              reqValue: 240,
              unit: "秒",
            },
          ], // 4 mins
          challengeRewardTimes: 1,
        },
        {
          id: "p4",
          name: "200米直线跑",
          mode: "timer",
          type: "跑步",
          categoryId: "c1",
          baseProjectId: "bp1",
          indicators: [
            {
              id: "i4",
              name: "指标",
              type: "distance",
              reqValue: 200,
              unit: "米",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 3,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["初一1班", "初一2班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p16",
          name: "400米节奏跑",
          mode: "timer",
          type: "跑步",
          categoryId: "c1",
          baseProjectId: "bp1",
          indicators: [
            {
              id: "i16",
              name: "距离",
              type: "distance",
              reqValue: 400,
              unit: "米",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 2,
          maxCompletionsPerDay: 1,
          targetGrades: ["初一", "初二"],
          targetClasses: ["初一1班", "初一2班", "初二1班", "初二2班"],
          status: "open",
          createdAt: "2026-05-01T10:00:00Z",
        },
        {
          id: "p17",
          name: "网球有氧练习",
          mode: "register",
          type: "网球",
          categoryId: "c2",
          baseProjectId: "bp10",
          indicators: [
            {
              id: "i17",
              name: "有氧时长",
              type: "time",
              reqValue: 30,
              unit: "分钟",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 2,
          maxCompletionsPerDay: 1,
          targetGrades: ["初二", "初三"],
          targetClasses: ["初二1班", "初二2班", "初三1班"],
          status: "open",
          createdAt: "2026-05-01T10:00:00Z",
        },
        {
          id: "p5",
          name: "初二年级1000米跑圈",
          mode: "timer",
          type: "跑步",
          categoryId: "c2",
          baseProjectId: "bp2",
          indicators: [
            {
              id: "i5",
              name: "指标",
              type: "distance",
              reqValue: 1000,
              unit: "米",
            },
          ],
          limitPeriod: "monthly",
          targetCompletionsPerPeriod: 5,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初二"],
          targetClasses: ["初二1班", "初二2班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p6",
          name: "初三年级1000米跑圈",
          mode: "timer",
          type: "跑步",
          categoryId: "c2",
          baseProjectId: "bp2",
          indicators: [
            {
              id: "i6",
              name: "指标",
              type: "distance",
              reqValue: 1000,
              unit: "米",
            },
          ],
          limitPeriod: "monthly",
          targetCompletionsPerPeriod: 5,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初三"],
          targetClasses: ["初三1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p7",
          name: "1分钟跳绳",
          mode: "register",
          type: "跳绳",
          categoryId: "c4",
          baseProjectId: "bp3",
          indicators: [
            { id: "i7", name: "限时", type: "time", reqValue: 1, unit: "分钟" },
            {
              id: "i7b",
              name: "个数",
              type: "count",
              reqValue: 120,
              unit: "个",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 5,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
          allowChallenge: true,
          challengeIndicators: [
            {
              id: "ci7",
              name: "个数",
              type: "count",
              reqValue: 160,
              unit: "个",
            },
          ],
          challengeRewardTimes: 2,
        },
        {
          id: "p8",
          name: "3分钟跳绳",
          mode: "register",
          type: "跳绳",
          categoryId: "c4",
          baseProjectId: "bp3",
          indicators: [
            { id: "i8", name: "限时", type: "time", reqValue: 3, unit: "分钟" },
            {
              id: "i8b",
              name: "个数",
              type: "count",
              reqValue: 300,
              unit: "个",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 2,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p9",
          name: "100米来回游",
          mode: "timer",
          type: "游泳",
          categoryId: "c2",
          baseProjectId: "bp4",
          indicators: [
            {
              id: "i9",
              name: "指标",
              type: "distance",
              reqValue: 100,
              unit: "米",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 2,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p10",
          name: "50米自由泳",
          mode: "timer",
          type: "游泳",
          categoryId: "c2",
          baseProjectId: "bp4",
          indicators: [
            { id: "i10", name: "限时", type: "time", reqValue: 60, unit: "秒" },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 2,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p11",
          name: "1分钟引体向上",
          mode: "register",
          type: "引体向上",
          categoryId: "c3",
          baseProjectId: "bp5",
          indicators: [
            {
              id: "i11",
              name: "次数",
              type: "count",
              reqValue: 15,
              unit: "次",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 3,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p12",
          name: "1分钟仰卧起坐",
          mode: "register",
          type: "力量",
          categoryId: "c3",
          baseProjectId: "bp6",
          indicators: [
            {
              id: "i12",
              name: "次数",
              type: "count",
              reqValue: 40,
              unit: "次",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 3,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p13",
          name: "立定跳远",
          mode: "register",
          type: "力量",
          categoryId: "c1",
          baseProjectId: "bp8",
          indicators: [
            {
              id: "i13",
              name: "距离",
              type: "distance",
              reqValue: 2,
              unit: "米",
            },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 3,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p14",
          name: "篮球运球绕杆",
          mode: "timer",
          type: "球类",
          categoryId: "c4",
          baseProjectId: "bp9",
          indicators: [
            { id: "i14", name: "限时", type: "time", reqValue: 30, unit: "秒" },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 5,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
        {
          id: "p15",
          name: "足球运球绕杆",
          mode: "timer",
          type: "球类",
          categoryId: "c4",
          baseProjectId: "bp9",
          indicators: [
            { id: "i15", name: "限时", type: "time", reqValue: 40, unit: "秒" },
          ],
          limitPeriod: "weekly",
          targetCompletionsPerPeriod: 5,
          maxCompletionsPerDay: undefined,
          targetGrades: ["初一"],
          targetClasses: ["1班"],
          status: "open",
          createdAt: "2026-04-01T10:00:00Z",
        },
      ],
      records: [
        {
          id: "r1",
          projectId: "p1",
          studentId: "20260101",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 58,
          achievedValue: 112,
          isPassed: true,
          isInvalid: false,
          totalTimes: 2,
        },
        {
          id: "r2",
          projectId: "p1",
          studentId: "20260102",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 65,
          achievedValue: 105,
          isPassed: true,
          isInvalid: false,
          totalTimes: 1,
        },
        {
          id: "r3",
          projectId: "p1",
          studentId: "20260103",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 70,
          achievedValue: 100,
          isPassed: true,
          isInvalid: false,
          totalTimes: 1,
        },
        {
          id: "r4",
          projectId: "p1",
          studentId: "20260104",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 80,
          achievedValue: 90,
          isPassed: false,
          isInvalid: false,
          totalTimes: 0,
        },
        {
          id: "r5",
          projectId: "p1",
          studentId: "20260105",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 55,
          achievedValue: 120,
          isPassed: true,
          isInvalid: false,
          isChallenge: true,
          rewardTimes: 1,
          totalTimes: 2,
        },
        {
          id: "r6",
          projectId: "p4",
          studentId: "20260101",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 36,
          achievedValue: 200,
          isPassed: true,
          isInvalid: false,
          totalTimes: 1,
        },
        {
          id: "r7",
          projectId: "p16",
          studentId: "20260103",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 92,
          achievedValue: 400,
          isPassed: true,
          isInvalid: false,
          totalTimes: 1,
        },
        {
          id: "r8",
          projectId: "p16",
          studentId: "20260106",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 98,
          achievedValue: 400,
          isPassed: true,
          isInvalid: false,
          totalTimes: 1,
        },
        {
          id: "r9",
          projectId: "p17",
          studentId: "20260105",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 1800,
          achievedValue: 32,
          isPassed: true,
          isInvalid: false,
          totalTimes: 1,
        },
        {
          id: "r10",
          projectId: "p17",
          studentId: "20260109",
          date: new Date().toISOString().slice(0, 10),
          datetime: new Date().toISOString(),
          durationSeconds: 1500,
          achievedValue: 25,
          isPassed: false,
          isInvalid: false,
          totalTimes: 0,
        },
        // END RECORDS
      ],
      waitingTasks: [],
      inProgressGroups: [],
      statsMonth: new Date().toISOString().slice(0, 7),
      setStatsMonth: (m) => set({ statsMonth: m }),

      addCategory: (category) =>
        set((state) => {
          const seed =
            Date.now().toString() +
            "_" +
            Math.random().toString(36).substring(2, 9);
          const categoryId = `c_${seed}`;
          const baseProjectId = `bp_${seed}`;
          const mode = category.mode || "register";
          const defaultIndicators =
            mode === "timer"
              ? [
                  {
                    id: `di_${seed}`,
                    name: "限时",
                    type: "time" as const,
                    unit: "分钟",
                  },
                ]
              : [
                  {
                    id: `di_${seed}`,
                    name: "次数",
                    type: "count" as const,
                    unit: "次",
                  },
                ];

          return {
            categories: [
              ...state.categories,
              {
                id: categoryId,
                name: category.name,
                targetCompletions: category.targetCompletions,
                periodType: category.periodType || "month",
              },
            ],
            baseProjects: [
              ...state.baseProjects,
              {
                id: baseProjectId,
                categoryId,
                name: category.baseProjectName || category.name,
                mode,
                defaultIndicators,
              },
            ],
          };
        }),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),

      addProject: (p) =>
        set((state) => ({
          projects: [
            {
              ...p,
              id:
                Date.now().toString() +
                "_" +
                Math.random().toString(36).substring(2, 9),
              status: "open",
              createdAt: new Date().toISOString(),
            },
            ...state.projects,
          ],
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),

      archiveProject: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status: "archived" } : p,
          ),
        })),

      unarchiveProject: (id) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, status: "open" } : p,
          ),
        })),

      addRecord: (r) =>
        set((state) => ({
          records: [
            {
              ...r,
              id:
                Date.now().toString() +
                "_" +
                Math.random().toString(36).substring(2, 9),
              isInvalid: false,
            },
            ...state.records,
          ],
        })),

      invalidateRecord: (id) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, isInvalid: true } : r,
          ),
        })),

      updateRecord: (id, updates) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...updates,
                  isPassed:
                    typeof updates.achievedValue === "number"
                      ? updates.achievedValue >=
                        (state.projects.find((p) => p.id === r.projectId)
                          ?.indicators[0]?.reqValue || 0)
                      : r.isPassed,
                }
              : r,
          ),
        })),

      addExemptPersonnel: (p) =>
        set((state) => ({
          exemptPersonnel: [
            ...state.exemptPersonnel,
            { ...p, id: Date.now().toString() + "_" + Math.random().toString(36).substring(2, 9) },
          ],
        })),

      removeExemptPersonnel: (id) =>
        set((state) => ({
          exemptPersonnel: state.exemptPersonnel.filter((p) => p.id !== id),
        })),

      updateExemptPersonnel: (id, updates) =>
        set((state) => ({
          exemptPersonnel: state.exemptPersonnel.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      addReducedPersonnel: (p) =>
        set((state) => ({
          reducedPersonnel: [
            ...state.reducedPersonnel,
            { ...p, id: Date.now().toString() + "_" + Math.random().toString(36).substring(2, 9) },
          ],
        })),

      removeReducedPersonnel: (id) =>
        set((state) => ({
          reducedPersonnel: state.reducedPersonnel.filter((p) => p.id !== id),
        })),

      updateReducedPersonnel: (id, updates) =>
        set((state) => ({
          reducedPersonnel: state.reducedPersonnel.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      addPhotoTask: (projectId) => {
        const taskId =
          Date.now().toString() +
          "_" +
          Math.random().toString(36).substring(2, 9);
        set((state) => ({
          waitingTasks: [
            { taskId, status: "recognizing" },
            ...state.waitingTasks,
          ],
        }));

        // Simulate network upload & recognition delay
        setTimeout(
          () => {
            set((state) => {
              const taskIndex = state.waitingTasks.findIndex(
                (t) => t.taskId === taskId,
              );
              if (taskIndex === -1) return state; // Task was deleted

              // Randomly fail recognition 10% of the time for demonstration
              if (Math.random() < 0.1) {
                const newTasks = [...state.waitingTasks];
                newTasks[taskIndex] = {
                  ...newTasks[taskIndex],
                  status: "failed",
                };
                return { waitingTasks: newTasks };
              }

              // Mock recognition success
              const randomStudent =
                DUMMY_STUDENTS[
                  Math.floor(Math.random() * DUMMY_STUDENTS.length)
                ];
              const project = state.projects.find((p) => p.id === projectId);

              // Check remaining times
              const records = state.records.filter(
                (r) =>
                  r.projectId === projectId &&
                  r.studentId === randomStudent.id &&
                  !r.isInvalid,
              );

              // Check Period limits
              const completedTimesPeriod = records.reduce(
                (acc, r) => acc + (r.totalTimes || 1),
                0,
              );
              let remainingTimesPeriod =
                project?.limitPeriod !== "none"
                  ? project?.targetCompletionsPerPeriod || 0
                  : null;
              if (remainingTimesPeriod !== null) {
                remainingTimesPeriod -= completedTimesPeriod;
              }

              // Calculate completed times for today
              const todayStr = new Date().toISOString().split("T")[0];
              const completedTimesToday = records
                .filter((r) => r.date === todayStr)
                .reduce((acc, r) => acc + (r.totalTimes || 1), 0);
              
              const maxPerDay = project?.maxCompletionsPerDay;
              const remainingTimesToday = maxPerDay !== undefined ? maxPerDay - completedTimesToday : Infinity;

              // Determine if full ONLY based on maxCompletionsPerDay
              const isFull = maxPerDay !== undefined && remainingTimesToday <= 0;

              const newTasks = [...state.waitingTasks];

              // Prevent duplicate success entries
              const isDuplicate = state.waitingTasks.some(
                (t) =>
                  t.taskId !== taskId &&
                  t.status === "success" &&
                  t.student?.id === randomStudent.id,
              );

              if (isDuplicate) {
                newTasks[taskIndex] = {
                  ...newTasks[taskIndex],
                  status: "failed",
                };
              } else {
                newTasks[taskIndex] = {
                  ...newTasks[taskIndex],
                  status: isFull ? "times_full" : "success",
                  student: randomStudent,
                  remainingTimes: remainingTimesToday !== Infinity ? Math.max(0, remainingTimesToday - 1) : undefined,
                  completedTimes: completedTimesPeriod,
                };
              }
              return { waitingTasks: newTasks };
            });
          },
          1500 + Math.random() * 1000,
        ); // 1.5s - 2.5s delay
      },

      removePhotoTask: (taskId) =>
        set((state) => ({
          waitingTasks: state.waitingTasks.filter((t) => t.taskId !== taskId),
        })),

      clearWaitingTasks: () => set({ waitingTasks: [] }),

      clearFailedTasks: () =>
        set((state) => ({
          waitingTasks: state.waitingTasks.filter((t) => t.status !== "failed"),
        })),

      addInProgressGroup: (projectId, taskIds) =>
        set((state) => {
          const remainingTasks = state.waitingTasks.filter(
            (t) => !taskIds.includes(t.taskId),
          );
          const tasksToAdd = state.waitingTasks.filter(
            (t) =>
              taskIds.includes(t.taskId) && t.status === "success" && t.student,
          );

          if (tasksToAdd.length === 0) return state;

          const newGroup = {
            id:
              Date.now().toString() +
              "_" +
              Math.random().toString(36).substring(2, 9),
            projectId,
            startTime: new Date().toISOString(),
            students: tasksToAdd.map((t) => ({
              student: t.student!,
              targetValue:
                state.projects.find((p) => p.id === projectId)?.indicators?.[0]
                  ?.reqValue || 0,
              hasFinished: false,
            })),
          };
          return {
            waitingTasks: remainingTasks,
            inProgressGroups: [...state.inProgressGroups, newGroup],
          };
        }),

      completeStudentRecord: (
        groupId,
        studentId,
        durationSeconds,
        achievedValue,
        isPassed,
        isChallenge,
        rewardTimes,
        totalTimes,
      ) =>
        set((state) => {
          const group = state.inProgressGroups.find((g) => g.id === groupId);
          if (!group) return state;

          // add record
          const newRecord: Record = {
            id: Date.now().toString() + "_" + studentId,
            projectId: group.projectId,
            studentId: studentId,
            date: format(new Date(), "yyyy-MM-dd"),
            datetime: new Date().toISOString(),
            durationSeconds,
            achievedValue,
            isPassed,
            isInvalid: false,
            isChallenge,
            rewardTimes: rewardTimes || 0,
            totalTimes: totalTimes || 1,
          };

          const newGroups = state.inProgressGroups
            .map((g) => {
              if (g.id !== groupId) return g;
              return {
                ...g,
                students: g.students.filter((s) => s.student.id !== studentId),
              };
            })
            .filter((g) => g.students.length > 0);

          return {
            records: [newRecord, ...state.records],
            inProgressGroups: newGroups,
          };
        }),

      completeMultipleRecords: (
        groupId,
        studentIds,
        durationSeconds,
        achievedValue,
        isPassed,
        isChallenge,
        rewardTimes,
        totalTimes,
      ) =>
        set((state) => {
          const group = state.inProgressGroups.find((g) => g.id === groupId);
          if (!group) return state;

          const date = format(new Date(), "yyyy-MM-dd");
          const datetime = new Date().toISOString();
          const baseId = Date.now().toString();

          const newRecords = studentIds.map((sid, idx) => ({
            id: baseId + "_" + sid + "_" + idx,
            projectId: group.projectId,
            studentId: sid,
            date,
            datetime,
            durationSeconds,
            achievedValue,
            isPassed,
            isInvalid: false,
            isChallenge,
            rewardTimes: rewardTimes || 0,
            totalTimes: totalTimes || 1,
          }));

          const newGroups = state.inProgressGroups
            .map((g) => {
              if (g.id !== groupId) return g;
              return {
                ...g,
                students: g.students.filter(
                  (s) => !studentIds.includes(s.student.id),
                ),
              };
            })
            .filter((g) => g.students.length > 0);

          return {
            records: [...newRecords, ...state.records],
            inProgressGroups: newGroups,
          };
        }),

      clearInProgressGroups: () => set({ inProgressGroups: [] }),
    }),
    {
      name: "campus-sports-storage-v5",
    },
  ),
);
