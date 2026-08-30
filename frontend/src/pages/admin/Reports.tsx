import { useState, useEffect } from "react";
import { Download, FileSpreadsheet, Building2, Users, CheckCircle, XCircle, Eye, X } from "lucide-react";
import api from "../../lib/api";

export function Reports() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewTitle, setPreviewTitle] = useState("");
  
  // Department Report State
  const [selectedDepartment, setSelectedDepartment] = useState("CSE");
  const [selectedDeptStatus, setSelectedDeptStatus] = useState("all");

  const fetchCompanies = async () => {
    try {
      const res = await api.get("/companies");
      setCompanies(res.data);
      if (res.data.length > 0) {
        setSelectedCompanyId(res.data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleDownload = async (endpoint: string, filename: string) => {
    setIsDownloading(true);
    try {
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error);
      alert("Failed to download report. It might be empty.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async (endpoint: string, title: string) => {
    setPreviewTitle(title);
    setShowPreviewModal(true);
    setPreviewLoading(true);
    setPreviewData([]);
    setPreviewColumns([]);
    
    try {
      const res = await api.get(endpoint);
      setPreviewColumns(res.data.columns || []);
      setPreviewData(res.data.data || []);
    } catch (error) {
      console.error(`Failed to load preview for ${title}:`, error);
      alert("Failed to load preview. It might be empty.");
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Overall Company Data */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Building2 className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Overall Company Data</h3>
              <p className="text-sm text-muted-foreground">List of all recruiting companies with their details.</p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground">Formats: .xlsx</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePreview('/reports/preview/companies', 'Overall Company Data')}
                className="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button 
                onClick={() => handleDownload('/reports/export/companies', 'Companies_Report.xlsx')}
                disabled={isDownloading}
                className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Overall Student Data */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Overall Student Data</h3>
              <p className="text-sm text-muted-foreground">Master list of all students registered for placements.</p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground">Formats: .xlsx</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePreview('/reports/preview/students/all', 'Overall Student Data')}
                className="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button 
                onClick={() => handleDownload('/reports/export/students/all', 'Overall_Students.xlsx')}
                disabled={isDownloading}
                className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Students Selected Yet */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Students Selected (Placed)</h3>
              <p className="text-sm text-muted-foreground">List of all students who have secured an offer.</p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground">Formats: .xlsx</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePreview('/reports/preview/students/placed', 'Students Selected (Placed)')}
                className="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button 
                onClick={() => handleDownload('/reports/export/students/placed', 'Selected_Students.xlsx')}
                disabled={isDownloading}
                className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Students Not Selected Yet */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <XCircle className="h-6 w-6 text-orange-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Students Yet to be Placed</h3>
              <p className="text-sm text-muted-foreground">List of all students who have not secured an offer yet.</p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground">Formats: .xlsx</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePreview('/reports/preview/students/unplaced', 'Students Yet to be Placed')}
                className="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button 
                onClick={() => handleDownload('/reports/export/students/unplaced', 'Unplaced_Students.xlsx')}
                disabled={isDownloading}
                className="flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Students Selected in Individual Company */}
        <div className="md:col-span-2 rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Company-wise Selection Report</h3>
              <p className="text-sm text-muted-foreground">Download the selected students list for a specific company.</p>
            </div>
          </div>
          <div className="pt-4 flex items-center justify-between border-t border-border">
            <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Select Company:</label>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full md:w-64"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <button 
              onClick={() => {
                if(!selectedCompanyId) return;
                const cname = companies.find(c => c.id === selectedCompanyId)?.name || 'Company';
                handlePreview(`/reports/preview/students/company/${selectedCompanyId}`, `Company Selection - ${cname}`);
              }}
              disabled={!selectedCompanyId || isDownloading}
              className="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
              <button 
                onClick={() => {
                  if(!selectedCompanyId) return;
                  const cname = companies.find(c => c.id === selectedCompanyId)?.name || 'Company';
                  handleDownload(`/reports/export/students/company/${selectedCompanyId}`, `Selected_Students_${cname.replace(/ /g, '_')}.xlsx`);
                }}
                disabled={!selectedCompanyId || isDownloading}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Report
              </button>
            </div>
          </div>

        {/* Department-wise Report */}
        <div className="md:col-span-2 rounded-xl border bg-card text-card-foreground shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <Users className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Department-wise Report</h3>
              <p className="text-sm text-muted-foreground">Download the students list for a specific department.</p>
            </div>
          </div>
          <div className="pt-4 flex flex-col md:flex-row items-start md:items-center justify-between border-t border-border gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Department:</label>
                <input
                  type="text"
                  placeholder="e.g. CSE"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full md:w-32"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Status:</label>
                <select
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full md:w-40"
                  value={selectedDeptStatus}
                  onChange={(e) => setSelectedDeptStatus(e.target.value)}
                >
                  <option value="all">Overall (All)</option>
                  <option value="placed">Placed</option>
                  <option value="unplaced">Not Placed</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 w-full md:w-auto">
              <button 
                onClick={() => {
                  if(!selectedDepartment) return;
                  handlePreview(`/reports/preview/students/department/${encodeURIComponent(selectedDepartment)}?status=${selectedDeptStatus}`, `Department Report - ${selectedDepartment} (${selectedDeptStatus})`);
                }}
                disabled={!selectedDepartment || isDownloading}
                className="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button 
                onClick={() => {
                  if(!selectedDepartment) return;
                  handleDownload(`/reports/export/students/department/${encodeURIComponent(selectedDepartment)}?status=${selectedDeptStatus}`, `${selectedDepartment}_${selectedDeptStatus}_Students.xlsx`);
                }}
                disabled={!selectedDepartment || isDownloading}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Download Report
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-500" /> 
                {previewTitle}
              </h2>
              <button 
                onClick={() => setShowPreviewModal(false)} 
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {previewLoading ? (
                <div className="flex items-center justify-center h-64 text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="font-medium text-sm">Loading Preview Data...</p>
                  </div>
                </div>
              ) : previewData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-slate-500 font-medium">
                  No data available for this report.
                </div>
              ) : (
                <div className="w-full">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-slate-600 font-bold uppercase tracking-wider bg-slate-100 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        {previewColumns.map((col, idx) => (
                          <th key={idx} className="py-3 px-4 border-r border-slate-200 last:border-0">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.map((row, r_idx) => (
                        <tr key={r_idx} className="hover:bg-slate-50 transition-colors">
                          {previewColumns.map((col, c_idx) => (
                            <td key={c_idx} className="py-2.5 px-4 text-slate-700 border-r border-slate-100 last:border-0">
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Preview showing {previewData.length} records.</span>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 font-medium hover:bg-slate-100"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
