import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, Plus, Download, Trash2, ExternalLink, Upload, FileText, Eye, X, MapPin, Edit2, Users } from "lucide-react";
import api from "../../lib/api";

export function TeamManagement() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [companies, setCompanies] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState("");
  const [memberFormData, setMemberFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "Manager"
  });

  // File Upload State
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "", location: "", website: "", contact_person: "", phone: "", email: "", size: "", status: "COLD", address: "", ctc_lpa: ""
  });
  
  const [isUploadingCompanyExcel, setIsUploadingCompanyExcel] = useState(false);
  const companyExcelInputRef = useRef<HTMLInputElement>(null);
  
  const [jdInputRef, studentInputRef] = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);

  const handleEditCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompany) return;
    const payload = {
      name: editCompany.name,
      location: editCompany.location || "",
      website: editCompany.website || "",
      contact_person: editCompany.contact_person || "",
      phone: editCompany.phone || "",
      email: editCompany.email || "",
      size: editCompany.size || "",
      status: editCompany.status || "COLD",
      address: editCompany.address || "",
      ctc_lpa: editCompany.ctc_lpa || ""
    };
    try {
      await api.put(`/companies/${editCompany.id}`, payload);
      alert("Company updated successfully!");
      setShowEditCompanyModal(false);
      setEditCompany(null);
      fetchCompanies();
    } catch (error) {
      console.error("Failed to update company:", error);
      alert("Failed to update company");
    }
  };

  // Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewTitle, setPreviewTitle] = useState("");
  
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);

  const [showMapModal, setShowMapModal] = useState(false);
  const [mapAddress, setMapAddress] = useState("");

  const [showJdModal, setShowJdModal] = useState(false);
  const [jdUrl, setJdUrl] = useState("");

  const [stagedStatusChanges, setStagedStatusChanges] = useState<{ [key: string]: string }>({});

  const fetchCompanies = async () => {
    try {
      const res = await api.get("/companies");
      setCompanies(res.data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchMembers();
  }, []);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/companies", newCompany);
      setIsModalOpen(false);
      setNewCompany({ name: "", location: "", website: "", contact_person: "", phone: "", email: "", size: "", status: "COLD", address: "", ctc_lpa: "" });
      fetchCompanies();
    } catch (error) {
      console.error("Failed to add company:", error);
      alert("Failed to add company");
    }
  };

  const handlePreviewStudents = async (companyId: string, companyName: string, selectedCount: number) => {
    setSelectedCompanyId(companyId);
    setPreviewTitle(`Selected Students - ${companyName}`);
    setShowPreviewModal(true);
    setPreviewLoading(true);
    setPreviewData([]);
    setPreviewColumns([]);

    if (selectedCount === 0) {
      setPreviewLoading(false);
      return;
    }

    try {
      const res = await api.get(`/reports/preview/students/company/${companyId}`);
      setPreviewColumns(res.data.columns || []);
      setPreviewData(res.data.data || []);
    } catch (error: any) {
      console.error("Failed to load preview:", error);
      if (error.response?.status !== 404) {
        alert("Failed to load preview data.");
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const [showRegPreviewModal, setShowRegPreviewModal] = useState(false);
  const [regPreviewData, setRegPreviewData] = useState<any[]>([]);
  const [regFilter, setRegFilter] = useState("ALL");
  const [regPreviewCompanyStatus, setRegPreviewCompanyStatus] = useState<string>("");
  const [showManualRegModal, setShowManualRegModal] = useState(false);
  const [manualRegRollNumbers, setManualRegRollNumbers] = useState("");
  
  const [showManualSelectedModal, setShowManualSelectedModal] = useState(false);
  const [manualSelectedRollNumbers, setManualSelectedRollNumbers] = useState("");
  const [manualSelectedCTC, setManualSelectedCTC] = useState("");
  
  const [selectedPreviewSearch, setSelectedPreviewSearch] = useState("");
  
  const [showBulkAttendManualModal, setShowBulkAttendManualModal] = useState(false);
  const [bulkAttendRollNumbers, setBulkAttendRollNumbers] = useState("");
  const bulkAttendInputRef = useRef<HTMLInputElement>(null);

  const handlePreviewRegisteredStudents = async (companyId: string, companyName: string, companyStatus: string = "") => {
    setSelectedCompanyId(companyId);
    setPreviewTitle(`Registered Students - ${companyName}`);
    setRegPreviewCompanyStatus(companyStatus);
    setShowRegPreviewModal(true);
    setPreviewLoading(true);
    setRegPreviewData([]);
    
    try {
      const res = await api.get(`/companies/${companyId}/registered_students`);
      setRegPreviewData(res.data.students || []);
      setRegFilter("ALL");
    } catch (error) {
      console.error("Failed to load registered preview:", error);
      alert("Failed to load registered students.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleManualRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    try {
      const rolls = manualRegRollNumbers.split(",").map(r => r.trim()).filter(r => r);
      if (rolls.length === 0) return alert("Please enter at least one roll number.");
      await api.post(`/companies/${selectedCompanyId}/registered_students/manual`, { roll_numbers: rolls });
      alert("Registered students added successfully!");
      setShowManualRegModal(false);
      setManualRegRollNumbers("");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to add registered students.");
    }
  };

  const handleManualSelectedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    try {
      const lines = manualSelectedRollNumbers.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return alert("Please enter at least one roll number.");
      
      const students = lines.map(line => {
        // Assume format: RollNo, CTC or just RollNo if CTC is global
        // Wait, the user asked for Roll No and CTC. I'll split by comma if present, else use global CTC
        const parts = line.split(',');
        return {
          roll_no: parts[0].trim(),
          ctc_lpa: parts.length > 1 ? parts[1].trim() : manualSelectedCTC.trim()
        };
      });

      await api.post(`/companies/${selectedCompanyId}/placed_students/manual`, { students });
      alert("Selected students added successfully!");
      setShowManualSelectedModal(false);
      setManualSelectedRollNumbers("");
      setManualSelectedCTC("");
      fetchCompanies(); // Refresh selected_count
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to add selected students.");
    }
  };

  const toggleStudentAttendance = async (rollNo: string, currentStatus: boolean) => {
    if (!selectedCompanyId) return;
    try {
      await api.patch(`/companies/${selectedCompanyId}/registered_students/${rollNo}/attendance`, {
        attended: !currentStatus
      });
      // update local state
      setRegPreviewData(prev => prev.map(s => s.roll_no === rollNo ? { ...s, attended: !currentStatus } : s));
    } catch (error) {
      alert("Failed to update attendance.");
    }
  };

  const handleBulkAttendManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId || !bulkAttendRollNumbers.trim()) return;

    try {
      const rollNumbers = bulkAttendRollNumbers.split(',').map(r => r.trim()).filter(r => r);
      await api.post(`/companies/${selectedCompanyId}/registered_students/attend_bulk/manual`, {
        roll_numbers: rollNumbers
      });
      alert("Successfully updated attendance.");
      setShowBulkAttendManualModal(false);
      setBulkAttendRollNumbers("");
      handlePreviewRegisteredStudents(selectedCompanyId, previewTitle.replace("Registered Students - ", ""), regPreviewCompanyStatus);
    } catch (error: any) {
      console.error("Failed to bulk update manual attendance:", error);
      alert(error.response?.data?.detail || "Failed to update attendance");
    }
  };

  const handleBulkAttendUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompanyId) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post(`/companies/${selectedCompanyId}/registered_students/attend_bulk/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(res.data.message || "Successfully uploaded attendance.");
      handlePreviewRegisteredStudents(selectedCompanyId, previewTitle.replace("Registered Students - ", ""), regPreviewCompanyStatus);
    } catch (error: any) {
      console.error("Failed to upload attendance Excel:", error);
      alert(error.response?.data?.detail || "Failed to upload file");
    }
    if (bulkAttendInputRef.current) bulkAttendInputRef.current.value = "";
  };

  const fetchMembers = () => {
    api.get("/team/members")
      .then(res => setTeamMembers(res.data.members || []))
      .catch(err => console.error("Error fetching members:", err));
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      full_name: memberFormData.full_name,
      email: memberFormData.email,
      password: memberFormData.password,
      role: memberFormData.role,
      access_levels: [] as string[]
    };
    api.post("/team/members", payload)
      .then(() => {
        alert("Team member added successfully!");
        setMemberFormData({ full_name: "", email: "", password: "", role: "Manager" });
        setShowAddMemberModal(false);
        fetchMembers();
      })
      .catch((err: any) => alert("Failed to add member: " + (err.response?.data?.detail || err.message)));
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    api.put(`/team/members/${editingEmail}`, {
      full_name: memberFormData.full_name,
      role: memberFormData.role,
      access_levels: [] as string[]
    })
      .then(() => {
        alert("Team member updated successfully!");
        setShowEditMemberModal(false);
        fetchMembers();
      })
      .catch((err: any) => alert("Failed to update member: " + (err.response?.data?.detail || err.message)));
  };

  const handleDeleteMember = (email: string) => {
    if(window.confirm(`Are you sure you want to delete ${email}?`)) {
      api.delete(`/team/members/${email}`)
        .then(() => fetchMembers())
        .catch(() => alert("Failed to delete member"));
    }
  };

  const { role } = useOutletContext<{ role: string }>();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isPlacementLead = role === "placement_lead";
  const canEditCompany = isAdmin || isManager || isPlacementLead;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return;
    try {
      await api.delete(`/companies/${id}`);
      fetchCompanies();
    } catch (error) {
      console.error("Failed to delete company:", error);
      alert("Failed to delete company");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      if (isAdmin) {
        await api.patch(`/companies/${id}/status`, { status: newStatus });
      } else {
        await api.patch(`/companies/${id}/status/request`, { status: newStatus });
        alert("Status change requested and sent for Admin approval.");
      }
      fetchCompanies();
      setStagedStatusChanges(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status");
    }
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    try {
      await api.put(`/companies/placed_students/${editStudent._id}`, editStudent);
      alert("Student updated successfully!");
      setShowEditStudentModal(false);
      if (selectedCompanyId) {
        handlePreviewStudents(selectedCompanyId, previewTitle.replace("Selected Students - ", ""), previewData.length);
      }
    } catch (error) {
      console.error("Failed to update student:", error);
      alert("Failed to update student");
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student from this company?")) return;
    try {
      await api.delete(`/companies/placed_students/${studentId}`);
      if (selectedCompanyId) {
        handlePreviewStudents(selectedCompanyId, previewTitle.replace("Selected Students - ", ""), previewData.length - 1);
      }
      fetchCompanies();
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert("Failed to delete student");
    }
  };

  const handleUploadCompanyExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      alert("Please upload an Excel (.xlsx) or CSV (.csv) file.");
      if (companyExcelInputRef.current) companyExcelInputRef.current.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingCompanyExcel(true);
    try {
      // Using fetch instead of axios to avoid boundary issues
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/companies/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to upload companies');
      
      alert(data.message || "Companies uploaded successfully!");
      fetchCompanies();
    } catch (error: any) {
      console.error("Error uploading companies:", error);
      alert(error.message || "Failed to upload companies.");
    } finally {
      setIsUploadingCompanyExcel(true);
      if (companyExcelInputRef.current) companyExcelInputRef.current.value = '';
      setIsUploadingCompanyExcel(false);
    }
  };

  const handleUploadJD = (companyId: string) => {
    setSelectedCompanyId(companyId);
    if (jdInputRef.current) jdInputRef.current.click();
  };

  const onJDFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !selectedCompanyId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post(`/companies/${selectedCompanyId}/upload_jd`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("JD Uploaded successfully!");
      fetchCompanies();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail;
      alert(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : (errorMsg || "Failed to upload JD"));
    }
    if (jdInputRef.current) jdInputRef.current.value = "";
  };

  const onStudentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !selectedCompanyId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    
    const uploadType = studentInputRef.current?.getAttribute("data-upload-type") || "placed";
    const endpoint = uploadType === "registered" 
      ? `/companies/${selectedCompanyId}/registered_students/upload` 
      : `/companies/${selectedCompanyId}/upload_students`;

    try {
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      fetchCompanies();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail;
      alert(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : (errorMsg || "Failed to upload students"));
    }
    if (studentInputRef.current) studentInputRef.current.value = "";
  };

  const handleDownloadStudents = async (companyId: string, companyName: string) => {
    try {
      const res = await api.get(`/companies/${companyId}/download_students`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `placed_students_${companyName.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to download students:", error);
      alert("Failed to download students. Did you upload the data first?");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case 'COLD': return 'bg-slate-100 text-slate-700 border-slate-200 focus:ring-slate-200';
      case 'WARM': return 'bg-yellow-100 text-yellow-700 border-yellow-200 focus:ring-yellow-200';
      case 'HOT': return 'bg-red-100 text-red-700 border-red-200 focus:ring-red-200';
      case 'DRIVE COMPLETED': return 'bg-green-100 text-green-700 border-green-200 focus:ring-green-200';
      default: return 'bg-gray-100 text-gray-700 focus:ring-gray-200';
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || c.status.toUpperCase() === filter;
    return matchesSearch && matchesFilter;
  });

  const [activeTab, setActiveTab] = useState<'pipeline' | 'approvals'>('pipeline');
  const [statusRequests, setStatusRequests] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  const fetchStatusRequests = async () => {
    try {
      const res = await api.get("/companies/status_requests");
      setStatusRequests(res.data);
      const historyRes = await api.get("/companies/status_requests/history");
      setStatusHistory(historyRes.data);
    } catch (error) {
      console.error("Failed to fetch status requests:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStatusRequests();
    }
  }, [isAdmin]);

  const handleApproveStatus = async (id: string) => {
    try {
      await api.post(`/companies/${id}/status/approve`);
      fetchStatusRequests();
      fetchCompanies();
    } catch (err) {
      alert("Failed to approve status");
    }
  };

  const handleRejectStatus = async (id: string) => {
    try {
      await api.post(`/companies/${id}/status/reject`);
      fetchStatusRequests();
      fetchCompanies();
    } catch (err) {
      alert("Failed to reject status");
    }
  };

  return (
    <div className="space-y-6 relative">
      <input type="file" className="hidden" ref={jdInputRef} accept=".pdf,.doc,.docx" onChange={onJDFileChange} />
      <input type="file" className="hidden" ref={studentInputRef} accept=".xlsx,.csv" onChange={onStudentFileChange} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Placement Team & Industry</h1>
          {isAdmin && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'pipeline' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'approvals' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Approvals {statusRequests.length > 0 && <span className="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-xs">{statusRequests.length}</span>}
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            ref={companyExcelInputRef} 
            className="hidden" 
            accept=".xlsx,.csv" 
            onChange={handleUploadCompanyExcel} 
          />
          {canEditCompany && (
            <>
              <button 
                onClick={() => companyExcelInputRef.current?.click()}
                disabled={isUploadingCompanyExcel}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                <Upload className="h-4 w-4" /> 
                {isUploadingCompanyExcel ? "Uploading..." : "Upload Excel"}
              </button>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Company
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setShowTeamModal(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Users className="h-4 w-4" /> Manage Team
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <div className="relative w-full md:flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-secondary p-1 rounded-md w-full md:w-auto">
          {['ALL', 'COLD', 'WARM', 'HOT', 'REGISTERED', 'DRIVE COMPLETED'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filter === f ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'approvals' && isAdmin ? (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Pending Status Approvals</h2>
          </div>
          {statusRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No pending approvals</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Current Status</th>
                    <th className="px-4 py-3 font-medium">Requested Status</th>
                    <th className="px-4 py-3 font-medium">Requested By</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statusRequests.map(req => (
                    <tr key={req.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-semibold">{req.name}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${getStatusColor(req.status)}`}>{req.status}</span></td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${getStatusColor(req.pending_status)}`}>{req.pending_status}</span></td>
                      <td className="px-4 py-3 text-slate-600">{req.status_requested_by} ({req.status_requested_role})</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {req.jd_url && (
                            <button onClick={() => { setJdUrl(`http://localhost:8000${req.jd_url}`); setShowJdModal(true); }} className="text-xs font-medium bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 flex items-center gap-1">
                              <FileText className="h-3 w-3" /> View JD
                            </button>
                          )}
                          <button onClick={() => handleApproveStatus(req.id)} className="text-xs font-medium bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200">Approve</button>
                          <button onClick={() => handleRejectStatus(req.id)} className="text-xs font-medium bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Approval History Section */}
          <div className="mt-8 border-t border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Approval History</h2>
              <p className="text-sm text-slate-500">Record of previously approved or rejected status requests</p>
            </div>
            {statusHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No approval history found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Company</th>
                      <th className="px-4 py-3 font-medium">Requested Status</th>
                      <th className="px-4 py-3 font-medium">Requested By</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Resolved By</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {statusHistory.map((req, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-semibold">{req.company_name}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${getStatusColor(req.requested_status)}`}>{req.requested_status}</span></td>
                        <td className="px-4 py-3 text-slate-600">{req.requested_by}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold ${req.action === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>{req.action}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{req.resolved_by}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(req.resolved_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium min-w-[150px]">Address</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium text-center">Map</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium text-center">CTC (LPA)</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.map((company) => (
              <tr key={company.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-base flex items-center gap-2">
                    {company.name}
                    {company.website && (
                      <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{company.size} employees</div>
                  {company.created_by && (
                    <div className="text-[10px] text-blue-500 font-medium mt-1">
                      Added by {company.created_by.name} ({company.created_by.role})
                    </div>
                  )}
                  {company.jd_url && (
                    <button onClick={() => { setJdUrl(`http://localhost:8000${company.jd_url}`); setShowJdModal(true); }} className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1 bg-transparent border-0 p-0 cursor-pointer">
                      <FileText className="h-3 w-3"/> View JD
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 truncate max-w-[150px]" title={company.address || company.location}>{company.address || '-'}</td>
                <td className="px-4 py-3">{company.location || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => { setMapAddress(company.address || company.location || ''); setShowMapModal(true); }}
                    className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
                    title="View on Map"
                  >
                    <MapPin className="h-4 w-4" />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{company.contact_person}</div>
                  <div className="text-xs text-muted-foreground">
                    {[company.email, company.phone].filter(Boolean).join(' • ')}
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-medium">
                  {company.ctc_lpa || '-'}
                </td>
                <td className="px-4 py-3">
                  {company.pending_status ? (
                    <span className="text-xs font-semibold rounded-full border px-2.5 py-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                      Pending: {company.pending_status}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-1.5 items-center">
                      <select
                        value={stagedStatusChanges[company.id] || company.status.toUpperCase()}
                        onChange={(e) => {
                          if (isAdmin) {
                            handleStatusChange(company.id, e.target.value);
                          } else {
                            if (e.target.value === company.status.toUpperCase()) {
                              setStagedStatusChanges(prev => {
                                const next = { ...prev };
                                delete next[company.id];
                                return next;
                              });
                            } else {
                              setStagedStatusChanges(prev => ({ ...prev, [company.id]: e.target.value }));
                            }
                          }
                        }}
                        disabled={!canEditCompany}
                        className={`text-xs font-semibold rounded-full border px-2.5 py-1 focus:outline-none focus:ring-2 ${canEditCompany ? 'cursor-pointer' : 'cursor-default opacity-80'} ${getStatusColor(stagedStatusChanges[company.id] || company.status)}`}
                      >
                        <option value="COLD">COLD</option>
                        <option value="WARM">WARM</option>
                        <option value="HOT">HOT</option>
                        <option value="REGISTERED">REGISTERED</option>
                        <option value="DRIVE COMPLETED">DRIVE COMPLETED</option>
                      </select>
                      {stagedStatusChanges[company.id] && !isAdmin && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <button
                            onClick={() => handleStatusChange(company.id, stagedStatusChanges[company.id])}
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold transition-colors shadow-sm"
                          >
                            Get Verified
                          </button>
                          <button
                            onClick={() => setStagedStatusChanges(prev => {
                              const next = { ...prev };
                              delete next[company.id];
                              return next;
                            })}
                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-0.5 rounded text-[10px] font-bold transition-colors shadow-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {(((company.status.toUpperCase() === 'HOT' || stagedStatusChanges[company.id] === 'HOT' || company.pending_status === 'HOT') && canEditCompany) || 
                      ((company.status.toUpperCase() === 'REGISTERED' || stagedStatusChanges[company.id] === 'REGISTERED' || company.pending_status === 'REGISTERED') && isAdmin)) && (
                      <button onClick={() => handleUploadJD(company.id)} className="flex items-center gap-1 text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1.5 rounded hover:bg-secondary/80">
                        <Upload className="h-3 w-3" />
                        JD
                      </button>
                    )}
                    {(company.status.toUpperCase() === 'REGISTERED' || stagedStatusChanges[company.id] === 'REGISTERED' || company.pending_status === 'REGISTERED') && (
                      <>
                        {canEditCompany && (
                          <>
                            <button onClick={() => {
                              setSelectedCompanyId(company.id);
                              if (studentInputRef.current) {
                                studentInputRef.current.setAttribute("data-upload-type", "registered");
                                studentInputRef.current.click();
                              }
                            }} className="flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1.5 rounded hover:bg-purple-200">
                              <Upload className="h-3 w-3" />
                              Reg Data
                            </button>
                            <button onClick={() => {
                              setSelectedCompanyId(company.id);
                              setShowManualRegModal(true);
                            }} className="flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1.5 rounded hover:bg-purple-200">
                              <Plus className="h-3 w-3" />
                              Add Manually
                            </button>
                          </>
                        )}
                        <button onClick={() => handlePreviewRegisteredStudents(company.id, company.name, company.status)} className="flex items-center gap-1 text-xs font-medium bg-white border border-slate-200 text-slate-700 px-2 py-1.5 rounded hover:bg-slate-50 shadow-sm">
                          <Eye className="h-3 w-3" />
                          Reg Students
                        </button>
                      </>
                    )}
                    {company.status.toUpperCase() === 'DRIVE COMPLETED' && (
                      <>
                        {canEditCompany && (
                          <>
                            <button onClick={() => {
                              setSelectedCompanyId(company.id);
                              if (studentInputRef.current) {
                                studentInputRef.current.setAttribute("data-upload-type", "placed");
                                studentInputRef.current.click();
                              }
                            }} className="flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1.5 rounded hover:bg-blue-200">
                              <Upload className="h-3 w-3" />
                              Placed Data
                            </button>
                            <button onClick={() => {
                              setSelectedCompanyId(company.id);
                              setShowManualSelectedModal(true);
                            }} className="flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1.5 rounded hover:bg-blue-200">
                              <Plus className="h-3 w-3" />
                              Selected (Manual)
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDownloadStudents(company.id, company.name)} className="flex items-center gap-1 text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1.5 rounded hover:bg-secondary/80">
                          <Download className="h-3 w-3" />
                          Selected ({company.selected_count || 0})
                        </button>
                        <button onClick={() => handlePreviewStudents(company.id, company.name, company.selected_count || 0)} className="flex items-center gap-1 text-xs font-medium bg-white border border-slate-200 text-slate-700 px-2 py-1.5 rounded hover:bg-slate-50 shadow-sm">
                          <Eye className="h-3 w-3" />
                          Placed Students
                        </button>
                      </>
                    )}
                    {canEditCompany && (
                      <>
                        <button onClick={() => { setEditCompany(company); setShowEditCompanyModal(true); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Edit Company">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDelete(company.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors" title="Delete Company">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredCompanies.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No companies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Add New Company</h2>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Company Name *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Address</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Full Address" value={newCompany.address} onChange={e => setNewCompany({...newCompany, address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Location *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. Bangalore, Karnataka" value={newCompany.location} onChange={e => setNewCompany({...newCompany, location: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">CTC (LPA)</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. 10-12" value={newCompany.ctc_lpa} onChange={e => setNewCompany({...newCompany, ctc_lpa: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Official Website</label>
                <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.website} onChange={e => setNewCompany({...newCompany, website: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Contact Person *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.contact_person} onChange={e => setNewCompany({...newCompany, contact_person: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone Number *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email ID *</label>
                  <input required type="email" className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.email} onChange={e => setNewCompany({...newCompany, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Company Size</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. 1000+" value={newCompany.size} onChange={e => setNewCompany({...newCompany, size: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.status} onChange={e => setNewCompany({...newCompany, status: e.target.value})}>
                  <option value="COLD">COLD - Not yet connected</option>
                  <option value="WARM">WARM - Contacted</option>
                  <option value="HOT">HOT - JD Received</option>
                  <option value="DRIVE COMPLETED">DRIVE COMPLETED</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium border hover:bg-muted">Cancel</button>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditCompanyModal && editCompany && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Company</h2>
              <button onClick={() => setShowEditCompanyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditCompanySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Company Name *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.name} onChange={e => setEditCompany({...editCompany, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Address</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Full Address" value={editCompany.address || ""} onChange={e => setEditCompany({...editCompany, address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Location *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.location || ""} onChange={e => setEditCompany({...editCompany, location: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Website</label>
                  <input type="url" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.website || ""} onChange={e => setEditCompany({...editCompany, website: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Contact Person *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.contact_person || ""} onChange={e => setEditCompany({...editCompany, contact_person: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.phone || ""} onChange={e => setEditCompany({...editCompany, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.email || ""} onChange={e => setEditCompany({...editCompany, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Company Size</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. 1000-5000" value={editCompany.size || ""} onChange={e => setEditCompany({...editCompany, size: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm bg-white" value={editCompany.status || "COLD"} onChange={e => setEditCompany({...editCompany, status: e.target.value})}>
                    <option value="COLD">COLD</option>
                    <option value="WARM">WARM</option>
                    <option value="HOT">HOT</option>
                    <option value="DRIVE COMPLETED">DRIVE COMPLETED</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">CTC (in LPA)</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. 12" value={editCompany.ctc_lpa || ""} onChange={e => setEditCompany({...editCompany, ctc_lpa: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowEditCompanyModal(false)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-500" /> 
                {previewTitle}
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search Name or Roll No..."
                  value={selectedPreviewSearch}
                  onChange={(e) => setSelectedPreviewSearch(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
                <button 
                  onClick={() => setShowPreviewModal(false)} 
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
                  <div className="text-center">
                    <div className="bg-slate-100 p-4 rounded-full inline-block mb-3">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <p>No selected students data available for this company.</p>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-slate-600 font-bold uppercase tracking-wider bg-slate-100 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        {previewColumns.map((col, idx) => (
                          <th key={idx} className="py-3 px-4 border-r border-slate-200 last:border-0">{col}</th>
                        ))}
                        {previewData[0]?._id && (
                          <th className="py-3 px-4 border-slate-200 text-center">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.filter(row => {
                        if (!selectedPreviewSearch.trim()) return true;
                        const s = selectedPreviewSearch.toLowerCase();
                        return (row.roll_no?.toLowerCase().includes(s) || 
                                row.name?.toLowerCase().includes(s) || 
                                row['Roll No']?.toLowerCase().includes(s) || 
                                row['Name']?.toLowerCase().includes(s));
                      }).map((row, r_idx) => (
                        <tr key={r_idx} className="hover:bg-slate-50 transition-colors">
                          {previewColumns.map((col, c_idx) => (
                            <td key={c_idx} className="py-2.5 px-4 text-slate-700 border-r border-slate-100 last:border-0">
                              {row[col]}
                            </td>
                          ))}
                          {row._id && isAdmin && (
                            <td className="py-2.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => { setEditStudent(row); setShowEditStudentModal(true); }} className="text-blue-500 hover:text-blue-700 p-1">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteStudent(row._id)} className="text-red-500 hover:text-red-700 p-1">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
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

      {/* Edit Student Modal */}
      {showEditStudentModal && editStudent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Student</h2>
              <button onClick={() => setShowEditStudentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditStudentSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editStudent.Name || ""} onChange={e => setEditStudent({...editStudent, Name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Roll No</label>
                <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editStudent["Roll No"] || ""} onChange={e => setEditStudent({...editStudent, "Roll No": e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Department</label>
                <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editStudent.Department || ""} onChange={e => setEditStudent({...editStudent, Department: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Company</label>
                <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editStudent.Company || ""} onChange={e => setEditStudent({...editStudent, Company: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CTC (LPA)</label>
                <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editStudent["CTC (LPA)"] || ""} onChange={e => setEditStudent({...editStudent, "CTC (LPA)": e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowEditStudentModal(false)} className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Registered Student Entry Modal */}
      {showManualRegModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <h2 className="text-lg font-semibold text-slate-800">Add Registered Students</h2>
              <button onClick={() => setShowManualRegModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded p-1 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleManualRegSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Roll Numbers (comma-separated)</label>
                <textarea 
                  required 
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[100px] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" 
                  placeholder="e.g. RCAS2024BIT048, RCAS2024BEC100" 
                  value={manualRegRollNumbers} 
                  onChange={e => setManualRegRollNumbers(e.target.value)} 
                />
                <p className="text-xs text-slate-500">Enter multiple roll numbers separated by commas.</p>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowManualRegModal(false)} className="rounded-md px-4 py-2 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 shadow-sm transition-colors">Add Students</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" /> Map Preview: {mapAddress}
              </h2>
              <button onClick={() => setShowMapModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-0 h-[60vh] w-full bg-slate-100">
              <iframe
                title="Google Maps"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`}
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {/* JD Modal */}
      {showJdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" /> Job Description
              </h2>
              <button onClick={() => setShowJdModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-0 h-[70vh] w-full bg-slate-100">
              <iframe
                title="Job Description"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={jdUrl}
              ></iframe>
            </div>
          </div>
        </div>
      )}

    
{/* Manage Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" /> Placement Team Members
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddMemberModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Member
                </button>
                <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {teamMembers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No team members found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.map((member, idx) => (
                    <div key={idx} className="flex flex-col p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 relative">
                          <div className="relative">
                            <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full bg-slate-100" />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" title="Online"></div>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{member.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              setMemberFormData({ full_name: member.name, email: member.email, password: "", role: member.role });
                              setEditingEmail(member.email);
                              setShowEditMemberModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Edit Member"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {member.email !== 'admin@gmail.com' && (
                            <button 
                              onClick={() => handleDeleteMember(member.email)}
                              className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete Member"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                          member.role.toLowerCase() === 'admin' ? 'bg-red-100 text-red-700' :
                          member.role.toLowerCase() === 'manager' ? 'bg-indigo-100 text-indigo-700' : 
                          member.role.toLowerCase() === 'placement_lead' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {member.role === 'placement_lead' ? 'Placement Lead' : 
                           member.role === 'admin' ? 'Admin' : member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddMemberModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" /> Add Team Member
              </h2>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleMemberSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  value={memberFormData.full_name}
                  onChange={(e) => setMemberFormData({...memberFormData, full_name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email ID</label>
                <input 
                  type="email" 
                  required
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  value={memberFormData.email}
                  onChange={(e) => setMemberFormData({...memberFormData, email: e.target.value})}
                  placeholder="name@university.edu"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <input 
                  type="text"
                  required 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  value={memberFormData.password}
                  onChange={(e) => setMemberFormData({...memberFormData, password: e.target.value})}
                  placeholder="Password"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors appearance-none"
                  value={memberFormData.role}
                  onChange={(e) => setMemberFormData({...memberFormData, role: e.target.value})}
                >
                  <option value="Manager">Manager</option>
                  <option value="placement_lead">Placement Lead</option>
                  <option value="Member">Member</option>
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold h-11 rounded-xl transition-all shadow-md">
                  Create Member Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Member Modal */}
      {showEditMemberModal && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-500" /> Edit Team Member
              </h2>
              <button onClick={() => setShowEditMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  value={memberFormData.full_name}
                  onChange={(e) => setMemberFormData({...memberFormData, full_name: e.target.value})}
                />
              </div>

              <div className="space-y-1.5 opacity-50 cursor-not-allowed">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email ID</label>
                <input 
                  type="email" 
                  disabled
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none bg-slate-100 cursor-not-allowed"
                  value={memberFormData.email}
                />
                <p className="text-[10px] text-slate-400">Email cannot be changed.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                <select 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors appearance-none"
                  value={memberFormData.role}
                  onChange={(e) => setMemberFormData({...memberFormData, role: e.target.value})}
                >
                  <option value="Manager">Manager</option>
                  <option value="placement_lead">Placement Lead</option>
                  <option value="Member">Member</option>
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold h-11 rounded-xl transition-all shadow-md">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Selected Students Modal */}
      {showManualSelectedModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-white shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Add Selected Students Manually</h2>
              <button onClick={() => setShowManualSelectedModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-md shadow-sm border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleManualSelectedSubmit} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Enter students (one per line). Format: <b>RollNo, CTC</b> (or just RollNo if using global CTC below).</p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Global CTC (Optional)</label>
                <input 
                  type="text" 
                  value={manualSelectedCTC} 
                  onChange={e => setManualSelectedCTC(e.target.value)}
                  placeholder="e.g. 8.5 (Applies to all without a specific CTC)"
                  className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Students List</label>
                <textarea 
                  value={manualSelectedRollNumbers} 
                  onChange={e => setManualSelectedRollNumbers(e.target.value)}
                  placeholder="21IT001, 8.5&#10;21IT002, 7.0&#10;21IT003"
                  className="w-full h-32 p-3 text-sm border rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end pt-2 gap-3">
                <button type="button" onClick={() => setShowManualSelectedModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border hover:bg-slate-50 rounded-md">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">
                  Add Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registered Students Preview Modal */}
      {showRegPreviewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-lg border bg-white p-6 shadow-xl my-8 min-h-[50vh]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <h2 className="text-xl font-bold text-slate-800">{previewTitle}</h2>
              <button onClick={() => setShowRegPreviewModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {regPreviewCompanyStatus === 'DRIVE COMPLETED' && (
                  <select 
                    value={regFilter} 
                    onChange={e => setRegFilter(e.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="ALL">All Students</option>
                    <option value="ATTENDED">Attended</option>
                    <option value="NOT_ATTENDED">Not Attended</option>
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                {regPreviewCompanyStatus === 'DRIVE COMPLETED' && (
                  <>
                    <button 
                      onClick={() => setShowBulkAttendManualModal(true)}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700"
                    >
                      <Plus className="h-4 w-4" /> Manual Attend
                    </button>
                    <button 
                      onClick={() => bulkAttendInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium"
                    >
                      <Upload className="h-4 w-4" /> Excel Attend
                    </button>
                    <input 
                      type="file" 
                      ref={bulkAttendInputRef} 
                      className="hidden" 
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                      onChange={handleBulkAttendUpload} 
                    />
                  </>
                )}
              </div>
            </div>

            {previewLoading ? (
              <div className="flex justify-center items-center h-64 text-slate-500">Loading registered students...</div>
            ) : regPreviewData.length === 0 ? (
              <div className="flex justify-center items-center h-64 text-slate-500">No registered students found for this company.</div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Roll No</th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Department</th>
                      <th className="px-4 py-3 font-semibold">Match Status</th>
                      {regPreviewCompanyStatus === 'DRIVE COMPLETED' && (
                        <th className="px-4 py-3 font-semibold text-center">Attended</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {regPreviewData.filter(s => {
                      if (regFilter === "ATTENDED") return s.attended;
                      if (regFilter === "NOT_ATTENDED") return !s.attended;
                      return true;
                    }).map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{student.roll_no}</td>
                        <td className="px-4 py-3">{student.name}</td>
                        <td className="px-4 py-3">{student.department}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${student.match_status === 'Excellent Match' ? 'bg-green-100 text-green-700' : student.match_status === 'Good Match' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                            {student.match_status}
                          </span>
                        </td>
                        {regPreviewCompanyStatus === 'DRIVE COMPLETED' && (
                          <td className="px-4 py-3 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={student.attended || false}
                                onChange={() => toggleStudentAttendance(student.roll_no, student.attended || false)}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Attend Manual Modal */}
      {showBulkAttendManualModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-500" />
                Add Attended Students
              </h2>
              <button onClick={() => setShowBulkAttendManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleBulkAttendManualSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 block">
                  Roll Numbers (comma-separated)
                </label>
                <textarea
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="e.g. 21IT001, 21IT002, 21IT003"
                  value={bulkAttendRollNumbers}
                  onChange={(e) => setBulkAttendRollNumbers(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-500">
                  Enter the roll numbers of the students who attended this drive.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkAttendManualModal(false)}
                  className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-sm transition-colors"
                >
                  Mark Attended
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}