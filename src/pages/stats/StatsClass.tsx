import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Header } from "../../components/ui/Header";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useAppStore, DUMMY_STUDENTS, Record } from "../../store";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { X, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";

export function StatsClass() {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { records, projects, categories, invalidateRecord, statsMonth } = useAppStore();

  const [selectedStudentRecords, setSelectedStudentRecords] = useState<
    string | null
  >(null);
  const [showInvalidateConfirm, setShowInvalidateConfirm] = useState<
    string | null
  >(null);

  const period = searchParams.get("period") || "thisSemester";

  // For demo: filter records
  const relevantRecords = records.filter((r) => !r.isInvalid && r.datetime.startsWith(statsMonth));

  // Extract grade and className from classId (which is the full name like "初一1班")
  const grade = classId?.startsWith("初一")
    ? "初一"
    : classId?.startsWith("初二")
      ? "初二"
      : "初三";
  const classNameOnly = classId?.replace(grade, "") || classId || "1班";

  // Get students in this class
  const classStudents = DUMMY_STUDENTS.filter(
    (s) => s.grade === grade && s.className === classNameOnly,
  );

  // Calculate grade-level rankings based on total met categories
  const gradeStudents = DUMMY_STUDENTS.filter((s) => s.grade === grade);

  const computeMetCategories = (studentId: string) => {
    let metCount = 0;
    const metCatNames: string[] = [];
    const sRecords = relevantRecords.filter(
      (r) => r.studentId === studentId && r.isPassed,
    );

    categories.forEach((cat) => {
      const catProjectIds = projects
        .filter((p) => p.categoryId === cat.id)
        .map((p) => p.id);
      const catTimes = sRecords
        .filter((r) => catProjectIds.includes(r.projectId))
        .reduce((sum, r) => sum + (r.totalTimes || 1), 0);

      const targetCompletions = cat.monthlyRules?.[statsMonth] ?? cat.targetCompletions;
      if (catTimes >= targetCompletions) {
        metCount++;
        metCatNames.push(cat.name);
      }
    });
    return { metCount, metCatNames };
  };

  const gradeRankings = gradeStudents
    .map((student) => {
      const { metCount } = computeMetCategories(student.id);
      return { id: student.id, metCount };
    })
    .sort((a, b) => b.metCount - a.metCount);

  const gradeRanks = new Map<string, number>();
  let currentRank = 1;
  let currentTotal = -1;
  gradeRankings.forEach((s, idx) => {
    if (s.metCount !== currentTotal) {
      currentRank = idx + 1;
      currentTotal = s.metCount;
    }
    gradeRanks.set(s.id, currentRank);
  });

  const studentStats = classStudents
    .map((student) => {
      const sRecords = relevantRecords.filter(
        (r) => r.studentId === student.id,
      );
      const { metCount, metCatNames } = computeMetCategories(student.id);

      return {
        ...student,
        metCount,
        metCatNames,
        gradeRank: gradeRanks.get(student.id) || "-",
        records: sRecords,
      };
    })
    .sort((a, b) => b.metCount - a.metCount);

  const selectedStudent = studentStats.find(
    (s) => s.id === selectedStudentRecords,
  );

  const handleExport = () => {
    toast.success("正在生成表格...", { duration: 1000 });

    // Prepare headers
    const baseHeaders = ["姓名", "学号", "班级", "总达标分类数", "全部满标"];
    const catHeaders = categories.flatMap((c) => [
      `${c.name}-完成次数`,
      `${c.name}-目标下限`,
      `${c.name}-目标完成率`,
      `${c.name}-是否达标`,
    ]);
    const headers = [...baseHeaders, ...catHeaders];

    // Prepare rows
    const rows = studentStats.map((student) => {
      const clsName = `${student.grade}${student.className}`;
      const baseInfo = [
        student.name,
        student.id,
        clsName,
        student.metCount.toString(),
        student.metCount === categories.length ? "是" : "否",
      ];

      const catInfos = categories.flatMap((cat) => {
        const catProjectIds = projects
          .filter((p) => p.categoryId === cat.id)
          .map((p) => p.id);
        const sRecords = relevantRecords.filter(
          (r) => r.studentId === student.id && r.isPassed,
        );
        const catTimes = sRecords
          .filter((r) => catProjectIds.includes(r.projectId))
          .reduce((sum, r) => sum + (r.totalTimes || 1), 0);

        const targetCompletions = cat.monthlyRules?.[statsMonth] ?? cat.targetCompletions;
        const isMet = catTimes >= targetCompletions;
        const completeRate =
          targetCompletions > 0
            ? `${Math.round((catTimes / targetCompletions) * 100)}%`
            : "100%";

        return [
          catTimes.toString(),
          targetCompletions.toString(),
          completeRate,
          isMet ? "是" : "否",
        ];
      });

      return [...baseInfo, ...catInfos];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    setTimeout(() => {
      // Create a blob and trigger download
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${classId || "班级"}_达标明细.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("导出成功");
    }, 1500);
  };

  const confirmInvalidate = () => {
    if (showInvalidateConfirm) {
      invalidateRecord(showInvalidateConfirm);
      toast.success("记录已作废");
      setShowInvalidateConfirm(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] pb-24">
      <Header title={`${classId || "班级"}统计`} showBack />

      <div className="bg-white p-4 border-b border-gray-100 shadow-sm flex flex-col gap-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>
            统计周期：
            {period === "thisWeek"
              ? "本周"
              : period === "thisMonth"
                ? "本月"
                : "本学期"}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          全局考核 {categories.length} 个运动类别
        </div>
      </div>

      <div className="p-3">
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium text-xs">
              <tr>
                <th className="py-3 px-2 w-[18%]">姓名</th>
                <th className="py-3 px-1 w-[18%] text-center">全部满标</th>
                <th className="py-3 px-1 w-[38%] text-center">已达标分类</th>
                <th className="py-3 px-1 w-[14%] text-center">年级排名</th>
                <th className="py-3 px-1 w-[12%] text-center">详情</th>
              </tr>
            </thead>
            <tbody>
              {studentStats.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50"
                >
                  <td className="py-3 px-2 font-medium text-gray-900 truncate max-w-[80px]">
                    {row.name}
                  </td>
                  <td className="py-3 px-1 text-center font-medium">
                    {row.metCount === categories.length ? (
                      <span className="text-emerald-500 font-bold">是</span>
                    ) : (
                      <span className="text-gray-400">
                        否 ({row.metCount}/{categories.length})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-1 text-center text-xs text-gray-600">
                    {row.metCatNames.length > 0 ? (
                      row.metCatNames.join("、")
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="py-3 px-1 text-center font-mono text-gray-700">
                    {row.gradeRank}
                  </td>
                  <td className="py-3 px-1 text-center">
                    <button
                      onClick={() => setSelectedStudentRecords(row.id)}
                      className="text-[#1677ff] active:text-[#0958d9] font-medium"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelectedStudentRecords(null)}
          ></div>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col relative animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedStudent.name}的运动记录
                </h3>
                <p className="text-xs text-gray-500">
                  已达标 {selectedStudent.metCount} 个一级分类
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentRecords(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedStudent.records.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  暂无运动记录
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedStudent.records
                    .map((record) => (
                      <div
                        key={record.id}
                        className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm relative"
                      >
                        <div className="flex justify-between items-start mb-2 pr-8">
                          <div>
                            <div className="text-sm font-bold text-gray-800">
                              {
                                projects.find((p) => p.id === record.projectId)
                                  ?.name
                              }
                            </div>
                            <div className="text-[11px] text-[#1677ff] mt-0.5">
                              归属:{" "}
                              {
                                categories.find(
                                  (c) =>
                                    c.id ===
                                    projects.find(
                                      (p) => p.id === record.projectId,
                                    )?.categoryId,
                                )?.name
                              }
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">
                              {format(
                                new Date(record.datetime),
                                "yyyy-MM-dd HH:mm",
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-[#1677ff]">
                              {record.achievedValue}{" "}
                              {
                                projects.find((p) => p.id === record.projectId)
                                  ?.indicators?.[0]?.unit
                              }
                            </div>
                            <div
                              className={cn(
                                "text-[10px] px-1 rounded mt-0.5 border inline-block",
                                record.isPassed
                                  ? record.isChallenge
                                    ? "text-[#d48806] bg-[#fffbe6] border-[#ffe58f]"
                                    : "text-green-600 bg-green-50 border-green-200"
                                  : "text-gray-400 bg-gray-50 border-gray-200",
                              )}
                            >
                              {record.isPassed
                                ? record.isChallenge
                                  ? "挑战完成 ✨"
                                  : "已完成"
                                : "取消"}
                            </div>
                            {record.isChallenge && (
                              <div className="text-[10px] text-orange-500 mt-0.5">
                                + {record.totalTimes} 次
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                    .reverse()}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-50">
              <button
                onClick={() => setSelectedStudentRecords(null)}
                className="w-full py-3 bg-[#1677ff] text-white rounded-xl font-medium active:bg-[#0958d9]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!showInvalidateConfirm}
        title="确认作废该记录？"
        message="记录作废后将无法恢复，且不计入统计结果。确认继续吗？"
        onConfirm={confirmInvalidate}
        onCancel={() => setShowInvalidateConfirm(null)}
      />

      <div className="fixed bottom-0 w-full max-w-[480px] bg-white p-4 border-t border-gray-100 z-50">
        <button
          onClick={handleExport}
          className="w-full bg-white border border-[#1677ff] text-[#1677ff] py-3 rounded-xl font-medium text-[16px] active:bg-gray-50 transition-colors"
        >
          导出班级明细
        </button>
      </div>
    </div>
  );
}
