import { useState, MouseEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/ui/Header';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAppStore, DUMMY_STUDENTS } from '../../store';
import { Camera, Trash2, CheckCircle2, Loader2, Search, X, Edit2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function RegisterList({ projectId, onGoToCamera }: { projectId: string, onGoToCamera: () => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [showEndModal, setShowEndModal] = useState(false);
  const { projects, clearWaitingTasks, waitingTasks } = useAppStore();
  const project = projects.find(p => p.id === projectId);

  const confirmEndRegistration = () => {
    clearWaitingTasks();
    toast.success('本次登记已结束');
    navigate('/');
  };

  const handleBack = () => {
    if (waitingTasks.length > 0) {
      setShowEndModal(true);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] overflow-hidden">
      <Header 
        title={project?.name || "项目登记"} 
        showBack 
        onBack={handleBack}
        bg="bg-white"
      />

      {/* Tabs */}
      <div className="bg-white flex items-center border-b border-gray-100 shadow-sm z-30 flex-shrink-0 relative">
        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'pending' ? 'text-[#1677ff]' : 'text-gray-500'}`}>
          待登记
          {activeTab === 'pending' && <div className="absolute bottom-0 left-[30%] right-[30%] h-0.5 bg-[#1677ff] rounded-t" />}
        </button>
        <button onClick={() => setActiveTab('completed')} className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'completed' ? 'text-[#1677ff]' : 'text-gray-500'}`}>
          已登记记录
          {activeTab === 'completed' && <div className="absolute bottom-0 left-[30%] right-[30%] h-0.5 bg-[#1677ff] rounded-t" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className={cn("absolute inset-0 flex flex-col transition-transform duration-300", activeTab === 'pending' ? "translate-x-0" : "-translate-x-full")}>
           <PendingTab projectId={projectId} onGoToCamera={onGoToCamera} />
        </div>
        <div className={cn("absolute inset-0 flex flex-col transition-transform duration-300 z-10 bg-[#f0f2f5]", activeTab === 'completed' ? "translate-x-0" : "translate-x-full")}>
           <CompletedTab projectId={projectId} />
        </div>
      </div>

      <ConfirmModal
        isOpen={showEndModal}
        title="退出登记？"
        message="将清空当前未提交的识别记录对象，已登记的成绩会被保存。确认退出吗？"
        onConfirm={confirmEndRegistration}
        onCancel={() => setShowEndModal(false)}
      />
    </div>
  );
}

function PendingTab({ projectId, onGoToCamera }: { projectId: string, onGoToCamera: () => void }) {
  const { waitingTasks, removePhotoTask, projects, clearFailedTasks, clearWaitingTasks, addRecord } = useAppStore();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const prevSuccessIdsRef = useRef(new Set<string>());
  const [showClearListModal, setShowClearListModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreValue, setScoreValue] = useState<string>('');
  const [timeValue, setTimeValue] = useState<string>('');
  const [isChallengeChecked, setIsChallengeChecked] = useState(false);
  const [rewardTimesInput, setRewardTimesInput] = useState<string>('0');

  useEffect(() => {
    const idsToSelect: string[] = [];
    waitingTasks.forEach(t => {
      if (t.status === 'success' && !prevSuccessIdsRef.current.has(t.taskId)) {
        idsToSelect.push(t.taskId);
        prevSuccessIdsRef.current.add(t.taskId);
      }
    });
    if (idsToSelect.length > 0) {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        idsToSelect.forEach(id => next.add(id));
        return Array.from(next);
      });
    }
  }, [waitingTasks]);

  const project = projects.find(p => p.id === projectId);
  const indicator = project?.indicators?.[0]; // Assuming first indicator is the target

  const handleSelectTask = (taskId: string, status: string) => {
    if (status !== 'success') return;
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
    } else {
      setSelectedTaskIds(prev => [...prev, taskId]);
    }
  };

  const handleSelectAll = () => {
    const selectableTasks = waitingTasks.filter(t => t.status === 'success');
    if (selectedTaskIds.length === selectableTasks.length && selectableTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(selectableTasks.map(t => t.taskId));
    }
  };

  const handleDeleteTask = (taskId: string, e: MouseEvent) => {
    e.stopPropagation();
    removePhotoTask(taskId);
    setSelectedTaskIds(prev => prev.filter(id => id !== taskId));
  };

  const openScoreModal = () => {
    if (selectedTaskIds.length === 0) return;
    setScoreValue(indicator?.reqValue?.toString() || '0');
    setTimeValue('0');
    setIsChallengeChecked(false);
    setRewardTimesInput(project?.challengeRewardTimes?.toString() || '0');
    setShowScoreModal(true);
  };

  const handleSubmitScore = () => {
    const val = Number(scoreValue);
    const timeVal = Number(timeValue);
    if (isNaN(val) || val <= 0) {
      toast.error('请输入有效成绩');
      return;
    }
    if (isNaN(timeVal) || timeVal < 0) {
      toast.error('请输入有效时间');
      return;
    }

    const tasksToSubmit = waitingTasks.filter(t => selectedTaskIds.includes(t.taskId));
    const nowStr = format(new Date(), 'yyyy-MM-dd');
    const nowIso = new Date().toISOString();

    let actualChallengeChecked = isChallengeChecked;
    let rewardTimes = 0;
    
    // Check challenge condition
    if (actualChallengeChecked && project?.allowChallenge) {
      rewardTimes = Number(rewardTimesInput) || 0;
    }

    const totalTimesGained = 1 + rewardTimes;

    tasksToSubmit.forEach(t => {
      if (!t.student) return;
      addRecord({
        projectId,
        studentId: t.student.id,
        date: nowStr,
        datetime: nowIso,
        durationSeconds: timeVal,
        achievedValue: val,
        isPassed: val >= (indicator?.reqValue || 0),
        isChallenge: actualChallengeChecked,
        rewardTimes: rewardTimes,
        totalTimes: totalTimesGained
      });
      removePhotoTask(t.taskId);
    });

    toast.success(`已成功登记 ${tasksToSubmit.length} 人的成绩`);
    setSelectedTaskIds([]);
    setShowScoreModal(false);
  };

  // Stats
  const countSuccess = waitingTasks.filter(t => t.status === 'success' || t.status === 'times_full').length;
  const countFailed = waitingTasks.filter(t => t.status === 'failed').length;
  const countRecognizing = waitingTasks.filter(t => t.status === 'recognizing').length;
  const selectableTasks = waitingTasks.filter(t => t.status === 'success');

  return (
    <>
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 shadow-sm z-20 flex-shrink-0">
        <div className="flex gap-1 items-baseline">
          <span className="text-sm font-medium text-gray-800">
            识别统计
          </span>
          <span className="text-sm text-gray-500 ml-1">
            (成功: <span className="text-[#1677ff] font-medium inline-block min-w-[12px] text-center">{countSuccess}</span>人<span className="mx-1">失败:</span><span className="text-red-500 font-medium inline-block min-w-[12px] text-center">{countFailed}</span>人)
          </span>
          {countRecognizing > 0 && (
            <span className="text-sm text-amber-500 ml-1">
              (识别中: {countRecognizing}人)
            </span>
          )}
        </div>
        {countFailed > 0 ? (
          <button 
            onClick={() => clearFailedTasks()}
            className="text-xs text-red-500 hover:text-red-600 active:opacity-70 font-medium bg-red-50 px-2 py-1 rounded"
          >
            清空失败
          </button>
        ) : waitingTasks.length > 0 ? (
          <button 
            onClick={() => setShowClearListModal(true)}
            className="text-xs text-gray-500 hover:text-gray-600 active:opacity-70 font-medium bg-gray-100 px-2 py-1 rounded"
          >
            清空列表
          </button>
        ) : null}
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {waitingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Camera className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">暂无待登记记录，请点击左下角添加</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-20">
            {waitingTasks.map(task => {
              const isSelectable = task.status === 'success';
              const isSelected = selectedTaskIds.includes(task.taskId);
              const isTimesFull = task.status === 'times_full';
              const isFailed = task.status === 'failed';
              const isRecognizing = task.status === 'recognizing';

              return (
                <div 
                  key={task.taskId}
                  onClick={() => handleSelectTask(task.taskId, task.status)}
                  className={cn(
                    "bg-white rounded-xl p-2.5 flex items-center gap-2.5 border transition-colors relative min-h-[64px]",
                    isSelectable && !isSelected ? "border-gray-100 active:bg-gray-50" : "",
                    isSelected ? "border-[#1677ff] bg-[#e6f4ff]" : "",
                    (isTimesFull || isFailed || isRecognizing) ? "bg-gray-50 border-gray-100 grayscale-[0.3] opacity-80" : ""
                  )}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                    <Camera className="w-4 h-4 text-gray-400" />
                    {isRecognizing && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
                    {isRecognizing && <div className="text-xs font-medium tracking-wide text-[#1677ff]">识别中...</div>}
                    
                    {isFailed && <div className="text-xs font-medium text-red-500">识别失败</div>}
                    
                    {(task.student && (task.status === 'success' || task.status === 'times_full')) && (
                      <>
                        <div className="flex flex-col mb-0.5">
                          <span className={cn("font-bold text-sm truncate", isTimesFull ? "text-gray-500" : "text-gray-900")}>
                            {task.student.name}
                          </span>
                          <span className={cn("text-[10px]", isTimesFull ? "text-gray-400" : "text-gray-500")}>
                            {task.student.grade}{task.student.className}
                          </span>
                        </div>
                        {isTimesFull ? (
                          <div className="text-[10px] font-bold text-red-500 mt-0.5 flex items-center">
                            次数已满 (本月已完成 {task.completedTimes}次)
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {task.remainingTimes !== undefined ? <span>剩<span className="text-[#1677ff] font-medium mx-[1px]">{task.remainingTimes}</span>次</span> : <span>本月已完成 {task.completedTimes}次</span>}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {isSelectable && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex-shrink-0">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isSelectable}
                        readOnly
                        className="w-4 h-4 rounded border-gray-300 text-[#1677ff] focus:ring-[#1677ff] disabled:opacity-30"
                      />
                    </div>
                  )}

                  <button 
                    onClick={(e) => handleDeleteTask(task.taskId, e)}
                    className="absolute top-1.5 right-1.5 p-1 flex-shrink-0 text-gray-300 hover:text-red-500 active:bg-gray-100 rounded-full"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 pb-6 flex items-center shadow-[0_-2px_10px_rgba(0,0,0,0.02)] gap-4">
        <button 
          onClick={onGoToCamera}
          className="flex flex-col items-center justify-center text-[#1f2937] w-12 shrink-0 active:opacity-70 transition-opacity"
        >
          <Camera className="w-[22px] h-[22px] mb-1" />
          <span className="text-[10px] whitespace-nowrap">拍照录入</span>
        </button>

        <button 
          onClick={handleSelectAll}
          className="flex flex-col items-center justify-center text-[#9ca3af] w-12 shrink-0 active:opacity-70 transition-opacity"
        >
           <CheckCircle2 className={cn("w-[22px] h-[22px] mb-1", selectedTaskIds.length === selectableTasks.length && selectableTasks.length > 0 ? "text-[#1677ff]" : "")} />
           <span className="text-[10px] whitespace-nowrap">{selectedTaskIds.length === selectableTasks.length && selectableTasks.length > 0 ? '取消全选' : '全选'}</span>
        </button>

        <button 
          onClick={openScoreModal}
          disabled={selectedTaskIds.length === 0}
          className={cn(
              "flex-1 h-[44px] rounded-full font-medium text-[15px] transition-all ml-2",
              selectedTaskIds.length > 0
              ? "bg-[#1677ff] text-white active:bg-[#0958d9] shadow-md hover:shadow-lg"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          提交登记 {selectedTaskIds.length > 0 ? `(${selectedTaskIds.length})` : ''}
        </button>
      </div>

      {showScoreModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowScoreModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative flex flex-col items-center animate-in fade-in zoom-in-95">
            <button onClick={() => setShowScoreModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedTaskIds.length === 1 ? '完成登记确认' : '批量输入成绩'}</h3>
            {selectedTaskIds.length === 1 ? (() => {
              const task = waitingTasks.find(t => t.taskId === selectedTaskIds[0]);
              return (
                <div className="text-sm text-gray-500 mb-4 flex flex-col items-center">
                  <div>学生：{task?.student?.name} 学号：{task?.student?.id}</div>
                </div>
              );
            })() : (
              <p className="text-sm text-gray-500 mb-5">
                为选中的 {selectedTaskIds.length} 名学生登记成绩
              </p>
            )}

            {project?.allowChallenge && (
              <div className="w-full border-y border-gray-100 py-3 mb-4 flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={isChallengeChecked}
                    onChange={(e) => setIsChallengeChecked(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#1677ff] focus:ring-[#1677ff]"
                  />
                  <span className="text-sm font-medium text-gray-800">本次为挑战成功</span>
                </label>
                {isChallengeChecked && (
                  <div className="flex items-center justify-between bg-orange-50 rounded-lg px-3 py-2 border border-orange-100/50">
                    <span className="text-sm text-orange-600 font-medium">额外奖励次数</span>
                    <div className="flex items-center gap-1 bg-white border border-orange-200 rounded-md px-2 py-1">
                      <input
                        type="number"
                        min="0"
                        value={rewardTimesInput}
                        onChange={(e) => setRewardTimesInput(e.target.value)}
                        className="w-12 text-center text-sm text-orange-600 font-bold bg-transparent outline-none"
                      />
                      <span className="text-sm text-orange-500">次</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="w-full mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block text-center">成绩 ({indicator?.unit || '个'})</label>
              <input 
                type="number" 
                value={scoreValue}
                onChange={(e) => setScoreValue(e.target.value)}
                className="w-full text-center text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl py-3 outline-none focus:border-[#1677ff] focus:bg-blue-50/50 transition-colors"
                autoFocus
              />
            </div>
            <div className="w-full text-center mb-5 mt-[-10px] text-xs text-gray-400">
              {isChallengeChecked && project?.allowChallenge && project?.challengeIndicators?.[0] ? (
                `挑战指标要求: ${project.challengeIndicators[0].reqValue} ${project.challengeIndicators[0].unit}`
              ) : (
                `默认指标要求: ${indicator?.reqValue} ${indicator?.unit}`
              )}
            </div>
            
            <div className="w-full bg-gray-50 rounded-lg p-3 mb-5 text-center flex flex-col gap-1 border border-gray-100">
              <span className="text-sm text-gray-700">本次获得：总次数 +{isChallengeChecked ? 1 + (Number(rewardTimesInput) || 0) : 1}</span>
              {selectedTaskIds.length === 1 && (() => {
                 const t = waitingTasks.find(tk => tk.taskId === selectedTaskIds[0]);
                 const currentRemaining = t?.remainingTimes;
                 const currentCompleted = t?.completedTimes || 0;
                 const gained = isChallengeChecked ? 1 + (Number(rewardTimesInput) || 0) : 1;
                 const totalCompleted = currentCompleted + gained;
                 
                 if (currentRemaining === undefined || project?.limitPeriod === 'none') {
                   return <span className="text-xs text-gray-500">本次后累计：{totalCompleted}次 | 剩余：不限</span>
                 } else {
                   const newRemaining = Math.max(0, currentRemaining - gained);
                   return <span className="text-xs text-gray-500">本次后累计：{totalCompleted}次 | 剩余：{newRemaining}次</span>
                 }
              })()}
            </div>

            <button 
              onClick={handleSubmitScore}
              className="w-full py-3.5 bg-[#1677ff] text-white rounded-xl font-medium active:bg-[#0958d9] shadow-sm transition-colors text-[16px]"
            >
              确认提交
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showClearListModal}
        title="清空列表"
        message="确定要清空待登记的识别记录吗？正在识别中的记录也将被中断。"
        onConfirm={() => {
          clearWaitingTasks();
          setSelectedTaskIds([]);
          setShowClearListModal(false);
        }}
        onCancel={() => setShowClearListModal(false)}
      />
    </>
  );
}

function CompletedTab({ projectId }: { projectId: string }) {
  const { records, updateRecord, invalidateRecord, projects } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [showInvalidateModal, setShowInvalidateModal] = useState<string | null>(null);
  
  const project = projects.find(p => p.id === projectId);
  const indicator = project?.indicators?.[0];
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const projectRecords = records.filter(r => r.projectId === projectId && !r.isInvalid && r.date === todayStr);

  const getStudentName = (sid: string) => {
    const student = DUMMY_STUDENTS.find(s => s.id === sid);
    return student ? student.name : sid;
  };

  const handleEditRecord = (record: any) => {
    setEditValue(record.achievedValue.toString());
    setEditTime(record.durationSeconds.toString());
    setEditingRecord(record);
  };
  
  const stats = {
    total: projectRecords.length,
    passed: projectRecords.filter(r => r.isPassed).length,
    failed: projectRecords.filter(r => !r.isPassed).length,
    challenge: projectRecords.filter(r => r.isPassed && r.isChallenge).length
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
    toast.success('成绩已更新');
    setEditingRecord(null);
  };

  const confirmInvalidate = () => {
    if (showInvalidateModal) {
      invalidateRecord(showInvalidateModal);
      toast.success('记录已作废');
      setShowInvalidateModal(null);
    }
  };

  const filteredRecords = projectRecords.filter(r => getStudentName(r.studentId).includes(searchQuery));

  return (
    <div className="flex-1 p-3 pb-10 overflow-y-auto flex flex-col gap-3 bg-[#f0f2f5]">
      <div className="flex justify-between items-center px-1 pt-1 gap-2">
        <div className="text-[11px] font-medium text-gray-500 whitespace-nowrap overflow-x-auto no-scrollbar flex-1 flex gap-2">
          <span>今日已登记: <span className="text-[#1677ff]">{stats.total}</span></span>
          <span>完成: <span className="text-green-600">{stats.passed}</span></span>
          {stats.challenge > 0 && <span>挑战: <span className="text-orange-500">{stats.challenge}</span></span>}
        </div>
        <div className="flex items-center bg-white rounded-full px-2.5 py-1.5 w-[110px] shadow-sm border border-gray-100 shrink-0">
          <Search className="w-3 h-3 text-gray-400 mr-1.5 shrink-0" />
          <input
            type="text"
            placeholder="搜索姓名"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-[12px] w-full text-gray-700 placeholder:text-gray-400 min-w-0"
          />
        </div>
      </div>
      
      {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <p>{searchQuery ? '未找到相关人员' : '今日暂无登记记录'}</p>
          </div>
      ) : (
        filteredRecords.map(record => (
          <div 
            key={record.id} 
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative"
          >
            <div className="flex justify-between items-center mb-1 pr-6">
              <span className="font-bold text-gray-900 text-[15px]">{getStudentName(record.studentId)}
                {record.isPassed ? (
                  record.isChallenge ? (
                    <span className="text-[#d48806] text-sm ml-1 font-medium bg-[#fffbe6] px-2 py-0.5 rounded border border-[#ffe58f]">挑战完成 ✨</span>
                  ) : (
                    <span className="text-[#52c41a] text-sm ml-1 font-medium bg-green-50 px-2 py-0.5 rounded border border-green-200">完成 ✅</span>
                  )
                ) : (
                  <span className="text-gray-500 text-sm ml-1 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-200">取消</span>
                )}
              </span>
              <div className="flex flex-col items-end">
                 <div className="flex items-center">
                   <span className="text-lg text-[#1677ff] font-bold mr-1">{record.achievedValue}</span>
                   <span className="text-xs text-gray-500 font-normal">{project?.indicators?.[0]?.unit || '个'}</span>
                 </div>
                 {record.isChallenge && <span className="text-[10px] text-orange-500 mt-[-2px]">奖励+{record.rewardTimes}次</span>}
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
              <span>登记时间: {format(new Date(record.datetime), 'HH:mm:ss')}</span>
              <span className="font-mono">用时: {Math.floor(record.durationSeconds/60)}分{record.durationSeconds%60}秒</span>
            </div>
          </div>
        ))
      )}

      {editingRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditingRecord(null)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative flex flex-col items-center animate-in fade-in zoom-in-95">
            <button onClick={() => setEditingRecord(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">修改记录</h3>
            <p className="text-sm text-gray-500 mb-5">
              为 {getStudentName(editingRecord.studentId)} 修改该次记录
            </p>
            
            <div className="w-full mb-5 flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block text-center">成绩 ({indicator?.unit || '个'})</label>
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

      <ConfirmModal
        isOpen={!!showInvalidateModal}
        title="确认作废？"
        message="作废后该次运动记录将不再计入统计，且无法撤销。确认继续吗？"
        onConfirm={confirmInvalidate}
        onCancel={() => setShowInvalidateModal(null)}
      />
    </div>
  )
}
