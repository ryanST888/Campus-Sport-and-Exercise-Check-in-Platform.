import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Student } from "../../store";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  disabledIds?: string[];
}

export function StudentSelectorModal({
  isOpen,
  onClose,
  students,
  selectedIds,
  onConfirm,
  disabledIds = [],
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelected, setTempSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedIds);
      setSearchTerm("");
    }
  }, [isOpen, selectedIds]);

  if (!isOpen) return null;

  const filtered = students.filter(
    (s) => s.name.includes(searchTerm) || s.className.includes(searchTerm)
  );

  const toggle = (id: string) => {
    setTempSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-[16px] font-bold text-gray-800">选择人员</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-500 hover:bg-gray-100 flex items-center justify-center rounded-full"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-3 bg-white border-b border-gray-100">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] bg-gray-50 focus:bg-white transition-colors"
            placeholder="搜索姓名或班级..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        <div className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-gray-400">
              无匹配学生
            </div>
          ) : (
            filtered.map((s) => {
              const isDisabled = disabledIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-center p-4 cursor-pointer ${isDisabled ? "opacity-50" : "hover:bg-gray-50"}`}
                >
                  <input
                    type="checkbox"
                    disabled={isDisabled}
                    className="w-5 h-5 text-[#1677ff] rounded border-gray-300 focus:ring-[#1677ff]"
                    checked={tempSelected.includes(s.id) || isDisabled}
                    onChange={() => toggle(s.id)}
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <span className="text-[15px] text-gray-800 font-medium">
                        {s.name}
                      </span>
                      {isDisabled && (
                        <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          已添加
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-gray-500 mt-0.5">
                      {s.className}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4 pb-8 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => onConfirm(tempSelected)}
          className="w-full bg-[#1677ff] text-white rounded-xl py-3 text-[15px] font-bold flex items-center justify-center gap-2"
        >
          确定选择 ({tempSelected.length} 人)
        </button>
      </div>
    </div>
  );
}
