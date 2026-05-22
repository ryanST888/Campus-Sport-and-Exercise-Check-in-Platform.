import { useState, useEffect, MouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../../components/ui/Header';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAppStore, DUMMY_STUDENTS } from '../../store';
import { Camera, SwitchCamera, Trash2, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, X, ChevronLeft, Search, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { RegisterCamera } from './RegisterCamera';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function FaceScan() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<'camera' | 'list'>('camera');
  const [activeTab, setActiveTab] = useState<'waiting' | 'inProgress' | 'completed'>('waiting');
  const [showBackModal, setShowBackModal] = useState(false);

  const { waitingTasks, clearWaitingTasks, inProgressGroups, projects } = useAppStore();
  const project = projects.find(p => p.id === projectId);

  const handleBack = () => {
    if (waitingTasks.length > 0) {
      setShowBackModal(true);
    } else {
      navigate(-1);
    }
  };

  const handleConfirmBack = () => {
    clearWaitingTasks();
    navigate(-1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] overflow-hidden relative">
      {view === 'camera' && (
        <RegisterCamera 
          projectId={projectId!} 
          onGoToList={() => setView('list')} 
          onBack={() => setView('list')}
        />
      )}
      
      {view === 'list' && (
        <div className="flex flex-col h-screen absolute inset-0 bg-[#f0f2f5]">
          <Header 
            title={project?.name || "运动打卡"} 
            showBack 
            onBack={handleBack}
            bg="bg-white"
            rightNode={
                activeTab === 'waiting' &&
              <button className="p-2" onClick={() => setView('camera')}>
                <SwitchCamera className="w-6 h-6 text-gray-700" />
              </button>
            }
          />
          
          {/* Tabs */}
          <div className="bg-white flex items-center border-b border-gray-100 shadow-sm z-30 flex-shrink-0 relative">
            <button onClick={() => setActiveTab('waiting')} className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'waiting' ? 'text-[#1677ff]' : 'text-gray-500'}`}>
              待发起
              {activeTab === 'waiting' && <div className="absolute bottom-0 left-[30%] right-[30%] h-0.5 bg-[#1677ff] rounded-t" />}
            </button>
            <button onClick={() => setActiveTab('inProgress')} className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'inProgress' ? 'text-[#1677ff]' : 'text-gray-500'}`}>
              进行中
              {activeTab === 'inProgress' && <div className="absolute bottom-0 left-[30%] right-[30%] h-0.5 bg-[#1677ff] rounded-t" />}
            </button>
            <button onClick={() => setActiveTab('completed')} className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === 'completed' ? 'text-[#1677ff]' : 'text-gray-500'}`}>
              今日完成
              {activeTab === 'completed' && <div className="absolute bottom-0 left-[30%] right-[30%] h-0.5 bg-[#1677ff] rounded-t" />}
            </button>
          </div>

          <div className="flex-1 flex flex-col relative overflow-hidden">
            <div className={cn("absolute inset-0 flex flex-col transition-transform duration-300", activeTab === 'waiting' ? "translate-x-0" : "-translate-x-full")}>
               <WaitingTab projectId={projectId!} setActiveTab={setActiveTab} onGoToCamera={() => setView('camera')} />
            </div>
            <div className={cn("absolute inset-0 flex flex-col transition-transform duration-300", activeTab === 'inProgress' ? "translate-x-0" : activeTab === 'waiting' ? "translate-x-full" : "-translate-x-full")}>
               <InProgressTab projectId={projectId!} />
            </div>
            <div className={cn("absolute inset-0 flex flex-col transition-transform duration-300 z-10 bg-[#f0f2f5]", activeTab === 'completed' ? "translate-x-0" : "translate-x-full")}>
               <CompletedTab projectId={projectId!} />
            </div>
          </div>

          <ConfirmModal
            isOpen={showBackModal}
            title="确定退出？"
            message="未开始的识别记录将被清空，但进行中的不受影响。"
            onConfirm={handleConfirmBack}
            onCancel={() => setShowBackModal(false)}
          />
        </div>
      )}
    </div>
  );
}

function WaitingTab({ projectId, setActiveTab, onGoToCamera }: { projectId: string, setActiveTab: (tab: any) => void, onGoToCamera: () => void }) {
  const { waitingTasks, addPhotoTask, removePhotoTask, addInProgressGroup, projects, clearFailedTasks, clearWaitingTasks } = useAppStore();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showClearListModal, setShowClearListModal] = useState(false);
  const [autoSelected, setAutoSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const selectableTasks = waitingTasks.filter(t => t.status === 'success');
    const newTasksToSelect = selectableTasks.filter(t => !autoSelected.has(t.taskId));
    
    if (newTasksToSelect.length > 0) {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        newTasksToSelect.forEach(t => next.add(t.taskId));
        return Array.from(next);
      });
      setAutoSelected(prev => {
        const next = new Set(prev);
        newTasksToSelect.forEach(t => next.add(t.taskId));
        return next;
      });
    }
  }, [waitingTasks, autoSelected]);

  const project = projects.find(p => p.id === projectId);

  const handleTakePhoto = () => {
    if (!projectId) return;
    addPhotoTask(projectId);
    toast.success('已录入数据，正在上传识别...');
  };

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

  const handleStartConfirm = () => {
    if (selectedTaskIds.length === 0 || !projectId) return;
    addInProgressGroup(projectId, selectedTaskIds);
    toast.success('已组成小组并开始登记');
    setShowConfirmModal(false);
    setSelectedTaskIds([]);
    setActiveTab('inProgress');
  };

  const countSuccess = waitingTasks.filter(t => t.status === 'success' || t.status === 'times_full').length;
  const countFailed = waitingTasks.filter(t => t.status === 'failed').length;
  const countRecognizing = waitingTasks.filter(t => t.status === 'recognizing').length;
  const selectableTasks = waitingTasks.filter(t => t.status === 'success');

  return (
    <>
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 shadow-sm z-20 flex-shrink-0">
        <div className="flex gap-1 items-baseline">
          <span className="text-sm font-medium text-gray-800">
            识别
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
            <p className="text-sm">暂无识别记录，请点击底部拍照录入</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-4">
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

      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 pb-6 flex items-center justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.02)] gap-4">
        <div className="flex items-center gap-6 pl-2">
          <button 
            onClick={onGoToCamera}
            className="flex flex-col items-center justify-center text-sm font-medium text-gray-700 active:text-[#1677ff] transition-colors"
          >
            <Camera className="w-6 h-6 mb-0.5" />
            <span className="text-[11px]">拍照录入</span>
          </button>
          
          <button 
            onClick={handleSelectAll}
            className={cn(
              "flex flex-col items-center justify-center text-sm font-medium transition-colors",
              selectableTasks.length === 0 ? "opacity-30 cursor-not-allowed" : "text-gray-700 active:text-gray-900"
            )}
            disabled={selectableTasks.length === 0}
          >
            <CheckCircle2 className={cn("w-6 h-6 mb-0.5", selectedTaskIds.length === selectableTasks.length && selectableTasks.length > 0 ? "text-[#1677ff]" : "text-gray-500")} />
            <span className="text-[11px] font-normal">{selectedTaskIds.length === selectableTasks.length && selectableTasks.length > 0 ? '取消全选' : '全选'}</span>
          </button>
        </div>
        
        <button 
          onClick={() => {
              if (selectedTaskIds.length === 0) return;
              setShowConfirmModal(true);
          }}
          disabled={selectedTaskIds.length === 0}
          className={cn(
              "flex-1 h-[48px] rounded-full font-medium text-[16px] transition-all max-w-[200px]",
              selectedTaskIds.length > 0
              ? "bg-[#1677ff] text-white active:bg-[#0958d9] shadow-md hover:shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          开始运动 {selectedTaskIds.length > 0 ? `(${selectedTaskIds.length})` : ''}
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirmModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative flex flex-col items-center text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-blue-50 text-[#1677ff] rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认开始登记</h3>
            <p className="text-gray-500 mb-6 text-[15px]">
              已选 <span className="font-bold text-[#1677ff] px-1">{selectedTaskIds.length}</span> 人进行<br/>
              <span className="font-medium text-gray-800">{project?.name}</span>
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleStartConfirm}
                className="flex-1 py-3 bg-[#1677ff] text-white rounded-xl font-medium active:bg-[#0958d9] shadow-sm transition-colors"
              >
                确认开始
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showClearListModal}
        title="清空列表"
        message="确定要清空未开始的识别记录吗？正在识别中的记录也将被中断。"
        onConfirm={() => {
          clearWaitingTasks();
          setSelectedTaskIds([]);
        }}
        onCancel={() => setShowClearListModal(false)}
      />
    </>
  )
}

function InProgressTab({ projectId }: { projectId: string }) {
  const { inProgressGroups, completeStudentRecord, completeMultipleRecords, projects } = useAppStore();
  const project = projects.find(p => p.id === projectId);
  const indicator = project?.indicators?.[0];

  const projectGroups = inProgressGroups.filter(g => g.projectId === projectId);
  
  const [now, setNow] = useState(Date.now());
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreValue, setScoreValue] = useState<string>('');
  const [timeValue, setTimeValue] = useState<string>('');
  
  // Track context for submission
  const [submitContext, setSubmitContext] = useState<{
    type: 'student' | 'group',
    groupId: string,
    student?: any,
    durationSeconds: number
  } | null>(null);
  
  const [isChallengeChecked, setIsChallengeChecked] = useState(false);
  const [rewardTimesInput, setRewardTimesInput] = useState<string>('0');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openSubmitModalForStudent = (groupId: string, student: any, durationSeconds: number) => {
    setScoreValue((indicator?.reqValue || student.targetValue)?.toString() || '0');
    setTimeValue(durationSeconds.toString());
    setSubmitContext({ type: 'student', groupId, student, durationSeconds });
    setIsChallengeChecked(false);
    setRewardTimesInput(project?.challengeRewardTimes?.toString() || '0');
    setShowScoreModal(true);
  };

  const openSubmitModalForGroup = (groupId: string, durationSeconds: number) => {
    const group = projectGroups.find(g => g.id === groupId);
    setScoreValue((indicator?.reqValue || group?.students[0]?.targetValue)?.toString() || '0');
    setTimeValue(durationSeconds.toString());
    setSubmitContext({ type: 'group', groupId, durationSeconds });
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

    if (!submitContext) return;

    let actualChallengeChecked = isChallengeChecked;
    let isPassed = true;
    let isChallenge = false;
    let rewardTimes = 0;

    if (actualChallengeChecked && project?.allowChallenge) {
      isChallenge = true;
      rewardTimes = Number(rewardTimesInput) || 0;
    }

    if (submitContext.type === 'student' && submitContext.student) {
      completeStudentRecord(submitContext.groupId, submitContext.student.student.id, timeVal, val, true, isChallenge, rewardTimes);
      toast.success(`${submitContext.student.student.name} 完成登记`);
    } else if (submitContext.type === 'group') {
      const group = projectGroups.find(g => g.id === submitContext.groupId);
      if (group) {
         const sids = group.students.map(s => s.student.id);
         completeMultipleRecords(submitContext.groupId, sids, timeVal, val, true, isChallenge, rewardTimes);
         toast.success(`该组 ${sids.length} 人全部完成登记`);
      }
    }
    setShowScoreModal(false);
    setSubmitContext(null);
  };

  const handleCancelStudent = (groupId: string, student: any, durationSeconds: number) => {
    completeStudentRecord(groupId, student.student.id, durationSeconds, student.targetValue, false);
    toast.success(`${student.student.name} 已取消`);
  };

  return (
    <div className="flex-1 p-3 pb-10 overflow-y-auto flex flex-col gap-4 bg-[#f0f2f5]">
      <div className="text-sm font-medium text-gray-500 px-1 pt-1">
        当前进行中: <span className="text-[#1677ff]">{projectGroups.length}</span> 组
      </div>
      
      {projectGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🏃</span>
          </div>
          <p>暂无进行中的小组</p>
        </div>
      ) : (
        projectGroups.map((group, gIdx) => {
          const durationSeconds = Math.floor((now - new Date(group.startTime).getTime()) / 1000);
          const startTimeStr = new Date(group.startTime).toLocaleTimeString([], { hour12: false });
          return (
            <div key={group.id} className="flex-shrink-0 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col animate-in slide-in-from-bottom-2">
              <div className="bg-gradient-to-r from-blue-50 to-white px-4 py-3.5 border-b border-gray-100 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-[16px]">第 {gIdx + 1} 组</span>
                  <span className="text-[11px] font-medium text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-100">{group.students.length}人</span>
                  <span className="text-[11px] text-gray-400 ml-1">开始时间 {startTimeStr}</span>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <div className="font-mono text-[28px] font-bold tracking-tight text-[#1677ff]">
                    {formatDuration(durationSeconds)}
                  </div>
                  <button 
                    onClick={() => openSubmitModalForGroup(group.id, durationSeconds)}
                    className="flex-shrink-0 text-[14px] font-medium bg-[#1677ff] text-white px-5 py-2 rounded-full shadow-[0_2px_8px_rgba(22,119,255,0.25)] active:scale-95 transition-all"
                  >
                    整组完成
                  </button>
                </div>
              </div>
              
              <div className="px-3.5 py-3 pb-4 flex flex-col gap-2">
                {group.students.map((s, idx) => (
                  <div 
                    key={s.student.id}
                    className="w-full flex-shrink-0 flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-gray-50/80 relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#1677ff]/30"></div>
                    <div className="flex items-center gap-2.5 min-w-0 pl-2">
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center font-mono font-bold text-gray-500 text-[11px] shadow-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col min-w-0 space-y-0.5">
                        <span className="font-bold text-gray-800 text-[15px] leading-tight truncate">{s.student.name}</span>
                        <span className="text-[11px] text-gray-400 leading-tight truncate">{s.student.grade}{s.student.className}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      <button 
                        onClick={() => handleCancelStudent(group.id, s, durationSeconds)}
                        className="px-2.5 h-8 flex items-center justify-center text-[12px] font-bold bg-white border border-gray-300 text-gray-500 rounded-md active:bg-gray-100 transition-colors shadow-sm"
                      >
                        取消
                      </button>
                      <button 
                        onClick={() => openSubmitModalForStudent(group.id, s, durationSeconds)}
                        className="px-2.5 h-8 flex items-center justify-center text-[12px] font-bold bg-white border border-[#1677ff] text-[#1677ff] rounded-md active:bg-[#1677ff] active:text-white transition-colors shadow-sm"
                      >
                        完成
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {showScoreModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowScoreModal(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative flex flex-col items-center animate-in fade-in zoom-in-95">
            <button onClick={() => setShowScoreModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">确认成绩</h3>
            <p className="text-sm text-gray-500 mb-5">
              为 {submitContext?.type === 'student' ? submitContext.student.student.name : `选中组别的所有`} 学生登记成绩
            </p>

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
            
            <div className="w-full mb-5 flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block text-center">成绩 ({indicator?.unit || '个'})</label>
                <input 
                  type="number" 
                  value={scoreValue}
                  onChange={(e) => setScoreValue(e.target.value)}
                  className="w-full text-center text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl py-3 outline-none focus:border-[#1677ff] focus:bg-blue-50/50 transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block text-center">耗时 (秒)</label>
                <input 
                  type="number" 
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="w-full text-center text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl py-3 outline-none focus:border-[#1677ff] focus:bg-blue-50/50 transition-colors"
                />
              </div>
            </div>
            
            <div className="w-full text-center mb-5 mt-[-10px] text-xs text-gray-400">
              {isChallengeChecked && project?.allowChallenge && project?.challengeIndicators?.[0] ? (
                `挑战指标要求: ${project.challengeIndicators[0].reqValue} ${project.challengeIndicators[0].unit}`
              ) : (
                `默认指标要求: ${indicator?.reqValue} ${indicator?.unit || '个'}`
              )}
            </div>
            
            <div className="w-full bg-gray-50 rounded-lg p-3 mb-5 text-center flex flex-col gap-1 border border-gray-100">
              <span className="text-sm text-gray-700">本次获得：总次数 +{isChallengeChecked ? 1 + (Number(rewardTimesInput) || 0) : 1}</span>
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
    </div>
  )
}

function CompletedTab({ projectId }: { projectId: string }) {
  const { records, projects, updateRecord, invalidateRecord } = useAppStore();
  const project = projects.find(p => p.id === projectId);
  const indicator = project?.indicators?.[0];
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [showInvalidateModal, setShowInvalidateModal] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const projectRecords = records.filter(r => r.projectId === projectId && !r.isInvalid && r.date === todayStr && r.isPassed);

  const getStudentName = (sid: string) => {
    const student = DUMMY_STUDENTS.find(s => s.id === sid);
    return student ? student.name : sid;
  };

  const filteredRecords = projectRecords.filter(r => getStudentName(r.studentId).includes(searchQuery));

  const handleEditRecord = (record: any) => {
    setEditValue(record.achievedValue.toString());
    setEditTime(record.durationSeconds.toString());
    setEditingRecord(record);
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

  const confirmInvalidate = () => {
    if (showInvalidateModal) {
      invalidateRecord(showInvalidateModal);
      toast.success('记录已作废');
      setShowInvalidateModal(null);
    }
  };

  return (
    <div className="flex-1 p-3 pb-10 overflow-y-auto flex flex-col gap-3 bg-[#f0f2f5]">
      <div className="flex justify-between items-center px-1 pt-1">
        <div className="text-sm font-medium text-gray-500">今日已完成: <span className="text-[#1677ff]">{projectRecords.length}</span> 人次</div>
        <div className="flex items-center bg-white rounded-full px-2.5 py-1.5 w-[140px] shadow-sm border border-gray-100">
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
            <p>{searchQuery ? '未找到相关人员' : '今日暂无完成记录'}</p>
          </div>
      ) : (
        filteredRecords.map(record => (
          <div 
            key={record.id} 
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative"
          >
            <div className="flex justify-between items-center mb-1 pr-14">
              <span className="font-bold text-gray-900">{getStudentName(record.studentId)} <span className="text-[#52c41a] text-sm ml-1 font-medium bg-green-50 px-2 py-0.5 rounded">完成</span></span>
              <span className="text-base text-gray-800 font-bold">{record.achievedValue} <span className="text-xs text-gray-500 font-normal">{indicator?.unit || '个'}</span></span>
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
            <p className="text-sm text-gray-500 mb-5 text-center">
              修改 {getStudentName(editingRecord.studentId)} 的记录
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
              提交修改
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
