import React, { useState, useRef } from "react";
import { Upload, X, FileText, Check, Users, AlertCircle } from "lucide-react";
import api from "../../lib/api";

interface DriveDataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  type: 'attended' | 'placed';
  onSuccess: () => void;
}

export function DriveDataUploadModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  type,
  onSuccess
}: DriveDataUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
  const [file, setFile] = useState<File | null>(null);
  const [manualData, setManualData] = useState("");
  const [ctc, setCtc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError("");
    }
  };

  const manualCount = manualData
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0).length;

  const handleSubmit = async () => {
    setError("");
    if (activeTab === 'excel' && !file) {
      setError("Please select an Excel or CSV file.");
      return;
    }
    if (activeTab === 'manual' && manualCount === 0) {
      setError("Please enter at least one valid roll number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (activeTab === 'excel' && file) {
        formData.append("file", file);
      } else if (activeTab === 'manual') {
        formData.append("manual_data", manualData);
      }
      
      if (type === 'placed' && ctc) {
        formData.append("ctc", ctc);
      }

      await api.post(`/companies/${companyId}/upload-drive-data?type=${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload data. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === 'attended' 
    ? `Upload Attended Students - ${companyName}`
    : `Upload Selected / Placed Students - ${companyName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('excel')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'excel' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Upload Excel
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'manual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Add Manually
            </button>
          </div>

          {activeTab === 'excel' ? (
            <div 
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                {file ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>
              <h3 className="font-semibold text-slate-700 mb-1">
                {file ? file.name : "Click or drag file here"}
              </h3>
              <p className="text-slate-500 text-sm">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports .xlsx, .xls, .csv"}
              </p>
              {!file && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-md text-left w-full">
                  <p className="font-semibold mb-1">Expected format:</p>
                  <p>Excel must contain a column named <strong>RollNo</strong> (or Email / Student Name fallback).</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Paste comma-separated Roll Numbers
              </label>
              <textarea
                className="w-full h-32 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                placeholder="e.g. RGU001, RGU002, RGU003..."
                value={manualData}
                onChange={(e) => setManualData(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                Total parsed: <span className="font-bold text-slate-700">{manualCount}</span>
              </div>
            </div>
          )}

          {type === 'placed' && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Package / CTC (LPA) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 15.5"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (activeTab === 'excel' ? !file : manualCount === 0)}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save {type === 'attended' ? 'Attended' : 'Placed'} Data
          </button>
        </div>
      </div>
    </div>
  );
}
