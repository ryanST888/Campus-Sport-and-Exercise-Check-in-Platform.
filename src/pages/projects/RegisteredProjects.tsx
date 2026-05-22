import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Header } from '../../components/ui/Header';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search } from 'lucide-react';

export function RegisteredProjects() {
  const navigate = useNavigate();
  const { projects, records } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast('正在同步数据...', { icon: '🔄', duration: 1000 });
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('刷新成功');
    }, 1000);
  };

  const activeProjects = projects.filter(p => p.status === 'open');

  const getRecentRecord = (projectId: string) => {
    const projectRecords = records.filter(r => r.projectId === projectId && !r.isInvalid);
    if (projectRecords.length === 0) return null;
    return projectRecords.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0];
  };

  const getTotalPassed = (projectId: string) => {
    return records.filter(r => r.projectId === projectId && r.isPassed && !r.isInvalid).length;
  };

  const filteredProjects = activeProjects.filter(p => p.name.includes(searchQuery));

  return (
    <div className="absolute inset-0 flex flex-col bg-[#f5f5f5] z-10">
      <Header title="登记记录" showBack bg="bg-white" />
      
      <div 
        className="flex-1 overflow-y-auto"
        onTouchEnd={() => {
          if (window.scrollY <= 0) handleRefresh();
        }}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-gray-500 text-sm font-medium">已登记项目 ({filteredProjects.length})</h2>
            <div className="flex items-center bg-gray-100 rounded-full px-2.5 py-1.5 w-[140px]">
              <Search className="w-4 h-4 text-gray-400 mr-1.5 shrink-0" />
              <input
                type="text"
                placeholder="搜索项目"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[13px] w-full text-gray-700 placeholder:text-gray-400 min-w-0"
              />
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">📝</span>
              </div>
              <p>暂无运动项目</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredProjects.map(project => {
                const recentRecord = getRecentRecord(project.id);
                const totalPassed = getTotalPassed(project.id);
                
                const indicatorsText = project.indicators && project.indicators.length > 0 
                  ? project.indicators.map((ind: any) => `${ind.type === 'count' ? '次数' : ind.type === 'time' ? '计时' : ind.type === 'distance' ? '距离' : '其他'} ${ind.reqValue}${ind.unit}`).join(', ')
                  : '无指标';

                return (
                  <div 
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2 active:scale-[0.98] transition-transform relative"
                  >
                    <h3 className="font-bold text-[16px] text-gray-900 pr-12">{project.name}</h3>
                    <span className="absolute top-4 right-4 text-[10px] text-[#1677ff] bg-blue-50 px-1.5 py-0.5 border border-blue-100 rounded">
                      {project.mode === 'register' ? '登记模式' : '计时模式'}
                    </span>
                    <div className="flex flex-col gap-1.5 text-xs text-gray-500 mt-1">
                      <div className="flex items-center text-gray-400 truncate">
                        <span>周期目标：{!project.limitPeriod || project.limitPeriod === 'none' ? '不限' : project.targetCompletionsPerPeriod !== undefined ? `${project.targetCompletionsPerPeriod}次` : '不限'} | 每日打卡：{project.maxCompletionsPerDay !== undefined ? project.maxCompletionsPerDay + '次' : '不限'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>最近登记：{recentRecord ? format(new Date(recentRecord.datetime), 'yyyy-MM-dd HH:mm') : '暂无'}</span>
                        <span>累计完成：<span className="text-gray-900 font-medium">{totalPassed}</span> 人次</span>
                      </div>
                    </div>
                    <div className="h-px w-full bg-gray-50 my-1"></div>
                    <div className="flex justify-between items-center text-xs text-[#1677ff] font-medium">
                      <span className="truncate mr-2">完成指标：{indicatorsText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
