import React, { useState } from "react";
import { Header } from "../../components/ui/Header";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useAppStore, Category } from "../../store";
import { Edit3, Calendar, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

export function CategoryList() {
  const { categories, updateCategory, addCategory, baseProjects, projects } = useAppStore();
  
  // Default to current month, format YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createTarget, setCreateTarget] = useState(10);
  const [createMode, setCreateMode] = useState<"timer" | "register">("register");
  
  // Temporary state for the input value in the edit modal
  const [editTarget, setEditTarget] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEditClick = (cat: Category) => {
    setEditingCategory(cat);
    // Use month-specific rule if it exists, otherwise fall back to default
    setEditTarget(cat.monthlyRules?.[selectedMonth] ?? cat.targetCompletions);
  };

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const performSave = () => {
    if (editingCategory) {
      const updatedRules = { ...(editingCategory.monthlyRules || {}) };
      updatedRules[selectedMonth] = editTarget;
      
      updateCategory(editingCategory.id, {
        ...editingCategory,
        monthlyRules: updatedRules,
      });
      toast.success("保存成功");
      setEditingCategory(null);
      setShowConfirm(false);
    }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = createName.trim();
    if (!name) {
      toast.error("请输入类别名称");
      return;
    }
    if (categories.some((category) => category.name === name)) {
      toast.error("类别名称已存在");
      return;
    }

    addCategory({
      name,
      targetCompletions: Math.max(0, createTarget),
      baseProjectName: name,
      mode: createMode,
      periodType: "month",
    });
    toast.success("类别创建成功");
    setCreateName("");
    setCreateTarget(10);
    setCreateMode("register");
    setShowCreateCategory(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] pb-20">
      <Header
        title="运动类别配置"
        showBack
        rightNode={
          <button
            onClick={() => setShowCreateCategory(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[#1677ff] active:bg-blue-100"
            aria-label="新建类别"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />

      <div className="p-4 flex flex-col gap-4">
        <button
          onClick={() => setShowCreateCategory(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-[15px] font-medium text-[#1677ff] shadow-sm active:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          新建运动类别
        </button>

        {/* Month Selector */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Calendar className="w-5 h-5 text-[#1677ff]" />
            <span>配置月份</span>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none bg-gray-50 rounded-lg px-3 py-1.5 text-[15px] outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800"
          />
        </div>

        {categories.map((cat) => {
          // get the active projects for this category to list their names
          const catProjectNames = projects
            .filter((p) => p.categoryId === cat.id && p.status === "open")
            .map((p) => p.name)
            .join("、");

          const currentTarget = cat.monthlyRules?.[selectedMonth] ?? cat.targetCompletions;

          return (
            <div
              key={cat.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col relative"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-[16px] text-[#1677ff] leading-none">
                  {cat.name}
                </h3>
                <button
                  onClick={() => handleEditClick(cat)}
                  className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[#1677ff]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[13px] text-gray-600 flex flex-col gap-2">
                <div className="flex">
                  <span className="w-20 text-gray-500">达标周期:</span>
                  <span>按月</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-gray-500">当月下限:</span>
                  <span className="font-medium text-gray-900">{currentTarget}次</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-gray-500 shrink-0">包含项目:</span>
                  <span className="truncate">{catProjectNames || "无"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreateCategory && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 transition-opacity">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm overflow-hidden animate-slide-up sm:animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                新建运动类别
              </h3>
              <button
                onClick={() => setShowCreateCategory(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-medium text-gray-600">
                  类别名称
                </label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="例如：篮球、跳绳、游泳"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[15px] outline-none focus:border-[#1677ff] focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-medium text-gray-600">
                  当月达标次数下限
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={createTarget}
                    onChange={(e) => setCreateTarget(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-[15px] font-bold text-[#1677ff] outline-none focus:border-[#1677ff] focus:bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-400">
                    次
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-medium text-gray-600">
                  默认登记模式
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateMode("register")}
                    className={`rounded-lg border px-3 py-2.5 text-[14px] font-medium ${
                      createMode === "register"
                        ? "border-[#1677ff] bg-blue-50 text-[#1677ff]"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    登记模式
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode("timer")}
                    className={`rounded-lg border px-3 py-2.5 text-[14px] font-medium ${
                      createMode === "timer"
                        ? "border-[#1677ff] bg-blue-50 text-[#1677ff]"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    计时模式
                  </button>
                </div>
                <div className="text-[12px] leading-5 text-gray-400">
                  保存后会自动生成同名细分项目，后续新建项目时可以直接选择。
                </div>
              </div>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCategory(false)}
                  className="flex-1 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-medium text-white bg-[#1677ff] active:bg-[#0958d9] transition-colors"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 transition-opacity">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm overflow-hidden animate-slide-up sm:animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                配置类别: {editingCategory.name}
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClick} className="p-4 flex flex-col gap-6">
              <div className="flex flex-col gap-2 opacity-70">
                <label className="text-[14px] font-medium text-gray-500">
                  达标周期
                </label>
                <div className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-[15px] font-medium text-gray-700">
                  按月（{selectedMonth}）
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 bg-blue-50/50 border border-blue-100 rounded-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1677ff]"></div>
                <label className="text-[14px] font-bold text-[#1677ff]">
                  当月达标次数下限
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={editTarget}
                    onChange={(e) => setEditTarget(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-blue-200 rounded-lg py-3 pl-4 pr-10 text-[18px] font-bold text-[#1677ff] outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#1677ff] transition-all shadow-sm"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1677ff] opacity-60 font-medium z-10 pointer-events-none">次</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 opacity-70">
                <label className="text-[14px] font-medium text-gray-500">
                  包含项目
                </label>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-[14px] text-gray-600 max-h-32 overflow-y-auto">
                  {baseProjects.filter(
                    (p) => p.categoryId === editingCategory.id,
                  ).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {baseProjects
                        .filter((p) => p.categoryId === editingCategory.id)
                        .map((p) => (
                          <span
                            key={p.id}
                            className="bg-white px-2 py-1 rounded border border-gray-200 shadow-sm text-gray-700"
                          >
                            {p.name}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">暂无项目</span>
                  )}
                </div>
              </div>

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-medium text-white bg-[#1677ff] active:bg-[#0958d9] transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        title="确认保存"
        message={`确定要将 ${editingCategory?.name} 在 ${selectedMonth} 的达标次数下限修改为 ${editTarget} 次吗？`}
        onConfirm={performSave}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
