import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel}></div>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative flex flex-col items-center text-center animate-in fade-in zoom-in-95">
        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-[17px] font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        
        <div className="flex gap-3 w-full">
          <button 
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-[15px] font-medium bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="flex-1 py-2.5 rounded-xl text-[15px] font-medium bg-red-500 text-white active:bg-red-600 transition-colors shadow-sm"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
