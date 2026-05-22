import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../store';
import { RegisterCamera } from './RegisterCamera';
import { RegisterList } from './RegisterList';

export function RegisterMode() {
  const { projectId } = useParams();
  const [view, setView] = useState<'camera' | 'list'>('camera');

  if (!projectId) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5] overflow-hidden relative">
      {view === 'camera' && (
        <RegisterCamera 
          projectId={projectId} 
          onGoToList={() => setView('list')} 
          onBack={() => setView('list')} // Actually from camera back might go to list
        />
      )}
      {view === 'list' && (
        <RegisterList 
          projectId={projectId} 
          onGoToCamera={() => setView('camera')} 
        />
      )}
    </div>
  );
}
