import { type ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Camera,
  ChevronRight,
  ClipboardList,
  Footprints,
  Layers3,
  Timer,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Header } from "../components/ui/Header";
import { DUMMY_STUDENTS, type Project, useAppStore } from "../store";
import {
  getCategoryName,
  getProjectIndicatorText,
  getProjectStats,
} from "../lib/sportMetrics";

const today = new Date().toISOString().slice(0, 10);

function getCategoryTheme(categoryName: string) {
  if (categoryName.includes("速度")) {
    return {
      icon: Footprints,
      accent: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      chip: "bg-blue-100 text-blue-700",
    };
  }
  if (categoryName.includes("有氧")) {
    return {
      icon: Timer,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      chip: "bg-emerald-100 text-emerald-700",
    };
  }
  if (categoryName.includes("力量")) {
    return {
      icon: Trophy,
      accent: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100",
      chip: "bg-rose-100 text-rose-700",
    };
  }
  return {
    icon: Zap,
    accent: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    chip: "bg-amber-100 text-amber-700",
  };
}

export function Home() {
  const navigate = useNavigate();
  const { projects, records, categories, baseProjects } = useAppStore();
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "open"),
    [projects],
  );

  const categoryTabs = useMemo(() => {
    const usedCategoryIds = new Set(activeProjects.map((project) => project.categoryId));
    return categories.filter((category) => usedCategoryIds.has(category.id));
  }, [activeProjects, categories]);

  const visibleProjects = useMemo(() => {
    if (selectedCategoryId === "all") return activeProjects;
    return activeProjects.filter((project) => project.categoryId === selectedCategoryId);
  }, [activeProjects, selectedCategoryId]);

  const todayRecords = records.filter((record) => record.date === today && !record.isInvalid);
  const todayStudents = new Set(todayRecords.map((record) => record.studentId)).size;
  const totalUploaded = records.filter((record) => !record.isInvalid).length;

  const startCheckin = (project: Project) => {
    navigate(
      project.mode === "register"
        ? `/checkin/register/${project.id}`
        : `/checkin/face-scan/${project.id}`,
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f5f8]">
      <Header
        title="打卡"
        bg="bg-white"
      />

      <div className="space-y-4 px-4 pb-24 pt-4">
        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div>
            <div className="text-[13px] font-medium text-gray-500">
              打卡操作台
            </div>
            <h1 className="mt-1 text-[24px] font-bold leading-tight text-gray-950">
              选择项目后上传成绩
            </h1>
            <p className="mt-1 text-[12px] text-gray-500">
              项目由管理端维护，当前页面只负责打卡操作
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat icon={<Layers3 className="h-4 w-4" />} label="打卡项目" value={activeProjects.length} />
            <MiniStat icon={<Users className="h-4 w-4" />} label="今日学生" value={todayStudents} />
            <MiniStat icon={<ClipboardList className="h-4 w-4" />} label="累计记录" value={totalUploaded} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <FlowStep icon={<Layers3 className="h-4 w-4" />} label="选择项目" />
            <FlowStep icon={<Camera className="h-4 w-4" />} label="拍照/录入" />
            <FlowStep icon={<Activity className="h-4 w-4" />} label="成绩上传" />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-gray-950">打卡 block</h2>
              <div className="text-[12px] text-gray-500">
                这里只展示已生效项目
              </div>
            </div>
            <button
              onClick={() => navigate("/records")}
              className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-[13px] font-medium text-gray-600 shadow-sm active:bg-gray-50"
            >
              记录
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategoryId("all")}
              className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold ${
                selectedCategoryId === "all"
                  ? "bg-gray-950 text-white"
                  : "bg-white text-gray-600"
              }`}
            >
              全部
            </button>
            {categoryTabs.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold ${
                  selectedCategoryId === category.id
                    ? "bg-gray-950 text-white"
                    : "bg-white text-gray-600"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {visibleProjects.map((project) => {
              const categoryName = getCategoryName(project, categories);
              const theme = getCategoryTheme(categoryName);
              const Icon = theme.icon;
              const stats = getProjectStats(project, records, DUMMY_STUDENTS);
              const baseProject = baseProjects.find(
                (base) => base.id === project.baseProjectId,
              );

              return (
                <button
                  key={project.id}
                  onClick={() => startCheckin(project)}
                  className={`w-full rounded-lg border bg-white p-4 text-left shadow-sm transition active:scale-[0.99] ${theme.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${theme.bg} ${theme.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[17px] font-bold text-gray-950">
                          {project.name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${theme.chip}`}>
                            {categoryName}
                          </span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                            {baseProject?.name || project.type}
                          </span>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                            {project.mode === "register" ? "登记" : "计时"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
                    <InfoCell label="指标" value={getProjectIndicatorText(project)} />
                    <InfoCell label="目标" value={`${project.targetCompletionsPerPeriod || 0}次/周期`} />
                    <InfoCell label="已上传" value={`${stats.totalTimes}次`} />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-[12px] text-gray-500">
                    <span className="truncate">
                      适用：{project.targetGrades.join("、") || "全年级"}
                    </span>
                    <span className="shrink-0 font-medium text-gray-900">
                      {project.mode === "register" ? "直接登记" : "拍照计时"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="flex items-center gap-1.5 text-gray-500">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="mt-2 text-[22px] font-bold leading-none text-gray-950">
        {value}
      </div>
    </div>
  );
}

function FlowStep({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-[64px] flex-col justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="text-[#1677ff]">{icon}</div>
      <div className="text-[12px] font-semibold text-gray-700">{label}</div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 p-2">
      <div className="text-[10px] font-medium text-gray-400">{label}</div>
      <div className="mt-1 truncate text-[12px] font-semibold text-gray-800">
        {value}
      </div>
    </div>
  );
}
