import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../../components/ui/Header";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useAppStore, ProjectIndicator, Project } from "../../store";
import toast from "react-hot-toast";
import { Plus, Trash2, ChevronRight, X, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, addProject, updateProject, categories, baseProjects, archiveProject, unarchiveProject } =
    useAppStore();
  const isEdit = !!id;

  const [formData, setFormData] = useState<{
    name: string;
    mode: "timer" | "register";
    categoryId: string;
    baseProjectId: string;
    indicators: ProjectIndicator[];
    limitPeriod: string;
    targetCompletionsPerPeriod: string;
    hasMaxCompletionsPerDay: boolean;
    maxCompletionsPerDay: string;
    customDays: string;
    targetGrades: string[];
    targetClasses: string[];
    // Challenge features
    allowChallenge: boolean;
    challengeIndicators: ProjectIndicator[];
    challengeRewardTimes: string;
  }>({
    name: "",
    mode: "timer",
    categoryId: categories[0]?.id || "",
    baseProjectId: "",
    indicators: [
      {
        id: Date.now().toString() + "_ind1",
        name: "个数",
        type: "count",
        reqValue: 0,
        unit: "个",
      },
    ],
    limitPeriod: "weekly",
    targetCompletionsPerPeriod: "1",
    hasMaxCompletionsPerDay: false,
    maxCompletionsPerDay: "1",
    customDays: "7",
    targetGrades: ["初一"],
    targetClasses: ["1班"],
    allowChallenge: false,
    challengeIndicators: [
      {
        id: Date.now().toString() + "_chal1",
        name: "个数",
        type: "count",
        reqValue: 0,
        unit: "个",
      },
    ],
    challengeRewardTimes: "1",
  });

  useEffect(() => {
    if (isEdit) {
      const p = projects.find((p) => p.id === id);
      if (p) {
        setFormData({
          name: p.name,
          mode: p.mode || "timer",
          categoryId: p.categoryId || categories[0]?.id || "",
          baseProjectId: p.baseProjectId || "",
          indicators: p.indicators || [],
          limitPeriod: p.limitPeriod,
          targetCompletionsPerPeriod: (
            p.targetCompletionsPerPeriod || 1
          ).toString(),
          hasMaxCompletionsPerDay: p.maxCompletionsPerDay !== undefined && p.maxCompletionsPerDay > 0,
          maxCompletionsPerDay: (p.maxCompletionsPerDay || 1).toString(),
          customDays: (p.customDays || 7).toString(),
          targetGrades: p.targetGrades,
          targetClasses: p.targetClasses,
          allowChallenge: p.allowChallenge || false,
          challengeIndicators: p.challengeIndicators || [
            {
              id: Date.now().toString() + "_chal2",
              name: "个数",
              type: "count",
              reqValue: 0,
              unit: "个",
            },
          ],
          challengeRewardTimes: (p.challengeRewardTimes || 1).toString(),
        });
      }
    }
  }, [id, projects, isEdit, categories]);

  const handleAddIndicator = () => {
    setFormData((prev) => ({
      ...prev,
      indicators: [
        ...prev.indicators,
        {
          id:
            Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: "新指标",
          type: "count",
          reqValue: 0,
          unit: "次",
        },
      ],
    }));
  };

  const updateIndicator = (
    indId: string,
    updates: Partial<ProjectIndicator>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      indicators: prev.indicators.map((ind) => {
        if (ind.id === indId) {
          const newInd = { ...ind, ...updates };
          if (updates.type && updates.type !== ind.type) {
            if (updates.type === "count") newInd.unit = "次";
            else if (updates.type === "time") newInd.unit = "秒";
            else if (updates.type === "distance") newInd.unit = "米";
            else if (updates.type === "custom") newInd.unit = "";
          }
          return newInd;
        }
        return ind;
      }),
    }));
  };

  const removeIndicator = (indId: string) => {
    setFormData((prev) => ({
      ...prev,
      indicators: prev.indicators.filter((ind) => ind.id !== indId),
    }));
  };

  const handleAddChallengeIndicator = () => {
    setFormData((prev) => ({
      ...prev,
      challengeIndicators: [
        ...prev.challengeIndicators,
        {
          id:
            Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: "新挑战指标",
          type: "count",
          reqValue: 0,
          unit: "次",
        },
      ],
    }));
  };

  const updateChallengeIndicator = (
    indId: string,
    updates: Partial<ProjectIndicator>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      challengeIndicators: prev.challengeIndicators.map((ind) => {
        if (ind.id === indId) {
          const newInd = { ...ind, ...updates };
          if (updates.type && updates.type !== ind.type) {
            if (updates.type === "count") newInd.unit = "次";
            else if (updates.type === "time") newInd.unit = "秒";
            else if (updates.type === "distance") newInd.unit = "米";
            else if (updates.type === "custom") newInd.unit = "";
          }
          return newInd;
        }
        return ind;
      }),
    }));
  };

  const removeChallengeIndicator = (indId: string) => {
    setFormData((prev) => ({
      ...prev,
      challengeIndicators: prev.challengeIndicators.filter(
        (ind) => ind.id !== indId,
      ),
    }));
  };

  const [showSelector, setShowSelector] = useState(false);
  const [tempGrade, setTempGrade] = useState<string>("初一");
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const GRADES = ["初一", "初二", "初三"];
  const GRADECONFIG: Record<string, string[]> = {
    初一: ["1班", "2班", "3班", "4班", "5班", "6班", "7班", "8班"],
    初二: ["1班", "2班", "3班", "4班", "5班", "6班", "7班", "8班"],
    初三: ["1班", "2班", "3班", "4班", "5班", "6班", "7班", "8班"],
  };

  const toggleGrade = (grade: string) => {
    setFormData((prev) => {
      const isSelected = prev.targetGrades.includes(grade);
      return {
        ...prev,
        targetGrades: isSelected
          ? prev.targetGrades.filter((g) => g !== grade)
          : [...prev.targetGrades, grade],
      };
    });
  };

  const toggleClass = (grade: string, cls: string) => {
    const fullCls = `${grade}${cls}`;
    setFormData((prev) => {
      const isSelected = prev.targetClasses.includes(fullCls);
      return {
        ...prev,
        targetClasses: isSelected
          ? prev.targetClasses.filter((c) => c !== fullCls)
          : [...prev.targetClasses, fullCls],
      };
    });
  };

  const removeTargetClass = (fullCls: string) => {
    setFormData((prev) => ({
      ...prev,
      targetClasses: prev.targetClasses.filter((c) => c !== fullCls),
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("请输入项目名称");
      return;
    }
    if (!formData.categoryId) {
      toast.error("请选择项目大类");
      return;
    }
    if (formData.indicators.length === 0) {
      toast.error("请至少添加一个指标");
      return;
    }
    if (formData.indicators.some((i) => i.reqValue <= 0)) {
      toast.error("指标要求值必须大于0");
      return;
    }
    if (
      formData.limitPeriod !== "none" &&
      !formData.targetCompletionsPerPeriod
    ) {
      toast.error("周期内总目标次数不能为空");
      return;
    }
    if (formData.hasMaxCompletionsPerDay && !formData.maxCompletionsPerDay) {
      toast.error("每日打卡上限不能为空");
      return;
    }
    if (formData.limitPeriod === "custom" && !formData.customDays) {
      toast.error("自定义天数不能为空");
      return;
    }
    setShowSaveConfirm(true);
  };

  const performSave = () => {
    const payload: Partial<Project> = {
      name: formData.name,
      mode: formData.mode,
      categoryId: formData.categoryId,
      baseProjectId: formData.baseProjectId || undefined,
      type:
        categories.find((c) => c.id === formData.categoryId)?.name ||
        ("custom" as any),
      indicators: formData.indicators,
      limitPeriod: formData.limitPeriod as any,
      targetCompletionsPerPeriod: Number(formData.targetCompletionsPerPeriod),
      maxCompletionsPerDay: formData.hasMaxCompletionsPerDay ? Number(formData.maxCompletionsPerDay) : undefined,
      customDays: Number(formData.customDays),
      targetGrades: formData.targetGrades,
      targetClasses: formData.targetClasses,
      allowChallenge: formData.allowChallenge,
      challengeIndicators: formData.allowChallenge
        ? formData.challengeIndicators
        : [],
      challengeRewardTimes: formData.allowChallenge
        ? Number(formData.challengeRewardTimes)
        : 0,
    };

    setShowSaveConfirm(false);
    toast("保存中...", { icon: "⏳", duration: 800 });

    setTimeout(() => {
      if (isEdit && id) {
        updateProject(id, payload);
      } else {
        addProject(payload as any);
      }
      toast.success(isEdit ? "修改成功" : "项目创建成功");
      navigate(-1);
    }, 800);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
      <Header title={isEdit ? "编辑项目" : "新建项目"} showBack />

      <div className="flex-1 overflow-y-auto pb-24 p-3 flex flex-col gap-3">
        {/* Basic info */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="text-[15px] font-medium text-gray-700 w-24">
              项目名称 <span className="text-red-500">*</span>
            </div>
            <input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入项目名称"
              className="flex-1 text-[15px] outline-none text-right placeholder:text-gray-300"
            />
          </div>
          <div className="px-4 py-3 border-b border-gray-50 flex flex-col gap-3 bg-gray-50/30">
            <div className="text-[15px] font-medium text-gray-700">
              项目归属 <span className="text-red-500">*</span>
              <span className="ml-1 text-[12px] font-normal text-gray-400">
                细分项目可选
              </span>
            </div>
            <div className="flex gap-2">
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setFormData({
                    ...formData,
                    categoryId: newCat,
                    baseProjectId: "",
                  });
                }}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-2.5 text-[14px] outline-none focus:border-[#1677ff] text-gray-800"
              >
                <option value="" disabled>
                  1. 选择大类
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="w-4 flex items-center justify-center text-gray-300">
                <ChevronRight className="w-4 h-4" />
              </div>

              <select
                value={formData.baseProjectId}
                onChange={(e) => {
                  const bp = baseProjects.find((b) => b.id === e.target.value);
                  setFormData({
                    ...formData,
                    baseProjectId: e.target.value,
                    ...(bp
                      ? {
                          mode: bp.mode,
                          indicators: bp.defaultIndicators.map((i) => ({
                            ...i,
                            id:
                              Date.now().toString() +
                              Math.random().toString(36).substring(2, 9),
                            reqValue: 0,
                          })),
                        }
                      : {}),
                  });
                }}
                className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-2.5 text-[14px] outline-none focus:border-[#1677ff] text-gray-800"
              >
                <option value="">
                  2. 细分项目（可选）
                </option>
                {baseProjects
                  .filter((bp) => bp.categoryId === formData.categoryId)
                  .map((bp) => (
                    <option key={bp.id} value={bp.id}>
                      {bp.name}
                    </option>
                  ))}
              </select>
            </div>
            <p className="text-xs text-gray-400">
              只需选择大类即可保存；细分项目仅用于套用模板和标签，可不选。
            </p>
          </div>
          <div className="px-4 py-3">
            <div className="text-[15px] font-medium text-gray-700 mb-2">
              登记模式
            </div>
            <div className="flex gap-6 mt-1 mb-2">
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="radio"
                  name="mode"
                  value="timer"
                  checked={formData.mode === "timer"}
                  onChange={() => setFormData({ ...formData, mode: "timer" })}
                  className="w-4 h-4 text-[#1677ff] accent-[#1677ff]"
                />
                计时模式
              </label>
              <label className="flex items-center gap-2 text-[15px]">
                <input
                  type="radio"
                  name="mode"
                  value="register"
                  checked={formData.mode === "register"}
                  onChange={() =>
                    setFormData({ ...formData, mode: "register" })
                  }
                  className="w-4 h-4 text-[#1677ff] accent-[#1677ff]"
                />
                登记模式
              </label>
            </div>
            <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
              {formData.mode === "timer"
                ? "运动开始前登记，运动完成后提交。"
                : "运动完成后直接登记并提交。"}
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div className="text-[15px] font-medium text-gray-900">
              项目指标 <span className="text-red-500">*</span>
            </div>
            <button
              onClick={handleAddIndicator}
              className="text-[#1677ff] text-[14px] font-medium flex items-center bg-blue-50 px-2.5 py-1 rounded-full"
            >
              <Plus className="w-4 h-4 mr-0.5" /> 添加
            </button>
          </div>

          <div className="flex flex-col">
            {formData.indicators.map((ind, idx) => (
              <div
                key={ind.id}
                className="p-4 border-b border-gray-50 flex flex-col gap-3 relative last:border-0"
              >
                {formData.indicators.length > 1 && (
                  <button
                    onClick={() => removeIndicator(ind.id)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="flex gap-2 pr-6">
                  <div className="flex-[1.2]">
                    <label className="text-[12px] font-medium text-gray-500 mb-1 block">
                      指标类型
                    </label>
                    <select
                      value={ind.type}
                      onChange={(e) =>
                        updateIndicator(ind.id, { type: e.target.value as any })
                      }
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-[14px] outline-none focus:border-[#1677ff] transition-colors"
                    >
                      <option value="count">次数</option>
                      {formData.mode !== "register" && (
                        <option value="time">计时</option>
                      )}
                      <option value="distance">距离</option>
                      <option value="custom">其他</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[12px] font-medium text-gray-500 mb-1 block">
                      要求值
                    </label>
                    <input
                      type="number"
                      value={ind.reqValue || ""}
                      onChange={(e) =>
                        updateIndicator(ind.id, {
                          reqValue: Number(e.target.value),
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-[14px] outline-none focus:border-[#1677ff] transition-colors"
                      placeholder="> 0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[12px] font-medium text-gray-500 mb-1 block">
                      单位
                    </label>
                    {ind.type === "custom" ? (
                      <input
                        type="text"
                        value={ind.unit}
                        onChange={(e) =>
                          updateIndicator(ind.id, { unit: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-[14px] outline-none focus:border-[#1677ff] transition-colors"
                        placeholder="如: 个"
                      />
                    ) : (
                      <select
                        value={ind.unit}
                        onChange={(e) =>
                          updateIndicator(ind.id, { unit: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-[14px] outline-none focus:border-[#1677ff] transition-colors"
                      >
                        {ind.type === "count" && (
                          <>
                            <option value="次">次</option>
                            <option value="个">个</option>
                          </>
                        )}
                        {ind.type === "time" && (
                          <>
                            <option value="秒">秒</option>
                            <option value="分钟">分钟</option>
                          </>
                        )}
                        {ind.type === "distance" && (
                          <>
                            <option value="米">米</option>
                            <option value="千米">千米</option>
                          </>
                        )}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Period Restrictions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <div className="text-[15px] font-medium text-gray-700">
              限制周期
            </div>
            <select
              value={formData.limitPeriod}
              onChange={(e) =>
                setFormData({ ...formData, limitPeriod: e.target.value })
              }
              className="text-[15px] outline-none bg-transparent text-right text-gray-900 dir-rtl"
            >
              <option value="none">不限制</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="custom">自定义天数</option>
            </select>
          </div>

          {formData.limitPeriod !== "none" && (
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-blue-50/30">
              <div className="text-[14px] text-gray-700">周期总目标次数</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.targetCompletionsPerPeriod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      targetCompletionsPerPeriod: e.target.value,
                    })
                  }
                  placeholder="次数"
                  className="w-16 text-right bg-white border border-gray-200 rounded-md px-2 py-1 outline-none text-[15px] focus:border-[#1677ff]"
                />
                <span className="text-[14px] text-gray-500">次</span>
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-b border-gray-50 flex flex-col gap-3 bg-indigo-50/30">
            <div className="flex items-center justify-between">
              <div className="text-[14px] text-gray-700">
                每日打卡上限
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.hasMaxCompletionsPerDay}
                  onChange={(e) =>
                    setFormData({ ...formData, hasMaxCompletionsPerDay: e.target.checked })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1677ff]"></div>
              </label>
            </div>

            {formData.hasMaxCompletionsPerDay && (
              <div className="flex items-center justify-between pt-1 border-t border-indigo-100/50">
                <span className="text-[14px] text-gray-500">每日至多</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.maxCompletionsPerDay}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxCompletionsPerDay: e.target.value,
                      })
                    }
                    placeholder="次数"
                    className="w-16 text-right bg-white border border-gray-200 rounded-md px-2 py-1 outline-none text-[15px] focus:border-[#1677ff]"
                  />
                  <span className="text-[14px] text-gray-500">次</span>
                </div>
              </div>
            )}
          </div>

          {formData.limitPeriod === "custom" && (
            <div className="px-4 py-3 flex items-center justify-between bg-blue-50/30">
              <div className="text-[14px] text-gray-700">自定义天数</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.customDays}
                  onChange={(e) =>
                    setFormData({ ...formData, customDays: e.target.value })
                  }
                  placeholder="天数"
                  className="w-16 text-right bg-white border border-gray-200 rounded-md px-2 py-1 outline-none text-[15px] focus:border-[#1677ff]"
                />
                <span className="text-[14px] text-gray-500">天</span>
              </div>
            </div>
          )}
        </div>

        {/* Challenge Mechanism Config */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-50">
            <div className="text-[15px] font-medium text-gray-900">
              挑战机制
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.allowChallenge}
                onChange={(e) =>
                  setFormData({ ...formData, allowChallenge: e.target.checked })
                }
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1677ff]"></div>
            </label>
          </div>

          {formData.allowChallenge && (
            <div className="flex flex-col bg-orange-50/30">
              <div className="px-4 py-3 border-b border-orange-100 flex items-center justify-between">
                <div className="text-[13px] font-medium text-orange-800">
                  挑战指标配置 <span className="text-red-500">*</span>
                </div>
                <button
                  onClick={handleAddChallengeIndicator}
                  className="text-[#1677ff] text-[13px] font-medium flex items-center bg-white border border-blue-100 px-2 py-1 rounded-full shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-0.5" /> 添加
                </button>
              </div>

              {formData.challengeIndicators.map((ind, idx) => (
                <div
                  key={ind.id}
                  className="p-4 border-b border-orange-100 flex flex-col gap-3 relative last:border-0"
                >
                  {formData.challengeIndicators.length > 1 && (
                    <button
                      onClick={() => removeChallengeIndicator(ind.id)}
                      className="absolute top-4 right-4 text-orange-300 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex gap-2 pr-6">
                    <div className="flex-[1.2]">
                      <label className="text-[12px] font-medium text-orange-600/70 mb-1 block">
                        指标类型
                      </label>
                      <select
                        value={ind.type}
                        onChange={(e) =>
                          updateChallengeIndicator(ind.id, {
                            type: e.target.value as any,
                          })
                        }
                        className="w-full bg-white border border-orange-200 rounded-lg px-2 py-2 text-[14px] outline-none focus:border-orange-400 transition-colors"
                      >
                        <option value="count">次数</option>
                        {formData.mode !== "register" && (
                          <option value="time">计时</option>
                        )}
                        <option value="distance">距离</option>
                        <option value="custom">其他</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[12px] font-medium text-orange-600/70 mb-1 block">
                        要求值
                      </label>
                      <input
                        type="number"
                        value={ind.reqValue || ""}
                        onChange={(e) =>
                          updateChallengeIndicator(ind.id, {
                            reqValue: Number(e.target.value),
                          })
                        }
                        className="w-full bg-white border border-orange-200 rounded-lg px-2 py-2 text-[14px] outline-none focus:border-orange-400 transition-colors"
                        placeholder="> 0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[12px] font-medium text-orange-600/70 mb-1 block">
                        单位
                      </label>
                      {ind.type === "custom" ? (
                        <input
                          type="text"
                          value={ind.unit}
                          onChange={(e) =>
                            updateChallengeIndicator(ind.id, {
                              unit: e.target.value,
                            })
                          }
                          className="w-full bg-white border border-orange-200 rounded-lg px-2 py-2 text-[14px] outline-none focus:border-orange-400 transition-colors"
                          placeholder="如: 个"
                        />
                      ) : (
                        <select
                          value={ind.unit}
                          onChange={(e) =>
                            updateChallengeIndicator(ind.id, {
                              unit: e.target.value,
                            })
                          }
                          className="w-full bg-white border border-orange-200 rounded-lg px-2 py-2 text-[14px] outline-none focus:border-orange-400 transition-colors"
                        >
                          {ind.type === "count" && (
                            <>
                              <option value="次">次</option>
                              <option value="个">个</option>
                            </>
                          )}
                          {ind.type === "time" && (
                            <>
                              <option value="秒">秒</option>
                              <option value="分钟">分钟</option>
                            </>
                          )}
                          {ind.type === "distance" && (
                            <>
                              <option value="米">米</option>
                              <option value="千米">千米</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="px-4 py-3 flex items-center justify-between border-t border-orange-100 bg-orange-100/50">
                <div>
                  <div className="text-[14px] font-medium text-orange-900">
                    奖励运动次数
                  </div>
                  <div className="text-[11px] text-orange-600/80 mt-0.5">
                    挑战达标奖励额外的完成次数
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-orange-500">
                    +
                  </span>
                  <input
                    type="number"
                    value={formData.challengeRewardTimes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        challengeRewardTimes: e.target.value,
                      })
                    }
                    placeholder="次数"
                    className="w-14 text-center bg-white border border-orange-200 rounded-md px-1 py-1 outline-none text-[15px] font-bold text-orange-600 focus:border-orange-400"
                  />
                  <span className="text-[14px] text-orange-700">次</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      <div className="fixed bottom-0 w-full max-w-[480px] bg-white p-4 border-t border-gray-100 z-50 pb-6 flex gap-3">
        {isEdit && (() => {
          const project = projects.find(p => p.id === id);
          if (!project) return null;
          const isActive = project.status === "open";
          return (
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="flex-1 bg-gray-100/80 text-gray-700 py-3 rounded-xl font-medium text-[16px] active:bg-gray-200 transition-colors border border-gray-200 shadow-sm"
            >
              {isActive ? "停用项目" : "启用项目"}
            </button>
          )
        })()}
        <button
          onClick={handleSave}
          className="flex-[2] bg-[#1677ff] text-white py-3 rounded-xl font-medium text-[16px] active:bg-[#0958d9] transition-colors shadow-sm shadow-[#1677ff]/30"
        >
          保存项目
        </button>
      </div>

      <ConfirmModal
        isOpen={showSaveConfirm}
        title="确认保存项目"
        message={`确定要保存对 ${formData.name} 的配置吗？`}
        onConfirm={performSave}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeactivateConfirm}
        title={projects.find(p => p.id === id)?.status === "open" ? "确认停用项目" : "确认启用项目"}
        message={projects.find(p => p.id === id)?.status === "open" ? "停用后，学生端将无法继续选择此项目打卡。之前此项目的打卡记录不受影响。确定停用该项目吗？" : "启用后，学生端可以继续选择此项目进行打卡。确定启用该项目吗？"}
        onConfirm={() => {
          const project = projects.find(p => p.id === id);
          if (!project) return;
          if (project.status === "open") {
            archiveProject(project.id);
            toast.success("项目已停用");
          } else {
            unarchiveProject(project.id);
            toast.success("项目已启用");
          }
          setShowDeactivateConfirm(false);
          navigate(-1);
        }}
        onCancel={() => setShowDeactivateConfirm(false)}
      />
    </div>
  );
}
