import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../components/ui/Header';
import { useAppStore, DUMMY_STUDENTS } from '../../store';
import toast from 'react-hot-toast';

export function StatsGrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { records, projects, categories, statsMonth } = useAppStore();

  const period = searchParams.get('period') || 'thisSemester';
  const range = searchParams.get('range') || 'all';

  // For demo, just use all valid records
  const relevantRecords = records.filter(r => !r.isInvalid && r.datetime.startsWith(statsMonth));

  const classNames = ['1班', '2班', '3班', '4班'];
  
  const gradeData = classNames.map(clsName => {
    const studentsInClass = DUMMY_STUDENTS.filter(s => s.grade === '初一' && s.className === clsName);
    
    let allCategoriesMetCount = 0;
    const catStats: Record<string, number> = {};
    categories.forEach(c => catStats[c.id] = 0);

    studentsInClass.forEach(student => {
      const sRecords = relevantRecords.filter(r => r.studentId === student.id && r.isPassed);
      let studentMetAll = true;
      
      categories.forEach(cat => {
        // Find projects belonging to this category
        const catProjectIds = projects.filter(p => p.categoryId === cat.id).map(p => p.id);
        
        // Sum the totalTimes for these projects
        const catTimes = sRecords
          .filter(r => catProjectIds.includes(r.projectId))
          .reduce((sum, r) => sum + (r.totalTimes || 1), 0);
          
        const targetCompletions = cat.monthlyRules?.[statsMonth] ?? cat.targetCompletions;
        if (catTimes >= targetCompletions) {
          catStats[cat.id]++;
        } else {
          studentMetAll = false;
        }
      });
      
      if (studentMetAll) allCategoriesMetCount++;
    });

    return {
      className: `初一${clsName}`,
      classId: clsName,
      allMet: allCategoriesMetCount,
      catStats,
      totalStudents: studentsInClass.length
    };
  });

  const handleExport = () => {
    toast.success('正在导出...', { duration: 1000 });
    setTimeout(() => {
      toast.success('导出成功，文件已保存至手机相册/文件管理器');
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] pb-24">
      <Header title="类别达标统计分析" showBack />
      
      <div className="bg-white p-4 border-b border-gray-100 shadow-sm flex flex-col gap-1 text-sm text-gray-600">
        <div>统计周期：{period === 'thisWeek' ? '本周' : period === 'thisMonth' ? '本月' : '本学期'}</div>
        <div>统计范围：{range === 'all' ? '全校' : '初一年级'}</div>
        <div className="mt-1 text-xs text-gray-400">汇总学生各分类下历史合法打卡的累加次数与分类下限对比</div>
      </div>

      <div className="p-3">
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-[11px] sm:text-xs tracking-tight">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium tracking-tight">
              <tr>
                <th className="py-3 px-2">班级</th>
                {categories.map(c => {
                  const targetCompletions = c.monthlyRules?.[statsMonth] ?? c.targetCompletions;
                  return (
                    <th key={c.id} className="py-3 px-1 text-center bg-blue-50/20">{c.name}<br/><span className="text-[9px] font-normal text-gray-400">≥{targetCompletions}次</span></th>
                  );
                })}
                <th className="py-3 px-1 text-center text-[#1677ff]">全部<br/>满标</th>
                <th className="py-3 px-2 text-center">详情</th>
              </tr>
            </thead>
            <tbody>
              {gradeData.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50">
                  <td className="py-3 px-2 font-medium text-gray-900">{row.className}</td>
                  {categories.map(c => (
                    <td key={c.id} className="py-3 px-1 text-center font-medium">
                      <span className={row.catStats[c.id] > 0 ? "text-emerald-500" : "text-gray-400"}>
                        {row.catStats[c.id]}
                      </span>
                      <span className="text-[10px] text-gray-300 font-normal">/{row.totalStudents}</span>
                    </td>
                  ))}
                  <td className="py-3 px-1 text-center font-bold text-[#1677ff]">{row.allMet}</td>
                  <td className="py-3 px-2 text-center">
                    <button 
                      onClick={() => navigate(`/stats/class/${row.classId}?period=${period}`)}
                      className="text-[#1677ff] active:text-[#0958d9] px-2 py-1.5 rounded-md bg-[#e6f4ff] font-medium text-[11px] whitespace-nowrap"
                    >
                      明细
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-0 w-full max-w-[480px] bg-white p-4 border-t border-gray-100 z-50">
        <button 
          onClick={handleExport}
          className="w-full bg-white border border-[#1677ff] text-[#1677ff] py-3 rounded-xl font-medium text-[16px] active:bg-gray-50 transition-colors cursor-pointer"
        >
          导出班级达标明细
        </button>
      </div>
    </div>
  );
}
