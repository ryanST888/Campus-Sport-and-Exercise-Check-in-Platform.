import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Header } from "../../components/ui/Header";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { useAppStore, DUMMY_STUDENTS } from "../../store";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Info,
  AlertCircle,
  X,
  Search,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { StudentSelectorModal } from "../../components/ui/StudentSelectorModal";

const RECENT_REASONS_KEY = "recent_exempt_reasons";

export function ExemptPersonnelList() {
  const { exemptPersonnel, addExemptPersonnel, removeExemptPersonnel } =
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

  const [reason, setReason] = useState("");
  const [recentReasons, setRecentReasons] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_REASONS_KEY);
      if (stored) {
        setRecentReasons(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

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
    XLSX.writeFile(workbook, "免打卡人员导入模板.xlsx");
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
        const failures: { name: string; className: string; error: string }[] =
          [];

        data.forEach((row, index) => {
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
    if (addMode === "manual" && selectedStudentIds.length === 0) {
      toast.error("请至少选择一个学生");
      return;
    }
    if (addMode === "import" && importedData.length === 0) {
      toast.error("请先导入有效的学生名单");
      return;
    }
    setShowConfirm(true);
  };

  const handleAdd = () => {

    let addedCount = 0;
    
    if (addMode === "manual") {
      selectedStudentIds.forEach((studentId) => {
        if (!exemptPersonnel.some((p) => p.studentId === studentId)) {
          addExemptPersonnel({
            studentId,
            reason,
          });
          addedCount++;
        }
      });
    } else {
      importedData.forEach((data) => {
        if (!exemptPersonnel.some((p) => p.studentId === data.id)) {
          addExemptPersonnel({
            studentId: data.id,
            reason: data.reason,
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
      <Header title="免打卡人员配置" showBack={true} />

      <div className="p-4 flex flex-col gap-4">
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full bg-white border border-gray-200 text-[#1677ff] rounded-xl py-3 flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            新增免打卡人员
          </button>
        )}
        
        {isAdding ? (
          <div className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col gap-4">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                className={`flex-1 py-2 text-[14px] font-medium text-center ${addMode === "manual" ? "bg-[#1677ff] text-white" : "bg-gray-50 text-gray-500"}`}
                onClick={() => setAddMode("manual")}
              >
                手动选择
              </button>
              <button
                className={`flex-1 py-2 text-[14px] font-medium text-center ${addMode === "import" ? "bg-[#1677ff] text-white" : "bg-gray-50 text-gray-500"}`}
                onClick={() => setAddMode("import")}
              >
                批量导入
              </button>
            </div>

            {addMode === "manual" && (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] text-gray-500 block">选择学生</label>
                <div 
                  onClick={() => setIsSelectorOpen(true)}
                  className="flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50 p-3 hover:bg-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-[14px] text-gray-800">
                    <Users className="w-4 h-4 text-[#1677ff]" />
                    <span className="font-medium">
                      {selectedStudentIds.length > 0 ? `已选择 ${selectedStudentIds.length} 人` : "点击选择学生"}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#1677ff] bg-blue-50 px-2 py-1 rounded">
                    {selectedStudentIds.length > 0 ? "重新选择" : "去选择"}
                  </div>
                </div>
              </div>
            )}

            {addMode === "import" && (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-[13px] text-blue-800 leading-relaxed">
                    导入指引：
                    <ol className="list-decimal pl-4 mt-1 space-y-1">
                      <li>点击下方按钮导出包含表头的模板文件。</li>
                      <li>在模板中填写学生的姓名和班级，并保存。</li>
                      <li>上传填写好的 Excel 文件。</li>
                    </ol>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center justify-center gap-2 border border-blue-200 bg-white text-[#1677ff] py-2.5 rounded-lg text-[13px] font-medium hover:bg-blue-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    1. 导出模板
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 border border-[#1677ff] bg-[#1677ff] text-white py-2.5 rounded-lg text-[13px] font-medium hover:bg-blue-600 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    2. 上传名单
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
                  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-[13px] font-bold text-gray-800">
                        导入结果
                      </div>
                      {importFailures.length > 0 && (
                        <div className="text-[12px] text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          存在 {importFailures.length} 条失败数据
                        </div>
                      )}
                    </div>

                    <div className="text-[13px] text-gray-600">
                      成功识别此名单中的有效学生数：
                      <span className="font-bold text-green-600">
                        {importedData.length}
                      </span>{" "}
                      人。
                    </div>

                    {importFailures.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-[12px] text-gray-500 mb-1.5">
                          失败明细：
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1.5">
                          {importFailures.map((fail, idx) => (
                            <div
                              key={idx}
                              className="flex text-[12px] bg-white border border-red-100 p-1.5 rounded text-red-600 items-start gap-1"
                            >
                              <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                {fail.name}{" "}
                                {fail.className ? `(${fail.className})` : ""} -{" "}
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
              <div>
                <label className="text-[13px] text-gray-500 mb-1 block">
                  免打卡原因 (选填)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg p-2 text-[14px]"
                    placeholder="例如：特长生、身体原因等"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  {recentReasons.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {recentReasons.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => setReason(r)}
                          className="text-[12px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setSelectedStudentIds([]);
                  setImportedData([]);
                  setImportFailures([]);
                  setHasImported(false);
                }}
                className="flex-1 bg-gray-100 text-gray-600 rounded-lg py-2 text-[14px] font-medium"
              >
                取消
              </button>
              <button
                onClick={handleAddClick}
                className="flex-1 bg-[#1677ff] text-white rounded-lg py-2 text-[14px] font-medium"
              >
                确定添加
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {exemptPersonnel.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                暂无配置免打卡人员
              </div>
            ) : (
              exemptPersonnel.map((p) => {
                const student = DUMMY_STUDENTS.find((s) => s.id === p.studentId);
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-[15px] text-gray-800">
                        {student?.name || "未知学生"}{" "}
                        <span className="text-[13px] font-normal text-gray-400 ml-1">
                          ({student?.className})
                        </span>
                      </div>
                      {p.reason && (
                        <div className="text-[13px] text-gray-500 mt-1">
                          原因: {p.reason}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeExemptPersonnel(p.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full"
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
        disabledIds={exemptPersonnel.map((p) => p.studentId)}
        onConfirm={(ids) => {
          setSelectedStudentIds(ids);
          setIsSelectorOpen(false);
        }}
      />

      <ConfirmModal
        isOpen={showConfirm}
        title="确认添加"
        message={`确定要将选中的名单添加为免打卡人员？`}
        onConfirm={handleAdd}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
