import { useState, useEffect } from 'react';
import { Trash2, X, AlertCircle } from 'lucide-react';

interface StudentInfo {
  name?: string;
  department?: string;
  roll_no?: string;
}

interface TrashReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  student: StudentInfo | null;
}

const QUICK_REASONS = [
  "Duplicate Record",
  "Incorrect Data",
  "Graduated / Left College",
  "Student Request",
  "Other"
];

export function TrashReasonModal({ isOpen, onClose, onConfirm, student }: TrashReasonModalProps) {
  const [reason, setReason] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setReason("");
    } else {
      setTimeout(() => setIsAnimating(false), 200); // fade out duration
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const isValid = reason.trim().length >= 10;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(reason.trim());
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className={`relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4">
          <div className="bg-red-100 p-3 rounded-xl flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 pt-1">
            <h3 className="text-xl font-bold text-slate-800">Move Student to Trash?</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              This action will move the student record to trash. You can restore it later.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Student Info Chip */}
          {student && (
            <div className="bg-slate-50 rounded-lg p-3 flex flex-wrap items-center gap-x-4 gap-y-2 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span className="font-semibold text-slate-700 text-sm">{student.name || 'Unknown Student'}</span>
              </div>
              <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
              <span className="text-sm text-slate-600">{student.department || 'No Dept'}</span>
              <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
              <span className="text-sm font-mono text-slate-500">{student.roll_no || 'No Reg No'}</span>
            </div>
          )}

          {/* Form Field */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <label htmlFor="reason" className="text-sm font-semibold text-slate-700">
                Reason for removal <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${reason.length < 10 ? 'text-slate-500' : 'text-emerald-600 font-medium'}`}>
                {reason.length} / 10 min chars
              </span>
            </div>
            
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Duplicate entry, Graduated, Incorrect data, Student requested removal..."
              className="w-full min-h-[100px] p-3 text-sm text-slate-700 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none transition-all placeholder:text-slate-400"
            />
            
            {reason.length > 0 && reason.trim().length < 10 && (
              <div className="flex items-center gap-1.5 text-amber-600 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Please enter at least 10 characters.</span>
              </div>
            )}
          </div>

          {/* Quick Reasons */}
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quick Select:</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((qr) => (
                <button
                  key={qr}
                  onClick={() => setReason(qr)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-full transition-colors active:scale-95"
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#EF4444] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            Move to Trash
          </button>
        </div>
      </div>
    </div>
  );
}
