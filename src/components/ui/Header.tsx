import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightNode?: ReactNode;
  bg?: string;
  titleClassName?: string;
  iconClassName?: string;
}

export function Header({
  title,
  showBack = false,
  onBack,
  rightNode,
  bg = 'bg-white',
  titleClassName = 'text-gray-900',
  iconClassName = 'text-gray-700 active:bg-gray-100',
}: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`sticky top-0 z-40 w-full h-12 ${bg} flex items-center justify-between px-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]`}>
      <div className="min-w-[32px] flex items-center justify-start shrink-0">
        {showBack && (
          <button onClick={handleBack} className={`p-1 -ml-1 rounded-full transition-colors ${iconClassName}`}>
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>
      <div className={`flex-1 text-center font-medium text-[17px] truncate px-2 ${titleClassName}`}>
        {title}
      </div>
      <div className="min-w-[32px] flex items-center justify-end shrink-0">
        {rightNode}
      </div>
    </div>
  );
}
