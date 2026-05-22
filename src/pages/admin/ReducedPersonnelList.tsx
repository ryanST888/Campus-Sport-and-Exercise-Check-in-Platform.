import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Header } from "../../components/ui/Header";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useAppStore, DUMMY_STUDENTS } from "../../store";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Info,
  AlertCircle,
  X,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { StudentSelectorModal } from "../../components/ui/StudentSelectorModal";

const RECENT_REASONS_KEY = "recent_reduced_reasons";
const REDUCTIONS_CONFIG_KEY = "last_reductions_config";

export function ReducedPersonnelList() {
  const { reducedPersonnel, addReducedPersonnel, removeReducedPersonnel, categories } =
    useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "import">("manual");
  const [showConfirm, setShowConfirm] = useState(false);

  // Manual Select State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedData, setImportedData] = useState<
    { id: string; reason: string }[]
  >([]);
  const [importFailures, setImportFailures] = useState<
    { name: string; className: string; error: string }[]
  >([]);
  const [hasImported, setHasImported] = useState(false);

  // Config State
  const [reductions, setReductions] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [recentReasons, setRecentReasons] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedReasons = localStorage.getItem(RECENT_REASONS_KEY);
      if (storedReasons) {
        setRecentReasons(JSON.parse(storedReasons));
      }

      const storedReductions = localStorage.getItem(REDUCTIONS_CONFIG_KEY);
      if (storedReductions) {
        setReductions(JSON.parse(storedReductions));
      } else {
        const initial: Record<string, number | undefined> = {};
        categories.forEach(c => initial[c.id] = undefined as any);
        setReductions(initial as any);
      }
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  const updateReduction = (categoryId: string, val: number) => {
    const next = { ...reductions, [categoryId]: val };
    setReductions(next);
    localStorage.setItem(REDUCTIONS_CONFIG_KEY, JSON.stringify(next));
  };

  const saveRecentReason = (r: string) => {
    if (!r.trim()) return;
    const newReasons = [r, ...recentReasons.filter((x) => x !== r)].slice(0, 5);
    setRecentReasons(newReasons);
    localStorage.setItem(RECENT_REASONS_KEY, JSON.stringify(newReasons));
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([["姓名", "班级", "原因"]]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, "减免打卡人员导入模板.xlsx");
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const validData: { id: string; reason: string }[] = [];
        const failures: { name: string; className: string; error: string }[] = [];

        data.forEach((row) => {
          const name = row["姓名"]?.toString().trim();
          const className = row["班级"]?.toString().trim();
          const rowReason = row["原因"]?.toString().trim() || "";

          if (!name) {
            failures.push({
              name: name || "未知",
              className: className || "",
              error: "姓名不能为空",
            });
            return;
          }

          const matchedStudents = DUMMY_STUDENTS.filter((s) => s.name === name);

          if (matchedStudents.length === 0) {
            failures.push({
              name,
              className: className || "",
              error: "系统中未找到该学生",
            });
            return;
          }

          let matchedStudent = matchedStudents[0];
          if (matchedStudents.length > 1 && className) {
            const exactMatch = matchedStudents.find(
              (s) => s.className === className,
            );
            if (exactMatch) {
              matchedStudent = exactMatch;
            } else {
              failures.push({
                name,
                className,
                error: "存在同名学生，且班级不匹配",
              });
              return;
            }
          }

          validData.push({ id: matchedStudent.id, reason: rowReason });
        });

        setImportedData(validData);
        setImportFailures(failures);
        setHasImported(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        toast.error("文件解析失败，请确保格式正确");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddClick = () => {
    const hasValidReductions = Object.entries(reductions).some(([catId, val]) => {
      if (val === undefined) return false;
      const cat = categories.find(c => c.id === catId);
      if (!cat) return false;
      const activeTarget = cat.monthlyRules?.[format(new Date(), "yyyy-MM")] ?? cat.targetCompletions;
      return (val as number) < activeTarget;
    });

    if (addMode === "manual" && selectedStudentIds.length === 0) {
      toast.error("请至少选择一个学生");
      return;
    }
    if (addMode === "import" && importedData.length === 0) {
      toast.error("请先导入有效的学生名单");
      return;
    }
    if (!hasValidReductions) {
      toast.error("请至少配置一个运动类别的减免后目标次数 (需低于原目标)");
      return;
    }
    setShowConfirm(true);
  };

  const handleAdd = () => {

    let addedCount = 0;
    
    if (addMode === "manual") {
      selectedStudentIds.forEach((studentId) => {
        if (!reducedPersonnel.some((p) => p.studentId === studentId)) {
          addReducedPersonnel({
            studentId,
            reductions,
            reason,
          });
          addedCount++;
        }
      });
    } else {
      importedData.forEach((data) => {
        if (!reducedPersonnel.some((p) => p.studentId === data.id)) {
          addReducedPersonnel({
            studentId: data.id,
            reductions,
            reason: data.reason || reason,
          });
          addedCount++;
        }
      });
    }

    setSelectedStudentIds([]);
    setImportedData([]);
    setImportFailures([]);
    setHasImported(false);
    
    if (addMode === "manual" && reason.trim()) {
      saveRecentReason(reason);
    }

    setReason("");
    setIsAdding(false);
    setShowConfirm(false);
    toast.success(`成功添加 ${addedCount} 名学生`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] pb-24">
      <Header title="减免打卡人员配置" showBack={true} />

      <div className="p-4 flex flex-col gap-4">
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full bg-white border border-gray-200 text-[#1677ff] rounded-xl py-3 flex items-center justify-center gap-2 font-medium shadow-sm transition-all hover:bg-gray-50"
          >
            <Plus className="w-5 h-5" />
            新增减免人员
          </button>
        )}
        
        {isAdding ? (
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col gap-5">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                className={`flex-1 py-2 text-[14px] font-medium text-center ${addMode === "manual" ? "bg-[#1677ff] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"}`}
                onClick={() => setAddMode("manual")}
              >
                手动选择
              </button>
              <button
                className={`flex-1 py-2 text-[14px] font-medium text-center ${addMode === "import" ? "bg-[#1677ff] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"}`}
                onClick={() => setAddMode("import")}
              >
                批量导入
              </button>
            </div>

            {addMode === "manual" && (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-gray-700 block">1. 选择学生</label>
                <div 
                  onClick={() => setIsSelectorOpen(true)}
                  className="flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50 p-3 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-[14px] text-gray-800">
                    <Users className="w-4 h-4 text-[#1677ff]" />
                    <span className="font-medium">
                      {selectedStudentIds.length > 0 ? `已选择 ${selectedStudentIds.length} 人` : "点击选择学生"}
                    </span>
                  </div>
                  <div className={`text-[12px] px-2 py-1 rounded transition-colors ${selectedStudentIds.length > 0 ? "text-[#1677ff] bg-blue-50" : "text-gray-500 bg-gray-200"}`}>
                    {selectedStudentIds.length > 0 ? "重新选择" : "去选择"}
                  </div>
                </div>
              </div>
            )}

            {addMode === "import" && (
              <div className="flex flex-col gap-4">
                <label className="text-[13px] font-medium text-gray-700 block">1. 导入名单</label>
                <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-3 flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-[13px] text-blue-800/90 leading-relaxed">
                    导入指引：
                    <ol className="list-decimal pl-4 mt-1 space-y-1 text-blue-800/80">
                      <li>点击导出包含表头的模板文件。</li>
                      <li>在模板中填写姓名和班级，并保存。</li>
                      <li>上传填写完毕后的文件。</li>
                    </ol>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center justify-center gap-2 border border-blue-200 bg-white text-[#1677ff] py-2.5 rounded-lg text-[13px] font-medium hover:bg-blue-50 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    导出模板
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 border border-[#1677ff] bg-[#1677ff] text-white py-2.5 rounded-lg text-[13px] font-medium hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    上传名单
                  </button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                </div>

                {hasImported && (
                  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 mt-1 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-[13px] font-bold text-gray-800">导入结果</div>
                      {importFailures.length > 0 && (
                        <div className="text-[12px] text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          存在 {importFailures.length} 条失败数据
                        </div>
                      )}
                    </div>
                    
                    <div className="text-[13px] text-gray-600">
                      成功识别有效学生数：
                      <span className="font-bold text-green-600">
                        {importedData.length}
                      </span>{" "}
                      人。
                    </div>

                    {importFailures.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-[12px] text-gray-500 mb-1.5">失败明细：</div>
                        <div className="max-h-32 overflow-y-auto space-y-1.5">
                          {importFailures.map((fail, idx) => (
                            <div
                              key={idx}
                              className="flex text-[12px] bg-white border border-red-100 p-1.5 rounded-md text-red-600 items-start gap-1.5 shadow-sm"
                            >
                              <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium">{fail.name}</span>
                                {fail.className ? ` (${fail.className})` : ""} -{" "}
                                {fail.error}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {addMode === "manual" && (
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                <label className="text-[13px] font-medium text-gray-700 block">
                  2. 减免原因 (选填)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-[14px] focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm"
                    placeholder="例如：特长生、身体原因等"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  {recentReasons.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {recentReasons.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => setReason(r)}
                          className="text-[12px] bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors border border-gray-200/50"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
              <label className="text-[13px] font-medium text-gray-700 block">3. 配置减免次数 (针对以上人员)</label>
              
              <div className="bg-orange-50/70 border border-orange-100 rounded-lg p-2.5 flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="text-[12px] text-orange-800/90 leading-relaxed font-medium">
                  说明：人员运动类别完成次数在减免后达到目标即视为达标。
                </div>
              </div>

              <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-3 py-2 text-[12px] font-medium text-gray-500 flex justify-between uppercase tracking-wider">
                  <span>运动类别与目标</span>
                  <span>减免后达标次数设定</span>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {categories.map((cat) => {
                    const activeTarget = cat.monthlyRules?.[format(new Date(), "yyyy-MM")] ?? cat.targetCompletions;
                    return (
                    <div key={cat.id} className="px-3 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div>
                        <div className="text-[14px] font-bold text-gray-800">{cat.name}</div>
                        <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-1 border border-gray-200 rounded-full px-2 py-0.5 w-fit bg-white">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          目标: {activeTarget} 次
                        </div>
                      </div>
                      <div className="w-28 relative">
                        <input
                          type="number"
                          min="0"
                          max={activeTarget}
                          className="w-full border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-[14px] font-medium text-center focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                          value={reductions[cat.id] !== undefined ? reductions[cat.id] : ""}
                          onChange={(e) => {
                            if (e.target.value === "") {
                              updateReduction(cat.id, undefined as any);
                              return;
                            }
                            let val = parseInt(e.target.value);
                            if (isNaN(val)) return;
                            if (val > activeTarget) {
                              val = activeTarget;
                              toast.error(`减免后达标次数不能超过本月目标次数 (${activeTarget}次)`);
                            }
                            if (val < 0) val = 0;
                            updateReduction(cat.id, val);
                          }}
                          placeholder={activeTarget.toString()}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] pointer-events-none">次</span>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setSelectedStudentIds([]);
                  setImportedData([]);
                  setImportFailures([]);
                  setHasImported(false);
                  setReason("");
                }}
                className="flex-1 bg-white border border-gray-200 text-gray-600 rounded-xl py-3 text-[14px] font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                取消
              </button>
              <button
                onClick={handleAddClick}
                className="flex-[2] bg-[#1677ff] hover:bg-blue-600 text-white rounded-xl py-3 text-[14px] font-bold transition-colors shadow-sm shadow-blue-200"
              >
                确认保存并添加
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reducedPersonnel.length === 0 ? (
              <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-100 border-dashed">
                <div className="w-12 h-12 rounded-full bg-gray-50 mx-auto mb-3 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-300" />
                </div>
                暂无配置减免人员，点击上方按钮新增
              </div>
            ) : (
              reducedPersonnel.map((p) => {
                const student = DUMMY_STUDENTS.find((s) => s.id === p.studentId);
                const hasReductions = Object.entries(p.reductions || {}).some(([catId, val]) => {
                  const cat = categories.find(c => c.id === catId);
                  if (!cat) return false;
                  const activeTarget = cat.monthlyRules?.[format(new Date(), "yyyy-MM")] ?? cat.targetCompletions;
                  return val !== undefined && (val as number) < activeTarget;
                });
                
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex flex-col mb-2">
                        <div className="font-bold text-[16px] text-gray-800 flex items-baseline gap-2">
                          {student?.name || "未知学生"}
                          <span className="text-[13px] font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {student?.className}
                          </span>
                        </div>
                      </div>
                      
                      {hasReductions && (
                        <div className="mt-3 flex flex-wrap gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {Object.entries(p.reductions).filter(([catId, val]) => {
                            const cat = categories.find(c => c.id === catId);
                            if (!cat) return false;
                            const activeTarget = cat.monthlyRules?.[format(new Date(), "yyyy-MM")] ?? cat.targetCompletions;
                            return val !== undefined && (val as number) < activeTarget;
                          }).map(([catId, count]) => {
                            const cat = categories.find(c => c.id === catId);
                            return (
                              <div key={catId} className="bg-white border border-gray-200 px-2 py-1 rounded text-[12px] font-medium text-gray-700 shadow-sm flex items-center gap-1.5">
                                <span className="text-blue-500">{cat?.name}</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-orange-500">新目标 {count}次</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {p.reason && (
                        <div className="text-[13px] text-gray-500 mt-3 flex items-center gap-1.5 before:content-[''] before:w-1 before:h-1 before:bg-gray-300 before:rounded-full">
                          <span className="font-medium text-gray-600">原因:</span> {p.reason}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeReducedPersonnel(p.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full ml-3 transition-colors shrink-0 mt-0.5"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <StudentSelectorModal
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        students={DUMMY_STUDENTS}
        selectedIds={selectedStudentIds}
        disabledIds={reducedPersonnel.map((p) => p.studentId)}
        onConfirm={(ids) => {
          setSelectedStudentIds(ids);
          setIsSelectorOpen(false);
        }}
      />

      <ConfirmModal
        isOpen={showConfirm}
        title="确认添加"
        message={`确定要将选中的名单添加为减免打卡人员，并保存相关配置吗？`}
        onConfirm={handleAdd}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
