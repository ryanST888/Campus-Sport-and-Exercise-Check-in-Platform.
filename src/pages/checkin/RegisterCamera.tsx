import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, SwitchCamera, Image as ImageIcon, ChevronLeft, X } from 'lucide-react';
import { useAppStore } from '../../store';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export function RegisterCamera({ projectId, onGoToList }: { projectId: string, onGoToList: () => void, onBack: () => void }) {
  const navigate = useNavigate();
  const { addPhotoTask, removePhotoTask, waitingTasks, projects } = useAppStore();
  const project = projects.find(p => p.id === projectId);
  
  const handleTakePhoto = () => {
    addPhotoTask(projectId);
    toast.success('已录入数据，正在上传识别...');
  };

  const handleBack = () => {
    // If there are waiting tasks, should we warn? Or just go to list?
    if (waitingTasks.length > 0) {
      onGoToList();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div className="flex items-center justify-between p-4 px-5 pt-safe relative">
        <button onClick={handleBack} className="text-white p-2 pl-0 flex items-center gap-1 active:opacity-70 z-10 w-20">
          <ChevronLeft className="w-6 h-6" />
          <span className="text-[15px] font-medium">返回</span>
        </button>
        <div className="absolute left-0 right-0 top-4 text-center pointer-events-none">
          <span className="text-white text-[16px] font-medium">{project?.name || '连续拍照识别'}</span>
        </div>
        <button onClick={onGoToList} className="text-[#1677ff] p-2 pr-0 active:opacity-70 z-10 font-medium text-[15px] bg-white/10 px-3 rounded-full">
          {project?.mode === 'register' ? '进入登记' : '进入打卡'} {waitingTasks.length > 0 && `(${waitingTasks.length})`}
        </button>
      </div>
      
      <div className="flex-1 flex items-center justify-center pt-4">
        <div className="w-[85vw] h-[85vw] border-2 border-white/20 rounded-2xl relative">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1677ff] -translate-x-[2px] -translate-y-[2px] rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1677ff] translate-x-[2px] -translate-y-[2px] rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1677ff] -translate-x-[2px] translate-y-[2px] rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1677ff] translate-x-[2px] translate-y-[2px] rounded-br-xl"></div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-16 h-16 text-white/20" />
          </div>
        </div>
      </div>

      {waitingTasks.length > 0 && (
        <div className="bg-black pt-4 pb-2 px-4 flex gap-3 overflow-x-auto whitespace-nowrap">
          {waitingTasks.map((t, idx) => (
            <div key={t.taskId} className="w-14 h-14 bg-white/10 rounded-lg flex-shrink-0 flex items-center justify-center border border-white/20 relative overflow-hidden">
              <ImageIcon className="w-6 h-6 text-white/50" />
              {(t.status === 'success' || t.status === 'times_full') && t.student && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center font-medium">
                  <span className="w-4 h-4 rounded-full bg-[#52c41a] text-white flex items-center justify-center mb-0.5 text-[10px]">✓</span>
                  <span className="text-white text-[9px] truncate w-full text-center px-1">{t.student.name}</span>
                </div>
              )}
              {t.status === 'recognizing' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
              {t.status === 'failed' && (
                <div 
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer active:bg-black/80 transition-colors"
                  onClick={() => removePhotoTask(t.taskId)}
                >
                   <X className="w-4 h-4 text-white mb-0.5" />
                   <span className="text-[8px] text-white/90 font-medium">失败</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pb-10 pt-4 bg-black">
        <div className="text-center mb-6">
          <span className="text-white/80 text-[13px] bg-white/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", waitingTasks.length > 0 ? "bg-[#52c41a]" : "bg-[#1677ff]")}></div>
            {waitingTasks.length > 0 ? `已拍 ${waitingTasks.length} 张` : '等待拍照'}
          </span>
        </div>
        <div className="flex items-center justify-between px-12 mt-2">
          <button className="flex flex-col items-center justify-center gap-1.5 active:opacity-50">
            <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/60 text-[11px]">相册选图</span>
          </button>
          
          <button 
            onClick={handleTakePhoto}
            className="w-[72px] h-[72px] bg-white rounded-full flex items-center justify-center border-[6px] border-[#1677ff]/30 active:scale-95 transition-all shadow-[0_0_20px_rgba(22,119,255,0.4)]"
          >
            <div className="w-14 h-14 bg-white rounded-full border border-gray-100 shadow-inner flex items-center justify-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full border border-gray-100"></div>
            </div>
          </button>

          <button className="w-11 h-11 flex flex-col items-center justify-center gap-1.5 active:opacity-50">
             <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center">
              <SwitchCamera className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/60 text-[11px]">翻转镜头</span>
          </button>
        </div>
      </div>
    </div>
  );
}
