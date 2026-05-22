import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "../../components/ui/Header";
import { Flame, BarChart3, ChevronRight } from "lucide-react";
import { useAppStore, DUMMY_STUDENTS } from "../../store";

const projectTypes = [
  { name: "有氧训练", count: 4520, percent: "53%" },
  { name: "力量训练", count: 3210, percent: "37%" },
  { name: "球类运动", count: 800, percent: "10%" },
];

export function StatsProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const [period, setPeriod] = useState("thisMonth");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    location.state?.categoryId || "all",
  );
  const { projects, records, categories, baseProjects, statsMonth } = useAppStore();

  const periodLabels: Record<string, string> = {
    thisWeek: "本周",
    thisMonth: "本月",
    thisSemester: "本学期",
    custom: "自定义期间",
  };

  const projectHotness = useMemo(() => {
    let filteredProjects = projects;
    if (selectedCategory !== "all") {
      filteredProjects = projects.filter(
        (p) => p.categoryId === selectedCategory,
      );
    }

    return filteredProjects
      .map((p) => {
        const pRecords = records.filter(
          (r) => r.projectId === p.id && r.isPassed,
        );
        return {
          id: p.id,
          name: p.name,
          type: p.type || "未分类",
          count: pRecords.length,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [projects, records, selectedCategory]);

  const categoryStats = useMemo(() => {
    const activeStudents = DUMMY_STUDENTS;

    if (selectedCategory === "all") {
      let totalEngagement = 0;
      records
        .filter((r) => r.isPassed && !r.isInvalid && r.datetime.startsWith(statsMonth))
        .forEach((r) => {
          totalEngagement += r.totalTimes || 1;
        });

      let fullyAchievedStudents = 0;
      if (categories.length > 0) {
        activeStudents.forEach((student) => {
          let studentMetAll = true;
          for (const cat of categories) {
            const targetCompletions = cat.monthlyRules?.[statsMonth] ?? cat.targetCompletions;
            const catProjectIds = projects
              .filter((p) => p.categoryId === cat.id)
              .map((p) => p.id);
            const sRecords = records.filter(
              (r) =>
                r.studentId === student.id &&
                r.isPassed &&
                !r.isInvalid &&
                r.datetime.startsWith(statsMonth) &&
                catProjectIds.includes(r.projectId),
            );
            const catTimes = sRecords.reduce(
              (sum, r) => sum + (r.totalTimes || 1),
              0,
            );
            if (catTimes < targetCompletions) {
              studentMetAll = false;
              break;
            }
          }
          if (studentMetAll) fullyAchievedStudents++;
        });
      }

      const completionRate =
        activeStudents.length > 0
          ? Math.round((fullyAchievedStudents / activeStudents.length) * 100)
          : 0;

      return {
        isAll: true,
        target: "全部大类",
        achieved: fullyAchievedStudents,
        total: activeStudents.length,
        rate: completionRate,
        engagement: totalEngagement,
      };
    }

    const cat = categories.find((c) => c.id === selectedCategory);
    if (!cat) return null;

    const catProjectIds = projects
      .filter((p) => p.categoryId === cat.id)
      .map((p) => p.id);

    let totalAchieved = 0;
    let totalEngagement = 0;

    activeStudents.forEach((student) => {
      const targetCompletions = cat.monthlyRules?.[statsMonth] ?? cat.targetCompletions;
      const sRecords = records.filter(
        (r) =>
          r.studentId === student.id &&
          r.isPassed &&
          !r.isInvalid &&
          r.datetime.startsWith(statsMonth) &&
          catProjectIds.includes(r.projectId),
      );
      const catTimes = sRecords.reduce(
        (sum, r) => sum + (r.totalTimes || 1),
        0,
      );
      totalEngagement += catTimes;
      if (catTimes >= targetCompletions) {
        totalAchieved++;
      }
    });

    const completionRate =
      activeStudents.length > 0
        ? Math.round((totalAchieved / activeStudents.length) * 100)
        : 0;

    return {
      isAll: false,
      target: (cat.monthlyRules?.[statsMonth] ?? cat.targetCompletions) + "次",
      achieved: totalAchieved,
      total: activeStudents.length,
      rate: completionRate,
      engagement: totalEngagement,
    };
  }, [selectedCategory, categories, projects, records]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] pb-safe">
      <Header title="项目统计" showBack />

      <div className="flex-1 overflow-y-auto mt-3 px-3 flex flex-col gap-3 pb-8">
        {/* Period Selector */}
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden mb-1">
          <div className="px-4 py-3 border-b border-gray-50 text-left">
            <div className="text-sm text-gray-500 mb-2">统计周期</div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full text-[16px] outline-none bg-transparent text-gray-800"
            >
              <option value="thisWeek">本周</option>
              <option value="thisMonth">本月</option>
              <option value="thisSemester">本学期</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          {period === "custom" && (
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <input
                type="date"
                className="flex-1 outline-none text-[15px] bg-transparent"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                className="flex-1 outline-none text-[15px] text-right bg-transparent"
              />
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="bg-white border-b border-gray-100 overflow-x-auto no-scrollbar pt-2 px-1 mb-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex gap-4 px-2 min-w-max pb-3">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-50 text-[#1677ff] border border-blue-100"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent"
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-50 text-[#1677ff] border border-blue-100"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Stats */}
        {categoryStats && (
          <div className="grid grid-cols-2 gap-3 mb-1">
            <div className="bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col justify-between">
              <div className="text-[13px] text-gray-500 mb-1 flex items-center gap-1.5">
                {categoryStats.isAll
                  ? "满标人数 / 总人数"
                  : "达标人数 / 总人数"}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-800">
                  {categoryStats.achieved}
                </span>
                <span className="text-[12px] text-gray-400 font-normal">
                  / {categoryStats.total}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-2">
                目标: {categoryStats.target}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col justify-between">
              <div className="text-[13px] text-gray-500 mb-1 flex items-center gap-1.5">
                达标率
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-800">
                  {categoryStats.rate}%
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-2">
                累计参与: {categoryStats.engagement}人次
              </div>
            </div>
          </div>
        )}

        {/* Project Hotness */}
        <div className="bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-orange-500" />
            <div className="text-[15px] font-bold text-gray-800">
              {periodLabels[period]}项目参与热度
            </div>
          </div>
          <div className="space-y-3">
            {projectHotness.map((p, index) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 -mx-2 rounded-lg active:bg-gray-50 transition-colors"
                onClick={() => navigate(`/stats/projects/${p.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? "bg-rose-100 text-rose-600"
                        : index === 1
                          ? "bg-orange-100 text-orange-600"
                          : index === 2
                            ? "bg-amber-100 text-amber-600"
                            : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-gray-800">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-gray-400">{p.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[14px] font-bold text-gray-700">
                    {p.count.toLocaleString()}{" "}
                    <span className="text-[11px] text-gray-400 font-normal">
                      人次
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
