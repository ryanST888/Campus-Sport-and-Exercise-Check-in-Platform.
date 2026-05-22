import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import {
  Activity,
  BadgeMinus,
  BadgePlus,
  ChevronRight,
  ClipboardCheck,
  Layers3,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
import { Header } from "../../components/ui/Header";
import { currentAccount } from "../../lib/accessControl";
import { useAppStore } from "../../store";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { categories, projects, baseProjects, records } = useAppStore();
  const activeProjects = projects.filter((project) => project.status === "open");
  const archivedProjects = projects.filter((project) => project.status === "archived");

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f5f8] pb-24">
      <Header title="项目配置" showBack={false} />

      <div className="space-y-4 p-4">
        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium text-gray-500">
                配置中心 · 仅 Top level
              </div>
              <h1 className="mt-1 text-[23px] font-bold leading-tight text-gray-950">
                分类决定项目，项目生成打卡入口
              </h1>
              <p className="mt-1 text-[12px] text-gray-500">
                当前账号：{currentAccount.name}
              </p>
            </div>
            <button
              onClick={() => navigate("/projects/new")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1677ff] text-white active:bg-[#0958d9]"
              aria-label="新建项目"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <ConfigMetric label="分类" value={categories.length} />
            <ConfigMetric label="细分" value={baseProjects.length} />
            <ConfigMetric label="生效" value={activeProjects.length} />
            <ConfigMetric label="记录" value={records.filter((record) => !record.isInvalid).length} />
          </div>

          <div className="mt-4 grid grid-cols-[1fr_20px_1fr_20px_1fr] items-center gap-1 text-center">
            <FlowNode icon={<Layers3 className="h-4 w-4" />} label="分类" />
            <ChevronRight className="mx-auto h-4 w-4 text-gray-300" />
            <FlowNode icon={<ClipboardCheck className="h-4 w-4" />} label="项目" />
            <ChevronRight className="mx-auto h-4 w-4 text-gray-300" />
            <FlowNode icon={<Activity className="h-4 w-4" />} label="打卡" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3">
          <AdminEntry
            icon={<Layers3 className="h-5 w-5" />}
            title="运动分类"
            desc="速度、有氧、力量等项目池"
            meta={`${categories.length} 个分类`}
            tone="blue"
            onClick={() => navigate("/admin/categories")}
          />
          <AdminEntry
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="打卡项目"
            desc="新建 100m、400m、网球等 block"
            meta={`${activeProjects.length} 生效 / ${archivedProjects.length} 停用`}
            tone="green"
            onClick={() => navigate("/admin/projects")}
          />
          <AdminEntry
            icon={<BadgePlus className="h-5 w-5" />}
            title="免打卡人员"
            desc="特殊情况不计入未完成"
            meta="学生名单"
            tone="amber"
            onClick={() => navigate("/admin/exempt-personnel")}
          />
          <AdminEntry
            icon={<BadgeMinus className="h-5 w-5" />}
            title="减免次数"
            desc="按分类调整学生达标次数"
            meta="个性化目标"
            tone="violet"
            onClick={() => navigate("/admin/reduced-personnel")}
          />
        </section>

        <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <Settings2 className="h-4 w-4" />
              </div>
              <h2 className="text-[16px] font-bold text-gray-950">
                当前项目池
              </h2>
            </div>
            <button
              onClick={() => navigate("/admin/projects")}
              className="text-[13px] font-medium text-[#1677ff]"
            >
              管理
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((category) => {
              const count = activeProjects.filter(
                (project) => project.categoryId === category.id,
              ).length;
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-[14px] font-semibold text-gray-800">
                      {category.name}
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-gray-500">
                    {count} 个可打卡
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function ConfigMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2.5 text-center">
      <div className="text-[20px] font-bold leading-none text-gray-950">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-medium text-gray-500">{label}</div>
    </div>
  );
}

function FlowNode({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-[62px] flex-col items-center justify-center gap-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-700">
      <div className="text-[#1677ff]">{icon}</div>
      <span className="text-[12px] font-semibold">{label}</span>
    </div>
  );
}

function AdminEntry({
  icon,
  title,
  desc,
  meta,
  tone,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  meta: string;
  tone: "blue" | "green" | "amber" | "violet";
  onClick: () => void;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  }[tone];

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white p-4 text-left shadow-sm active:bg-gray-50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-gray-950">{title}</div>
          <div className="mt-0.5 truncate text-[12px] text-gray-500">{desc}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-gray-400">
        {meta}
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}
