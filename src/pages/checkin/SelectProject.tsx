import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/ui/Header';
import { useAppStore } from '../../store';
import { Target, Timer, CheckCircle, Navigation } from 'lucide-react';

export function SelectProject() {
  const navigate = useNavigate();
  const { projects } = useAppStore();
  
  const activeProjects = projects.filter(p => p.status === 'open');

  const getIndicatorText = (p: any) => {
    if (!p.indicators || p.indicators.length === 0) return '无指标';
    return p.indicators.map((ind: any) => `${ind.type === 'count' ? '次数' : ind.type === 'time' ? '计时' : ind.type === 'distance' ? '距离' : '其他'} ${ind.reqValue}${ind.unit}`).join(' | ');
  };

  const getPeriodText = (p: any) => {
    switch (p.limitPeriod) {
      case 'weekly': return '每周';
      case 'monthly': return '每月';
      case 'custom': return `${p.customDays}天内`;
      default: return '无限制';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
      <Header title="选择项目" showBack />
      
      <div className="p-4 flex flex-col gap-3">
        {activeProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Target className="w-12 h-12 mb-3 text-gray-300" />
            <p>暂无可用项目，请先在项目管理中创建</p>
          </div>
        ) : (
          activeProjects.map(p => (
            <div 
              key={p.id}
              onClick={() => {
                if (p.mode === 'register') {
                  navigate(`/checkin/register/${p.id}`);
                } else {
                  navigate(`/checkin/face-scan/${p.id}`);
                }
              }}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 active:scale-[0.98] transition-transform relative"
            >
              <h3 className="font-bold text-[16px] text-gray-900 border-b border-gray-50 pb-2 pr-12">{p.name}</h3>
              <span className="absolute top-4 right-4 text-[10px] text-[#1677ff] bg-blue-50 px-1.5 py-0.5 border border-blue-100 rounded">
                {p.mode === 'register' ? '登记模式' : '计时模式'}
              </span>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#1677ff] mr-2" />
                  <span className="w-20 text-gray-400">所需指标</span>
                  <span className="font-medium text-gray-800">
                    {getIndicatorText(p)}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Timer className="w-4 h-4 text-[#1677ff] mr-2" />
                  <span className="w-20 text-gray-400">周期限制</span>
                  <span className="font-medium text-gray-800">
                    {getPeriodText(p)}
                    {p.limitPeriod !== 'none' && ` ${p.targetCompletionsPerPeriod}次`}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
