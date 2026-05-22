import { useState, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/ui/Header";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useAppStore } from "../../store";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

type FilterType = "open" | "archived";

export function ProjectList() {
  const navigate = useNavigate();
  const {
    projects,
    categories,
    deleteProject,
    archiveProject,
    unarchiveProject,
  } = useAppStore();
  const [filter, setFilter] = useState<FilterType>("open");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) => {
    return p.status === filter;
  });

  const handleAction = (e: MouseEvent, action: string, id: string) => {
    e.stopPropagation();
    setMenuId(null);
    if (action === "edit") navigate(`/projects/edit/${id}`);
    if (action === "archive") {
      archiveProject(id);
      toast.success("项目已停用");
    }
    if (action === "unarchive") {
      unarchiveProject(id);
      toast.success("项目已重新生效");
    }
    if (action === "delete") {
      setProjectToDelete(id);
    }
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete);
      toast.success("已删除");
      setProjectToDelete(null);
    }
  };

  const getIndicatorText = (p: any) => {
    if (!p.indicators || p.indicators.length === 0) return "无指标";
    return p.indicators
      .map(
        (ind: any) =>
          `${ind.type === "count" ? "次数" : ind.type === "time" ? "计时" : ind.type === "distance" ? "距离" : "其他"} ${ind.reqValue}${ind.unit}`,
      )
      .join(" | ");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] pb-20 relative">
      <Header
        title="项目管理"
        showBack
        rightNode={
          <button
            onClick={() => navigate("/projects/new")}
            className="text-[#1677ff] flex items-center pr-1 active:opacity-70"
          >
            <Plus className="w-5 h-5 mr-0.5" />
            <span className="text-sm font-medium">新建</span>
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="bg-white sticky top-12 z-30 flex items-center border-b border-gray-100">
        <button
          onClick={() => setFilter("open")}
          className={`flex-1 py-3 text-sm font-medium relative ${filter === "open" ? "text-[#1677ff]" : "text-gray-500"}`}
        >
          生效中
          {filter === "open" && (
            <div className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-[#1677ff] rounded-t" />
          )}
        </button>
        <button
          onClick={() => setFilter("archived")}
          className={`flex-1 py-3 text-sm font-medium relative ${filter === "archived" ? "text-[#1677ff]" : "text-gray-500"}`}
        >
          已停用
          {filter === "archived" && (
            <div className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-[#1677ff] rounded-t" />
          )}
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 text-gray-400">暂无相关项目</div>
        ) : (
          filteredProjects.map((p) => {
            const categoryName =
              categories.find((c) => c.id === p.categoryId)?.name || "未分类";
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/edit/${p.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuId(p.id);
                }}
                onTouchStart={() => {
                  const timer = setTimeout(() => setMenuId(p.id), 800);
                  return () => clearTimeout(timer);
                }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-[16px] text-gray-900">
                    {p.name}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded ${p.status === "open" ? "bg-green-50 text-green-600 border border-green-100" : "bg-gray-100 text-gray-500"}`}
                  >
                    {p.status === "open" ? "🟢 生效中" : "已停用"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex flex-col gap-1">
                  <div>
                    类别：<span className="text-[#1677ff]">{categoryName}</span>{" "}
                    | {p.mode === "register" ? "登记模式" : "计时模式"} | 指标：
                    {getIndicatorText(p)}
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-50">
                    <span>
                      支持挑战：
                      {p.allowChallenge ? (
                        <span className="font-bold text-orange-500">
                          奖励+{p.challengeRewardTimes}次
                        </span>
                      ) : (
                        "否"
                      )}
                    </span>
                    <span>
                      周期目标：
                      {!p.limitPeriod || p.limitPeriod === "none"
                        ? "不限"
                        : p.targetCompletionsPerPeriod !== undefined ? `${p.targetCompletionsPerPeriod}次` : "不限"}{" "}
                      | 每日打卡：{p.maxCompletionsPerDay !== undefined ? p.maxCompletionsPerDay + '次' : '不限'}
                    </span>
                  </div>
                </div>

                {/* Context Menu */}
                {menuId === p.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(null);
                      }}
                    />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 bg-white rounded-xl shadow-xl z-50 border border-gray-100 py-1 overflow-hidden">
                      {p.status === "open" ? (
                        <>
                          <button
                            onClick={(e) => handleAction(e, "edit", p.id)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50"
                          >
                            编辑
                          </button>
                          <button
                            onClick={(e) => handleAction(e, "archive", p.id)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 text-orange-600"
                          >
                            停用
                          </button>
                          <button
                            onClick={(e) => handleAction(e, "delete", p.id)}
                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                          >
                            删除 (仅管理员)
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleAction(e, "unarchive", p.id)}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 text-[#1677ff]"
                          >
                            恢复生效
                          </button>
                          <button
                            onClick={(e) => handleAction(e, "delete", p.id)}
                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                          >
                            删除 (仅管理员)
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmModal
        isOpen={!!projectToDelete}
        title="确定删除该项目？"
        message="相关记录也将被删除，且此操作不可恢复（仅管理员操作）。"
        onConfirm={confirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
}
