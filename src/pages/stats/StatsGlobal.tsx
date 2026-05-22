import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/ui/Header';
import { useAppStore } from '../../store';
import toast from 'react-hot-toast';

export function StatsGlobal() {
  const navigate = useNavigate();
  const { categories, updateCategory } = useAppStore();

  const [formData, setFormData] = useState({
    period: 'thisSemester',
    customStart: '',
    customEnd: '',
    range: 'all',
  });

  const handleGenerate = () => {
    if (formData.period === 'custom') {
      if (!formData.customStart || !formData.customEnd) {
        toast.error('请填写完整的自定义时间');
        return;
      }
      if (new Date(formData.customStart) > new Date(formData.customEnd)) {
        toast.error('开始日期不能晚于结束日期');
        return;
      }
    }

    toast('正在生成类别达标报表...', { icon: '📊', duration: 1000 });
    setTimeout(() => {
      navigate(`/stats/grade?period=${formData.period}&range=${formData.range}`);
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] pb-24">
      <Header title="统计设置与类别目标" showBack={true} onBack={() => navigate('/stats')} />
      
      <div className="flex-1 overflow-y-auto mt-3 p-3 flex flex-col gap-3">
        {/* Period & Range */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex bg-white border-b border-gray-50">
            <div className="flex-1 px-4 py-3 flex flex-col justify-center border-r border-gray-50">
              <div className="text-[13px] text-gray-500 mb-1">统计周期</div>
              <select 
                value={formData.period}
                onChange={e => setFormData({...formData, period: e.target.value})}
                className="text-[15px] font-medium text-gray-900 outline-none bg-transparent"
              >
                <option value="thisWeek">本周</option>
                <option value="thisMonth">本月</option>
                <option value="thisSemester">本学期</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div className="flex-1 px-4 py-3 flex flex-col justify-center">
              <div className="text-[13px] text-gray-500 mb-1">统计范围</div>
              <select 
                value={formData.range}
                onChange={e => setFormData({...formData, range: e.target.value})}
                className="text-[15px] font-medium text-gray-900 outline-none bg-transparent"
              >
                <option value="all">全校</option>
                <option value="grade1">初一年级</option>
                <option value="grade2">初二年级</option>
                <option value="grade3">初三年级</option>
              </select>
            </div>
          </div>
          
          {formData.period === 'custom' && (
            <div className="px-4 py-3 bg-blue-50/30 flex items-center justify-between">
              <div className="text-[14px] text-gray-700">自定义时间</div>
              <div className="flex items-center gap-2">
                <input 
                  type="date"
                  value={formData.customStart}
                  onChange={e => setFormData({...formData, customStart: e.target.value})}
                  className="w-28 border border-gray-200 rounded-md px-2 py-1 outline-none text-[13px] bg-white focus:border-[#1677ff]"
                />
                <span className="text-gray-400 text-sm">-</span>
                <input 
                  type="date"
                  value={formData.customEnd}
                  onChange={e => setFormData({...formData, customEnd: e.target.value})}
                  className="w-28 border border-gray-200 rounded-md px-2 py-1 outline-none text-[13px] bg-white focus:border-[#1677ff]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Categories Target */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3.5 text-[15px] font-medium text-gray-900 border-b border-gray-50 bg-gray-50/50">
            第一层：运动类别完成次数下限设置
            <div className="text-[12px] font-normal text-gray-500 mt-1">设置后全局生效，用于多项目汇总打卡计算</div>
          </div>
          
          {categories.map((cat, idx) => (
            <div key={cat.id} className={`px-4 py-3 flex items-center justify-between ${idx < categories.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="w-[100px] text-[15px] font-medium text-gray-800">{cat.name}</div>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={cat.targetCompletions}
                  onChange={e => updateCategory(cat.id, { targetCompletions: parseInt(e.target.value) || 0 })}
                  placeholder="次数"
                  className="w-[80px] text-[15px] outline-none text-right bg-transparent border-b border-gray-200 focus:border-[#1677ff] pb-1 text-[#1677ff]"
                />
                <span className="text-[13px] text-gray-500">次</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 w-full max-w-[480px] bg-white p-4 border-t border-gray-100 z-50">
        <button 
          onClick={handleGenerate}
          className="w-full py-3 rounded-xl font-medium text-[16px] transition-colors bg-[#1677ff] text-white active:bg-[#0958d9]"
        >
          查看各班级/个人达标情况
        </button>
      </div>
    </div>
  );
}

