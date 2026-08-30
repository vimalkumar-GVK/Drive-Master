import React, { useEffect, useState } from 'react';
import { Undo2, Redo2 } from 'lucide-react';
import api from '@/lib/api';

export const UndoRedoControls: React.FC = () => {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const checkStatus = async () => {
    try {
      const response = await api.get('/history/status');
      setCanUndo(response.data.can_undo);
      setCanRedo(response.data.can_redo);
    } catch (error) {
      console.error('Failed to fetch history status', error);
    }
  };

  useEffect(() => {
    // Initial check
    checkStatus();

    // Poll every 10 seconds to update status
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUndo = async () => {
    try {
      await api.post('/history/undo');
      checkStatus();
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to undo action.');
    }
  };

  const handleRedo = async () => {
    try {
      await api.post('/history/redo');
      checkStatus();
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to redo action.');
    }
  };

  if (!canUndo && !canRedo) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-md p-2 rounded-full shadow-lg border">
      <button 
        onClick={handleUndo} 
        disabled={!canUndo}
        className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${canUndo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400 cursor-not-allowed'}`}
        title="Undo last action (within 5 mins)"
      >
        <Undo2 className="h-4 w-4 mr-2" />
        Undo
      </button>
      <button 
        onClick={handleRedo} 
        disabled={!canRedo}
        className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${canRedo ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400 cursor-not-allowed'}`}
        title="Redo last undone action"
      >
        <Redo2 className="h-4 w-4 mr-2" />
        Redo
      </button>
    </div>
  );
};
