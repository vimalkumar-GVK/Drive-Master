import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { FileText, Check, X, AlertCircle } from "lucide-react";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  isSubmitting: boolean;
}

const RejectModal: React.FC<RejectModalProps> = ({ isOpen, onClose, onConfirm, isSubmitting }) => {
  const [remarks, setRemarks] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (remarks.trim().length < 5) return;
    onConfirm(remarks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Reject Request</h2>
          </div>
          <p className="text-slate-500 text-sm mb-6">
            Please provide a reason for rejecting this request. This will be visible to the requester.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                autoFocus
                className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                rows={4}
                placeholder="E.g., Invalid JD attached, CTC doesn't match..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-slate-400">Minimum 5 characters</span>
                <span className={`text-[10px] ${remarks.length < 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {remarks.length} / 500
                </span>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || remarks.length < 5}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function Approvals() {
  const { role } = useOutletContext<{ role: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historyRequests, setHistoryRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [jdUrl, setJdUrl] = useState<string | null>(null);
  
  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/approvals/list");
      setPendingRequests(res.data.pending || []);
      setHistoryRequests(res.data.history || []);
    } catch (error) {
      console.error("Failed to fetch approvals", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [role]);

  const handleApprove = async (id: string) => {
    if (!window.confirm("Are you sure you want to approve this request?")) return;
    try {
      const endpoint = role === 'admin' ? '/approvals/admin/action' : '/approvals/manager/action';
      await api.post(endpoint, { approvalId: id, action: 'APPROVE', remarks: '' });
      fetchApprovals();
    } catch (err: any) {
      alert("Failed to approve request: " + (err.response?.data?.detail || err.message));
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingId(id);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (remarks: string) => {
    if (!rejectingId) return;
    setIsSubmitting(true);
    try {
      const endpoint = role === 'admin' ? '/approvals/admin/action' : '/approvals/manager/action';
      await api.post(endpoint, { approvalId: rejectingId, action: 'REJECT', remarks });
      setRejectModalOpen(false);
      setRejectingId(null);
      fetchApprovals();
    } catch (err: any) {
      alert("Failed to reject request: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRequestType = (type: string) => {
    if (!type) return "Unknown";
    return type.replace('_VERIFICATION', '').replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Placement Team & Industry</h1>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => navigate(`/${role}/team`)}
              className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors text-slate-600 hover:text-slate-900"
            >
              Pipeline
            </button>
            <button
              className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors bg-white shadow-sm text-slate-900"
            >
              Approvals
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-4 text-sm font-semibold transition-colors relative ${activeTab === 'pending' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
            {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-4 text-sm font-semibold transition-colors relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Approval History
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600"></div>}
          </button>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">Loading...</div>
          ) : activeTab === 'pending' ? (
            pendingRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Check className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
                <p>No pending approvals at the moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Company</th>
                      <th className="px-6 py-4 font-semibold">Request Type</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{req.companyName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${
                            req.type === 'COMPANY_CREATION' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {formatRequestType(req.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold rounded-full border px-2.5 py-1 bg-amber-50 text-amber-700 border-amber-200">
                            {req.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.companyData?.jd_url && (
                              <button
                                onClick={() => setJdUrl(`${window.location.origin === "http://localhost:5173" ? "http://localhost:8000" : ""}${req.companyData.jd_url}`)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
                                title="View JD"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(req.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            historyRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No approval history found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Company</th>
                      <th className="px-6 py-4 font-semibold">Request Type</th>
                      <th className="px-6 py-4 font-semibold">Final Status</th>
                      <th className="px-6 py-4 font-semibold">Resolved By</th>
                      <th className="px-6 py-4 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyRequests.map((req) => {
                      const isApproved = req.status === 'APPROVED_GLOBALLY';
                      const resolvedBy = req.adminAction?.by || req.managerAction?.by || 'System';
                      const remarks = req.adminAction?.remarks || req.managerAction?.remarks || '-';
                      
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{req.companyName}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                              {formatRequestType(req.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold ${isApproved ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isApproved ? 'APPROVED' : 'REJECTED'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{resolvedBy}</td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={remarks}>
                            {remarks}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {jdUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Job Description</h3>
              <button onClick={() => setJdUrl(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100">
              <iframe src={jdUrl} className="w-full h-full min-h-[600px] border-0 rounded bg-white shadow-sm" />
            </div>
          </div>
        </div>
      )}

      <RejectModal 
        isOpen={rejectModalOpen} 
        onClose={() => setRejectModalOpen(false)} 
        onConfirm={handleConfirmReject}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
