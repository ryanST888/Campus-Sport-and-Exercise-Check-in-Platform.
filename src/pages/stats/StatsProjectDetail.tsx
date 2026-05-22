import { useParams } from 'react-router-dom';
import { Header } from '../../components/ui/Header';
import { Search, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { useAppStore, DUMMY_STUDENTS } from '../../store';

export function StatsProjectDetail() {
  const { projectId } = useParams();
  const [search, setSearch] = useState('');
  const [showProjectInfoModal, setShowProjectInfoModal] = useState(false);
  
  const { projects, records, statsMonth } = useAppStore();
  const project = projects.find(p => p.id === projectId);
  
  const displayMonthStr = statsMonth ? parseInt(statsMonth.split('-')[1], 10) + '月完成' : '本月完成';
  
  const projectRecords = records.filter(r => r.projectId === projectId && !r.isInvalid && r.isPassed);
  
  const thisWeekRecords = projectRecords.filter(r => new Date(r.datetime).getTime() > Date.now() - 7 * 24 * 3600 * 1000);
  const thisMonthRecords = projectRecords.filter(r => r.date.startsWith(statsMonth));

  const studentMap = new Map();
  projectRecords.forEach(r => {
    if (!studentMap.has(r.studentId)) {
      studentMap.set(r.studentId, {
        id: r.studentId,
        count: 0,
        rewardCount: 0,
        totalCompleted: 0
      });
    }
    const stat = studentMap.get(r.studentId);
    stat.count += 1;
    stat.totalCompleted += r.totalTimes || 1;
    if (r.isChallenge) {
      stat.rewardCount += r.rewardTimes || project?.challengeRewardTimes || 1;
    }
  });

  const participants = Array.from(studentMap.values()).map(stat => {
    const s = DUMMY_STUDENTS.find(ds => ds.id === stat.id);
    return {
      id: stat.id,
      name: s ? s.name : stat.id,
      class: s ? `${s.grade}${s.className}` : '未知',
      count: stat.count,
      rewardCount: stat.rewardCount,
      totalCompleted: stat.totalCompleted
    };
  }).sort((a, b) => b.totalCompleted - a.totalCompleted);
  
  const totalCompletedSum = participants.reduce((sum, p) => sum + p.totalCompleted, 0);

  const filteredParticipants = participants.filter(p => 
    p.name.includes(search) || p.class.includes(search)
  );

  const projectName = project ? project.name : '项目参与情况';

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] pb-safe">
      <Header title={`${projectName} 参与人员`} showBack />
      
      <div className="flex-1 p-3 flex flex-col gap-3">
        {project && (
          <>
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

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center text-center">
              <div className="flex flex-col flex-1 border-r border-gray-100">
                <span className="text-xl font-bold text-[#1677ff]">{thisWeekRecords.reduce((sum, r) => sum + (r.totalTimes || 1), 0)}</span>
                <span className="text-[10px] text-gray-400 mt-1">本周完成</span>
              </div>
              <div className="flex flex-col flex-1 border-r border-gray-100">
                <span className="text-xl font-bold text-[#1677ff]">{thisMonthRecords.reduce((sum, r) => sum + (r.totalTimes || 1), 0)}</span>
                <span className="text-[10px] text-gray-400 mt-1">{displayMonthStr}</span>
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xl font-bold text-[#1677ff]">{totalCompletedSum}</span>
                <span className="text-[10px] text-gray-400 mt-1">总完成</span>
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-xl flex items-center px-3 py-2 border border-gray-100 shadow-sm mt-1">
          <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="搜索姓名或班级" 
            className="flex-1 outline-none text-sm text-gray-800 placeholder:text-gray-400 bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden mb-8">
          <div className="flex bg-gray-50 p-3 text-[13px] text-gray-500 font-medium border-b border-gray-100">
            <div className="flex-[2.5]">人员 (班级)</div>
            <div className="flex-[1.5] text-center">总完成</div>
            <div className="flex-[1.5] text-center">完成次数</div>
            <div className="flex-[1.5] text-right">挑战奖励</div>
          </div>
          
          <div className="divide-y divide-gray-50">
            {filteredParticipants.map((p) => (
              <div key={p.id} className="flex items-center p-3 text-sm">
                <div className="flex-[2.5] flex items-center gap-2">
                  <div>
                    <div className="font-medium text-gray-800">{p.name}</div>
                    <div className="text-[11px] text-gray-400">{p.class}</div>
                  </div>
                </div>
                <div className="flex-[1.5] text-center font-bold text-[#1677ff]">{p.totalCompleted}</div>
                <div className="flex-[1.5] text-center text-gray-600 font-medium">{p.count}</div>
                <div className="flex-[1.5] text-right text-orange-500 font-medium">{p.rewardCount}</div>
              </div>
            ))}
            
            {filteredParticipants.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">
                没有找到相关人员
              </div>
            )}
          </div>
        </div>
      </div>

      {showProjectInfoModal && project && (
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
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2.5">
                    <span className="text-[14px] text-gray-600">项目名称</span>
                    <span className="text-[14px] font-bold text-gray-900">{project.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2.5">
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
    </div>
  );
}

