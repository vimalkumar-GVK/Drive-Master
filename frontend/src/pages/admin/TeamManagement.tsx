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
      await api.patch(`/companies/${id}/status`, { status: newStatus });
      fetchCompanies();
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

  const handleUploadStudents = (companyId: string) => {
    setSelectedCompanyId(companyId);
    if (studentInputRef.current) studentInputRef.current.click();
  };

  const onStudentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !selectedCompanyId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post(`/companies/${selectedCompanyId}/upload_students`, formData, {
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

  return (
    <div className="space-y-6 relative">
      <input type="file" className="hidden" ref={jdInputRef} accept=".pdf,.doc,.docx" onChange={onJDFileChange} />
      <input type="file" className="hidden" ref={studentInputRef} accept=".xlsx,.csv" onChange={onStudentFileChange} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Recruiters Pipeline</h1>
        
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={companyExcelInputRef} 
            className="hidden" 
            accept=".xlsx,.csv" 
            onChange={handleUploadCompanyExcel} 
          />
          {isAdmin && (
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
              <button 
                onClick={() => setShowTeamModal(true)} 
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors"
              >
                <Users className="h-4 w-4" /> Manage Team
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 bg-secondary p-1 rounded-md">
          {['ALL', 'COLD', 'WARM', 'HOT', 'DRIVE COMPLETED'].map(f => (
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

      <div className="rounded-md border bg-card">
        <table className="w-full text-sm text-left">
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
                  {company.status.toUpperCase() === 'HOT' || company.status.toUpperCase() === 'DRIVE COMPLETED' ? (company.ctc_lpa || '-') : '-'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={company.status.toUpperCase()}
                    onChange={(e) => handleStatusChange(company.id, e.target.value)}
                    disabled={!isAdmin}
                    className={`text-xs font-semibold rounded-full border px-2.5 py-1 focus:outline-none focus:ring-2 ${isAdmin ? 'cursor-pointer' : 'cursor-default opacity-80'} ${getStatusColor(company.status)}`}
                  >
                    <option value="COLD">COLD</option>
                    <option value="WARM">WARM</option>
                    <option value="HOT">HOT</option>
                    <option value="DRIVE COMPLETED">DRIVE COMPLETED</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {company.status.toUpperCase() === 'HOT' && isAdmin && (
                      <button onClick={() => handleUploadJD(company.id)} className="flex items-center gap-1 text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1.5 rounded hover:bg-secondary/80">
                        <Upload className="h-3 w-3" />
                        JD
                      </button>
                    )}
                    {company.status.toUpperCase() === 'DRIVE COMPLETED' && (
                      <>
                        {isAdmin && (
                          <button onClick={() => handleUploadStudents(company.id)} className="flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1.5 rounded hover:bg-blue-200">
                            <Upload className="h-3 w-3" />
                            Data
                          </button>
                        )}
                        <button onClick={() => handleDownloadStudents(company.id, company.name)} className="flex items-center gap-1 text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1.5 rounded hover:bg-secondary/80">
                          <Download className="h-3 w-3" />
                          Selected ({company.selected_count || 0})
                        </button>
                        <button onClick={() => handlePreviewStudents(company.id, company.name, company.selected_count || 0)} className="flex items-center gap-1 text-xs font-medium bg-white border border-slate-200 text-slate-700 px-2 py-1.5 rounded hover:bg-slate-50 shadow-sm">
                          <Eye className="h-3 w-3" />
                          Data
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <button onClick={() => { setEditCompany(company); setShowEditCompanyModal(true); }} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Edit Company">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(company.id)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors" title="Delete Company">
                          <Trash2 className="h-4 w-4" />
                        </button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Add New Company</h2>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Company Name *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.name} onChange={e => setNewCompany({...newCompany, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Address</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Full Address" value={newCompany.address} onChange={e => setNewCompany({...newCompany, address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Contact Person *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.contact_person} onChange={e => setNewCompany({...newCompany, contact_person: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone Number *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={newCompany.phone} onChange={e => setNewCompany({...newCompany, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Company Name *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.name} onChange={e => setEditCompany({...editCompany, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Address</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Full Address" value={editCompany.address || ""} onChange={e => setEditCompany({...editCompany, address: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Location *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.location || ""} onChange={e => setEditCompany({...editCompany, location: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Website</label>
                  <input type="url" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.website || ""} onChange={e => setEditCompany({...editCompany, website: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Contact Person *</label>
                  <input required type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.contact_person || ""} onChange={e => setEditCompany({...editCompany, contact_person: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.phone || ""} onChange={e => setEditCompany({...editCompany, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <input type="email" className="w-full rounded-md border px-3 py-2 text-sm" value={editCompany.email || ""} onChange={e => setEditCompany({...editCompany, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Company Size</label>
                  <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g. 1000-5000" value={editCompany.size || ""} onChange={e => setEditCompany({...editCompany, size: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                      {previewData.map((row, r_idx) => (
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
                          <button 
                            onClick={() => handleDeleteMember(member.email)}
                            className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${member.role.toLowerCase() === 'manager' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                          {member.role}
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
    </div>
  );
}