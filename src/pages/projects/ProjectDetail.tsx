import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore, DUMMY_STUDENTS } from '../../store';
import { Header } from '../../components/ui/Header';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { MoreVertical, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import toast from 'react-hot-toast';

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, records, invalidateRecord, updateRecord } = useAppStore();
  const project = projects.find(p => p.id === id);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showProjectInfoModal, setShowProjectInfoModal] = useState(false);
  const [recordToInvalidate, setRecordToInvalidate] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');

  const getStudent = (studentId: string) => DUMMY_STUDENTS.find(s => s.id === studentId);

  const projectRecords = records.filter(r => r.projectId === id && !r.isInvalid && r.isPassed);
  const thisWeekRecords = projectRecords.filter(r => new Date(r.datetime).getTime() > Date.now() - 7 * 24 * 3600 * 1000);
  const thisMonthRecords = projectRecords.filter(r => new Date(r.datetime).getTime() > Date.now() - 30 * 24 * 3600 * 1000);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const todayRecordsRaw = projectRecords.filter(r => r.date === dateStr);
  const todayRecords = todayRecordsRaw.filter(r => {
    const s = getStudent(r.studentId);
    return s ? s.name.includes(searchQuery) : r.studentId.includes(searchQuery);
  });
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const getIndicatorText = (p: any) => {
    switch (p.indicatorType) {
      case 'count': return `${p.requiredValue}个`;
      case 'time': return `${Math.floor(p.requiredValue / 60)}分${p.requiredValue % 60}秒`;
      case 'distance': return `${p.requiredValue}米`;
      default: return '';
    }
  };

  const getPeriodText = (p: any) => {
    switch (p.limitPeriod) {
      case 'weekly': return '每周';
      case 'monthly': return '每月';
      case 'custom': return `${p.customDays}天内`;
      default: return '不限制';
    }
  };

  const handleExport = () => {
    toast.success('导出成功，文件已保存至手机');
    setShowMenu(false);
  };

  const handleInvalidate = (recordId: string) => {
    setRecordToInvalidate(recordId);
  };

  const confirmInvalidate = () => {
    if (recordToInvalidate) {
      invalidateRecord(recordToInvalidate);
      setSelectedRecord(null);
      toast.success('记录已作废');
      setRecordToInvalidate(null);
    }
  };

  const handleEdit = (record: any) => {
    setEditValue(record.achievedValue.toString());
    setEditTime(record.durationSeconds.toString());
    setEditingRecord(record);
    setSelectedRecord(null);
  };

  const handleSaveEdit = () => {
    const val = Number(editValue);
    const time = Number(editTime);
    if (isNaN(val) || val < 0) {
      toast.error('请输入有效成绩');
      return;
    }
    if (isNaN(time) || time < 0) {
      toast.error('请输入有效时间');
      return;
    }
    updateRecord(editingRecord.id, { achievedValue: val, durationSeconds: time });
    toast.success('记录已更新');
    setEditingRecord(null);
  };

  if (!project) return <div>Project not found</div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
      <Header 
        title={project.name} 
        showBack 
        rightNode={
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 -mr-2">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 w-40 bg-white rounded-lg shadow-xl z-50 overflow-hidden border border-gray-100 flex flex-col">
                  <button onClick={handleExport} className="px-4 py-3 text-left hover:bg-gray-50 text-sm font-medium text-[#1677ff]">导出所有记录</button>
                </div>
              </>
            )}
          </div>
        }
      />
      
      <div className="p-3 flex flex-col gap-3 pb-20">
        {/* Combined Info Card */}
        <div 
          onClick={() => setShowProjectInfoModal(true)}
          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-1 flex justify-between items-center active:bg-gray-50 transition-colors"
        >
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-gray-900 text-[15px]">项目信息</span>
            <span className="text-[13px] text-gray-500">
              包含指标 {project.indicators?.length || 0} 项 · 
              周期 {project.limitPeriod === 'weekly' ? '每周' : project.limitPeriod === 'monthly' ? '每月' : '无'} · 
              周期目标 {project.targetCompletionsPerPeriod !== undefined ? `${project.targetCompletionsPerPeriod} 次` : '不限'} | 每日上限 {project.maxCompletionsPerDay !== undefined ? project.maxCompletionsPerDay + '次' : '无限制'}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center text-center">
          <div className="flex flex-col flex-1 border-r border-gray-100">
            <span className="text-xl font-bold text-[#1677ff]">{thisWeekRecords.length}</span>
            <span className="text-[10px] text-gray-400 mt-1">本周完成</span>
          </div>
          <div className="flex flex-col flex-1 border-r border-gray-100">
            <span className="text-xl font-bold text-[#1677ff]">{thisMonthRecords.length}</span>
            <span className="text-[10px] text-gray-400 mt-1">本月完成</span>
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-xl font-bold text-[#1677ff]">{projectRecords.length}</span>
            <span className="text-[10px] text-gray-400 mt-1">总完成</span>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center justify-between">
          <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-1 text-gray-400 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-[15px]">{dateStr}</span>
          <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1 text-gray-400 hover:text-gray-900">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className={`px-3 py-1 rounded text-xs font-medium ml-2 ${dateStr === todayStr ? 'bg-[#1677ff] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            今日
          </button>
        </div>

        {/* Records List */}
        <div className="flex flex-col gap-2">
          {todayRecords.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400 bg-white rounded-xl border border-gray-100">
              该日期暂无登记记录
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center px-1 mb-2">
                <div className="text-xs text-gray-500 font-medium flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1677ff] mr-2"></span>
                  {dateStr} (共{todayRecordsRaw.length}人)
                </div>
                <div className="flex items-center bg-white rounded-full px-2 py-1 w-[120px] shadow-sm border border-gray-100">
                  <Search className="w-3 h-3 text-gray-400 mr-1 shrink-0" />
                  <input
                    type="text"
                    placeholder="搜索姓名"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-[12px] w-full text-gray-700 placeholder:text-gray-400 min-w-0"
                  />
                </div>
              </div>
              {todayRecords.length === 0 && searchQuery ? (
                <div className="text-center py-6 text-sm text-gray-400 bg-white rounded-xl border border-gray-100">
                  未找到相关人员
                </div>
              ) : (
                todayRecords.map(record => {
                  const s = getStudent(record.studentId);
                  const sName = s ? s.name : record.studentId;
                  return (
                  <div 
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-900">{sName}</span>
                      {project.mode === 'register' ? (
                         <span className="text-sm font-mono font-bold text-[#1677ff]">{record.achievedValue} 次/个</span>
                      ) : (
                         <span className="text-sm font-mono text-gray-500">用时: {Math.floor(record.durationSeconds/60)}分{record.durationSeconds%60}秒</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>登记时间: {format(new Date(record.datetime), 'HH:mm:ss')}</span>
                      {project.mode === 'timer' && (
                        <span className="text-[#1677ff] font-medium">{record.achievedValue}</span>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {selectedRecord && (() => {
        const s = getStudent(selectedRecord.studentId);
        return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg">登记详情</h3>
              <button onClick={() => setSelectedRecord(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 text-sm">
              {s && (
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                  <div className="w-10 h-10 bg-[#1677ff]/10 text-[#1677ff] rounded-full flex items-center justify-center font-bold text-lg">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.grade}{s.className}</div>
                  </div>
                </div>
              )}
              <div className="flex"><span className="w-20 text-gray-400">登记人:</span> <span className="font-medium">{s ? `${s.name}（${s.grade}${s.className}）` : '未知'}</span></div>
              <div className="flex"><span className="w-20 text-gray-400">学号:</span> <span className="font-medium font-mono">{selectedRecord.studentId}</span></div>
              <div className="flex"><span className="w-20 text-gray-400">项目:</span> <span className="font-medium">{project.name} ({project.mode === 'register' ? '登记' : '计时'}模式)</span></div>
              <div className="flex"><span className="w-20 text-gray-400">时间:</span> <span className="font-medium font-mono">{format(new Date(selectedRecord.datetime), 'yyyy-MM-dd HH:mm:ss')}</span></div>
              {project.mode === 'timer' && <div className="flex"><span className="w-20 text-gray-400">用时:</span> <span className="font-medium font-mono">{selectedRecord.durationSeconds}秒</span></div>}
              <div className="flex"><span className="w-20 text-gray-400">成绩:</span> <span className="font-medium">{selectedRecord.achievedValue}</span></div>
              <div className="flex"><span className="w-20 text-gray-400">状态:</span> {selectedRecord.isPassed ? (selectedRecord.isChallenge ? <span className="font-bold text-[#d48806]">挑战完成 ✨</span> : <span className="font-bold text-[#52c41a]">完成 ✅</span>) : <span className="font-bold text-gray-500">取消</span>}</div>
              {selectedRecord.isChallenge && <div className="flex"><span className="w-20 text-gray-400">总次数:</span> <span className="font-medium">+{selectedRecord.totalTimes || 1}次 (含奖励)</span></div>}
            </div>

            <div className="p-4 bg-gray-50 flex gap-2">
              <button onClick={() => setSelectedRecord(null)} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium">关闭</button>
            </div>
          </div>
        </div>
      );
      })()}

      {/* Project Info Bottom Sheet Modal */}
      {showProjectInfoModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowProjectInfoModal(false)} />
          <div className="bg-white rounded-t-2xl w-full max-h-[85vh] overflow-y-auto relative animate-in slide-in-from-bottom-2">
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-[17px]">项目详细信息</h3>
              <button onClick={() => setShowProjectInfoModal(false)} className="p-1 active:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-5">
              <div>
                <h4 className="text-[13px] font-bold text-gray-400 mb-2">基本设置</h4>
                <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-gray-600">限制周期</span>
                    <span className="text-[14px] font-medium text-gray-900">{project.limitPeriod === 'weekly' ? '每周' : project.limitPeriod === 'monthly' ? '每月' : '不限制'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-gray-600">周期内限次</span>
                    <span className="text-[14px] font-medium text-gray-900">{project.targetCompletionsPerPeriod}次</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[13px] font-bold text-gray-400 mb-2">项目指标 ({project.indicators?.length || 0})</h4>
                <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2.5">
                  {project.indicators?.map(ind => (
                    <div key={ind.id} className="flex justify-between items-center border-b border-gray-200 pb-2.5 last:border-0 last:pb-0">
                      <span className="text-[14px] text-gray-600">
                        {ind.type === 'count' ? '次数' : ind.type === 'time' ? '计时' : ind.type === 'distance' ? '距离' : '其他'}
                      </span>
                      <span className="font-bold text-gray-900">{ind.reqValue} {ind.unit}</span>
                    </div>
                  ))}
                  {(!project.indicators || project.indicators.length === 0) && (
                    <div className="text-[14px] text-gray-400 text-center py-2">暂无指标</div>
                  )}
                </div>
              </div>

              {project.allowChallenge && (
                <div>
                  <h4 className="text-[13px] font-bold text-orange-400 mb-2">挑战设置</h4>
                  <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center border-b border-orange-100 pb-2.5">
                      <span className="text-[14px] text-gray-600">挑战奖励次数</span>
                      <span className="font-bold text-orange-500">+{project.challengeRewardTimes} 次</span>
                    </div>
                    {project.challengeIndicators?.map(ind => (
                      <div key={ind.id} className="flex justify-between items-center border-b border-orange-100 pb-2.5 last:border-0 last:pb-0">
                        <span className="text-[14px] text-gray-600">
                          {ind.type === 'count' ? '次数' : ind.type === 'time' ? '计时' : ind.type === 'distance' ? '距离' : '其他'} (挑战)
                        </span>
                        <span className="font-bold text-orange-600">{ind.reqValue} {ind.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!recordToInvalidate}
        title="确定作废该记录？"
        message="作废后该记录将不再计入统计和周期次数。"
        onConfirm={confirmInvalidate}
        onCancel={() => {
          // Restore selected item if cancelled?
          setRecordToInvalidate(null);
        }}
      />

      {editingRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditingRecord(null)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative flex flex-col items-center animate-in fade-in zoom-in-95">
            <button onClick={() => setEditingRecord(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">修改记录</h3>
            <p className="text-sm text-gray-500 mb-5 text-center">
              为 {getStudent(editingRecord.studentId)?.name || editingRecord.studentId} 修改该次记录
            </p>
            
            <div className="w-full mb-5 flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block text-center">成绩 ({project?.indicators?.[0]?.unit || '个'})</label>
                <input 
                  type="number" 
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl py-2.5 outline-none focus:border-[#1677ff] focus:bg-blue-50/50 transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block text-center">耗时 (秒)</label>
                <input 
                  type="number" 
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl py-2.5 outline-none focus:border-[#1677ff] focus:bg-blue-50/50 transition-colors"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveEdit}
              className="w-full py-3.5 bg-[#1677ff] text-white rounded-xl font-medium active:bg-[#0958d9] shadow-sm transition-colors text-[16px]"
            >
              保存修改
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
