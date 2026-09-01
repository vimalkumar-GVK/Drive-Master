import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import { Download, X, Search, Filter, Eye, Edit2, Building2, Flame, CheckCircle, GraduationCap, Users, MapPin } from "lucide-react";

interface KanbanCard {
  id: string;
  company: string;
  assigned_name?: string;
  assigned_role?: string;
  has_jd?: boolean;
  students_placed?: number;
  // Mock fields for UI
  location?: string;
  website?: string;
  size?: string;
  status?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  map_url?: string;
  ctc_lpa?: string;
  created_by?: {
    name: string;
    role: string;
    email: string;
  };
}

interface TeamWorkflow {
  cold: KanbanCard[];
  warm: KanbanCard[];
  hot: KanbanCard[];
  completed: KanbanCard[];
}

const getStatusColor = (status: string) => {
  if (status === 'Cold') return 'bg-blue-100 text-blue-700';
  if (status === 'Warm') return 'bg-orange-100 text-orange-700';
  if (status === 'Hot') return 'bg-red-100 text-red-700';
  if (status === 'Drive Completed') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-700';
};

const getStatusDot = (status: string) => {
  if (status === 'Cold') return 'bg-blue-500';
  if (status === 'Warm') return 'bg-orange-500';
  if (status === 'Hot') return 'bg-red-500';
  if (status === 'Drive Completed') return 'bg-emerald-500';
  return 'bg-slate-500';
};

export function RecruiterPipeline() {
  const [workflow, setWorkflow] = useState<TeamWorkflow | null>(null);
  
  const [showPlacedModal, setShowPlacedModal] = useState(false);
  const [placedStudents, setPlacedStudents] = useState<any[]>([]);
  
  const [showRegisteredModal, setShowRegisteredModal] = useState(false);
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  
  const getEmbedUrl = (url?: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/\?id=([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
      }
    }
    return url;
  };
  
  const getImageUrl = (url?: string, name?: string) => {
    if (url && url.trim() !== '') return url;
    const seed = name || 'Student';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=0284c7&textColor=ffffff`;
  };
  
  const isDirectVideo = (url: string) => {
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg');
  };

  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState({
    company: "",
    location: "",
    website: "",
    contact_person: "",
    size: ""
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    location: "",
    website: "",
    contact_person: "",
    phone: "",
    email: "",
    size: "",
    status: "Cold",
    address: "",
    ctc_lpa: ""
  });

  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);

  const [showPreviewCompanyModal, setShowPreviewCompanyModal] = useState(false);
  const [previewCompany, setPreviewCompany] = useState<any>(null);

  const [showMapModal, setShowMapModal] = useState(false);
  const [mapAddress, setMapAddress] = useState("");

  useOutletContext<{ role: string }>();

  const fetchWorkflow = () => {
    api.get("/team/workflow")
      .then(res => {
        setWorkflow(res.data.workflow);
      })
      .catch(err => console.error("Error fetching workflow:", err));
  };

  useEffect(() => {
    fetchWorkflow();
    
  }, []);

  const handleViewPlacedStudents = (companyId: string, companyName: string) => {
    api.get(`/team/companies/${companyId}/placed_students`)
      .then(res => {
        setSelectedCompanyName(companyName);
        setPlacedStudents(res.data.students || []);
        setShowPlacedModal(true);
      })
      .catch(err => console.error("Error fetching placed students:", err));
  };
  
  const handleViewRegisteredStudents = (companyId: string, companyName: string) => {
    api.get(`/companies/${companyId}/registered_students`)
      .then(res => {
        setSelectedCompanyName(companyName);
        setRegisteredStudents(res.data.students || []);
        setShowRegisteredModal(true);
      })
      .catch(err => console.error("Error fetching registered students:", err));
  };
  
  const handleAddCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    api.post("/companies", newCompany)
      .then(() => {
        alert("Company added successfully!");
        setNewCompany({
          name: "", location: "", website: "", contact_person: "", phone: "", email: "", size: "", status: "Cold", address: "", ctc_lpa: ""
        });
        setShowAddCompanyModal(false);
        fetchWorkflow();
      })
      .catch(err => console.error("Error adding company:", err));
  };

  const handleEditCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCompany) return;
    
    // Map KanbanCard fields back to CompanyCreate format
    const payload = {
      name: editCompany.company,
      location: editCompany.location || "",
      website: editCompany.website || "",
      contact_person: editCompany.contact_person || "",
      phone: editCompany.phone || "",
      email: editCompany.email || "",
      size: editCompany.size || "",
      status: editCompany.status || "Cold",
      address: editCompany.address || "",
      ctc_lpa: editCompany.ctc_lpa || ""
    };

    api.put(`/companies/${editCompany.id}`, payload)
      .then(() => {
        alert("Company updated successfully!");
        setShowEditCompanyModal(false);
        setEditCompany(null);
        fetchWorkflow();
      })
      .catch(err => console.error("Error updating company:", err));
  };

  const downloadExcel = () => {
    if (placedStudents.length === 0) return;
    const headers = ["S.No,Roll No,Name,Department,Company,CTC (LPA)"];
    const escapeCsv = (str: any) => `"${String(str).replace(/"/g, '""')}"`;
    const rows = placedStudents.map((s, i) => 
      `${i+1},${escapeCsv(s.roll_no || '')},${escapeCsv(s.name || '')},${escapeCsv(s.department || '')},${escapeCsv(selectedCompanyName || '')},${escapeCsv(s.ctc_lpa || 'N/A')}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedCompanyName}_Placed_Students.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadRegisteredExcel = () => {
    if (registeredStudents.length === 0) return;
    const headers = ["S.No,Roll No,Name,Department,ATS Score,Match Status,Company"];
    const escapeCsv = (str: any) => `"${String(str).replace(/"/g, '""')}"`;
    const rows = registeredStudents.map((s, i) => 
      `${i+1},${escapeCsv(s.roll_no || '')},${escapeCsv(s.name || '')},${escapeCsv(s.department || '')},${escapeCsv((s.ats_score || 0) + '%')},${escapeCsv(s.match_status || 'Unknown')},${escapeCsv(selectedCompanyName || '')}`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedCompanyName}_Registered_Students_ATS.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!workflow) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Placement Team Workflow...</div>;

  // Flatten and mock data for UI
  const allCompanies = [
    ...workflow.cold.map(c => ({...c, status: 'Cold', location: c.location || '', website: c.website || '', size: c.size || '', contact_person: c.contact_person || '', phone: c.phone || '', email: c.email || '', address: c.address || '', map_url: c.map_url || '', ctc_lpa: c.ctc_lpa || '', created_by: c.created_by})),
    ...workflow.warm.map(c => ({...c, status: 'Warm', location: c.location || '', website: c.website || '', size: c.size || '', contact_person: c.contact_person || '', phone: c.phone || '', email: c.email || '', address: c.address || '', map_url: c.map_url || '', ctc_lpa: c.ctc_lpa || '', created_by: c.created_by})),
    ...workflow.hot.map(c => ({...c, status: 'Hot', location: c.location || '', website: c.website || '', size: c.size || '', contact_person: c.contact_person || '', phone: c.phone || '', email: c.email || '', address: c.address || '', map_url: c.map_url || '', ctc_lpa: c.ctc_lpa || '', created_by: c.created_by})),
    ...workflow.completed.map(c => ({...c, status: 'Drive Completed', location: c.location || '', website: c.website || '', size: c.size || '', contact_person: c.contact_person || '', phone: c.phone || '', email: c.email || '', address: c.address || '', map_url: c.map_url || '', ctc_lpa: c.ctc_lpa || '', created_by: c.created_by})),
  ];

  const searchedCompanies = allCompanies.filter(c => {
    const matchesSearch = c.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilters = (
      (filters.company === "" || c.company.toLowerCase().includes(filters.company.toLowerCase())) &&
      (filters.location === "" || (c.location || "").toLowerCase().includes(filters.location.toLowerCase())) &&
      (filters.website === "" || (c.website || "").toLowerCase().includes(filters.website.toLowerCase())) &&
      (filters.contact_person === "" || (c.contact_person || c.assigned_name || "").toLowerCase().includes(filters.contact_person.toLowerCase())) &&
      (filters.size === "" || (c.size || "").toLowerCase().includes(filters.size.toLowerCase()))
    );
    return matchesSearch && matchesFilters;
  });

  const filteredCompanies = filterStatus === "All" 
    ? searchedCompanies 
    : searchedCompanies.filter(c => c.status === filterStatus);
    
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = {
    total: allCompanies.length,
    hot: workflow.hot.length,
    completed: workflow.completed.length,
    studentsPlaced: workflow.completed.reduce((acc, curr) => acc + (curr.students_placed || 0), 0)
  };

  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="pb-12 space-y-6 bg-[#F1F5F9] min-h-full rounded-2xl p-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recruiters Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">Read-only overview of recruiting progress • Last updated: {currentDate}, {currentTime}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600 mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Total Companies</p>
          <h3 className="text-4xl font-bold text-slate-800 mt-1">{stats.total}</h3>
          <p className="text-xs font-bold text-emerald-500 mt-2">&uarr; +2 this month</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-orange-100 rounded-full text-orange-500 mb-3">
            <Flame className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Hot Companies</p>
          <h3 className="text-4xl font-bold text-slate-800 mt-1">{stats.hot}</h3>
          <p className="text-xs font-bold text-emerald-500 mt-2">&uarr; +2 from last week</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-emerald-100 rounded-full text-emerald-500 mb-3">
            <CheckCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Drive Completed</p>
          <h3 className="text-4xl font-bold text-slate-800 mt-1">{stats.completed}</h3>
          <p className="text-xs font-bold text-emerald-500 mt-2">&uarr; +3 this week</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600 mb-3">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Students Placed</p>
          <h3 className="text-4xl font-bold text-slate-800 mt-1">{stats.studentsPlaced}</h3>
          <p className="text-xs font-bold text-emerald-500 mt-2">&uarr; +18 this month</p>
        </div>
      </div>

      {/* Main Companies Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Filters and Actions Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 mr-4">All Companies</h2>
            
            <button onClick={() => { setFilterStatus("All"); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${filterStatus === "All" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              All ({allCompanies.length})
            </button>
            <button onClick={() => { setFilterStatus("Cold"); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${filterStatus === "Cold" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Cold ({workflow.cold.length})
            </button>
            <button onClick={() => { setFilterStatus("Warm"); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${filterStatus === "Warm" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> Warm ({workflow.warm.length})
            </button>
            <button onClick={() => { setFilterStatus("Hot"); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${filterStatus === "Hot" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Hot ({workflow.hot.length})
            </button>
            <button onClick={() => { setFilterStatus("Drive Completed"); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${filterStatus === "Drive Completed" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Drive Complete ({workflow.completed.length})
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search companies, location..." 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        </div>

        {/* Companies Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-800 font-bold text-xs border-b border-slate-100">
              <tr>
                <th className="px-4 py-4">Company</th>
                <th className="px-4 py-4 min-w-[200px]">Address</th>
                <th className="px-4 py-4">Location</th>
                <th className="px-4 py-4 text-center">Map</th>
                <th className="px-4 py-4">Website</th>
                <th className="px-4 py-4">Contact Person</th>
                <th className="px-4 py-4 text-center">CTC (LPA)</th>
                <th className="px-4 py-4">Size</th>
                <th className="px-4 py-4 w-12 text-center">Status</th>
                <th className="px-4 py-4 w-12 text-center">Students Placed</th>
              </tr>
              <tr className="bg-slate-50 border-t border-slate-100">
                <th className="px-2 py-2">
                  <input type="text" placeholder="Filter..." className="w-full text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" value={filters.company} onChange={e => setFilters({...filters, company: e.target.value})} />
                </th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">
                  <input type="text" placeholder="Filter..." className="w-full text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" value={filters.location} onChange={e => setFilters({...filters, location: e.target.value})} />
                </th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">
                  <input type="text" placeholder="Filter..." className="w-full text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" value={filters.website} onChange={e => setFilters({...filters, website: e.target.value})} />
                </th>
                <th className="px-2 py-2">
                  <input type="text" placeholder="Filter..." className="w-full text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" value={filters.contact_person} onChange={e => setFilters({...filters, contact_person: e.target.value})} />
                </th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">
                  <input type="text" placeholder="Filter..." className="w-full text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" value={filters.size} onChange={e => setFilters({...filters, size: e.target.value})} />
                </th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">
                  <button onClick={() => setFilters({company: "", location: "", website: "", contact_person: "", size: ""})} className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors">
                    <Filter className="h-3 w-3" /> Clear
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-blue-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      {company.company}
                      <p className="text-[10px] text-slate-400 font-normal">IT Services / Tech</p>
                      {company.created_by && (
                        <p className="text-[9px] text-blue-400 font-medium mt-0.5">Added by {company.created_by.name} ({company.created_by.role})</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600 font-medium truncate max-w-[200px]" title={company.address || company.location}>{company.address || '-'}</td>
                  <td className="px-4 py-4 text-slate-600 font-medium">{company.location || '-'}</td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => { setMapAddress(company.address || company.location || ''); setShowMapModal(true); }}
                      className="text-blue-500 hover:text-blue-700 transition-colors p-1.5 rounded bg-blue-50 hover:bg-blue-100"
                      title="View on Map"
                    >
                      <MapPin className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-4 py-4 text-blue-500 hover:underline cursor-pointer">{company.website}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                         {(company.contact_person || company.assigned_name || 'UN').substring(0, 2).toUpperCase()}
                       </div>
                       <div>
                         <p className="font-semibold text-slate-700">{company.contact_person || company.assigned_name || 'Unassigned'}</p>
                         <p className="text-[10px] text-slate-400">{company.phone || '+91 98765 43210'}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700 text-center">
                    {company.status === 'Hot' || company.status === 'Drive Completed' ? (company.ctc_lpa || '-') : '-'}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{company.size}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 w-max ${getStatusColor(company.status || '')}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(company.status || '')}`}></span>
                      {company.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-800 text-center">{company.students_placed || 0}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3 text-slate-400">
                      {company.status === 'Drive Completed' ? (
                        <button onClick={() => handleViewPlacedStudents(company.id, company.company)} className="hover:text-blue-600 transition-colors text-blue-500" title="View Placed Students"><GraduationCap className="h-4 w-4" /></button>
                      ) : null}
                      {company.status === 'Hot' ? (
                        <>
                          <button onClick={() => handleViewRegisteredStudents(company.id, company.company)} className="hover:text-red-600 transition-colors text-red-500" title="View Registered Students (ATS Match)"><Users className="h-4 w-4" /></button>
                        </>
                      ) : null}
                      <button onClick={() => { setPreviewCompany(company); setShowPreviewCompanyModal(true); }} className="hover:text-emerald-600 transition-colors" title="View Company Details"><Eye className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedCompanies.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">No companies found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredCompanies.length)}-{Math.min(currentPage * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} companies</span>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)} 
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              &lt; Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page} 
                onClick={() => setCurrentPage(page)} 
                className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
              >
                {page}
              </button>
            ))}
            <button 
              disabled={currentPage === totalPages || totalPages === 0} 
              onClick={() => setCurrentPage(p => p + 1)} 
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Selected Students Data (Appears when viewing placed students) */}
      {showPlacedModal && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Selected Students Data</h2>
              <p className="text-xs text-slate-500 mt-1">Selected students data for export — S.No, Roll No, Name, Department, Company, CTC</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setShowPlacedModal(false)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="h-4 w-4" /> Back / Close
              </button>
              <button 
                onClick={downloadExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" /> Download CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-800 font-bold text-xs border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 w-12 text-center"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></th>
                  <th className="px-6 py-4">S.No</th>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">CTC (LPA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {placedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No placed students data available.</td>
                  </tr>
                ) : (
                  placedStudents.map((s, idx) => (
                    <tr key={s.id || s._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-center"><input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" /></td>
                      <td className="px-6 py-4 font-bold text-slate-800">{(idx + 1).toString().padStart(2, '0')}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{s.roll_no}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-600">{s.department}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-blue-500" /> {selectedCompanyName}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{s.ctc_lpa || 'N/A'} LPA</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {placedStudents.length > 0 && (
             <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs font-semibold flex items-center justify-between text-slate-600">
               <span>{placedStudents.length} students selected</span>
               <span className="text-emerald-600">Export ready • CSV download includes all selected fields</span>
             </div>
          )}
        </div>
      )}


      {/* Add Company Modal */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" /> Add New Company
              </h2>
              <button onClick={() => setShowAddCompanyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCompanySubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                  <input type="text" required className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.name} onChange={(e) => setNewCompany({...newCompany, name: e.target.value})} placeholder="e.g. Acme Corp" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.address} onChange={(e) => setNewCompany({...newCompany, address: e.target.value})} placeholder="Full physical address" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                  <input type="text" required className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.location} onChange={(e) => setNewCompany({...newCompany, location: e.target.value})} placeholder="City, State" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Website</label>
                  <input type="text" required className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.website} onChange={(e) => setNewCompany({...newCompany, website: e.target.value})} placeholder="example.com" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Person</label>
                  <input type="text" required className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.contact_person} onChange={(e) => setNewCompany({...newCompany, contact_person: e.target.value})} placeholder="Name of HR / Recruiter" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input type="email" required className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.email} onChange={(e) => setNewCompany({...newCompany, email: e.target.value})} placeholder="hr@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                  <input type="text" required className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.phone} onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})} placeholder="+91 9876543210" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Size</label>
                  <input type="text" required className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.size} onChange={(e) => setNewCompany({...newCompany, size: e.target.value})} placeholder="e.g. 1,000+ employees" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Initial Status</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors appearance-none" value={newCompany.status} onChange={(e) => setNewCompany({...newCompany, status: e.target.value})}>
                    <option value="Cold">Cold (Not Contacted)</option>
                    <option value="Warm">Warm (Contacted)</option>
                    <option value="Hot">Hot (JD Received)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CTC (LPA)</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={newCompany.ctc_lpa} onChange={(e) => setNewCompany({...newCompany, ctc_lpa: e.target.value})} placeholder="e.g. 10-12" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 mt-6">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold h-11 rounded-xl transition-all shadow-md">
                  Add Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditCompanyModal && editCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-500" /> Edit Company Details
              </h2>
              <button onClick={() => { setShowEditCompanyModal(false); setEditCompany(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditCompanySubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                  <input type="text" required className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.company || ""} onChange={(e) => setEditCompany({...editCompany, company: e.target.value})} placeholder="e.g. Acme Corp" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.address || ""} onChange={(e) => setEditCompany({...editCompany, address: e.target.value})} placeholder="Full physical address" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.location || ""} onChange={(e) => setEditCompany({...editCompany, location: e.target.value})} placeholder="City, State" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Website</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.website || ""} onChange={(e) => setEditCompany({...editCompany, website: e.target.value})} placeholder="example.com" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Person</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.contact_person || ""} onChange={(e) => setEditCompany({...editCompany, contact_person: e.target.value})} placeholder="Name of HR / Recruiter" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                  <input type="email" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.email || ""} onChange={(e) => setEditCompany({...editCompany, email: e.target.value})} placeholder="hr@example.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.phone || ""} onChange={(e) => setEditCompany({...editCompany, phone: e.target.value})} placeholder="+91 9876543210" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Size</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.size || ""} onChange={(e) => setEditCompany({...editCompany, size: e.target.value})} placeholder="e.g. 1,000+ employees" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors appearance-none" value={editCompany.status || "Cold"} onChange={(e) => setEditCompany({...editCompany, status: e.target.value})}>
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                    <option value="Drive Completed">Drive Completed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CTC (LPA)</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-slate-50 transition-colors" value={editCompany.ctc_lpa || ""} onChange={(e) => setEditCompany({...editCompany, ctc_lpa: e.target.value})} placeholder="e.g. 10-12" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 mt-6">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold h-11 rounded-xl transition-all shadow-md">
                  Update Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Company Modal */}
      {showPreviewCompanyModal && previewCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-500" /> {previewCompany.company}
              </h2>
              <button onClick={() => { setShowPreviewCompanyModal(false); setPreviewCompany(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(previewCompany.status || 'Cold')}`}>
                    {previewCompany.status || 'Unknown'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Students Placed</p>
                  <p className="font-semibold text-slate-800">{previewCompany.students_placed || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                  <p className="font-medium text-slate-700">{previewCompany.location || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Website</p>
                  <p className="font-medium text-blue-600 hover:underline">{previewCompany.website || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Person</p>
                  <p className="font-medium text-slate-700">{previewCompany.contact_person || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="font-medium text-slate-700">{previewCompany.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                  <p className="font-medium text-slate-700">{previewCompany.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Size</p>
                  <p className="font-medium text-slate-700">{previewCompany.size || 'N/A'}</p>
                </div>
                {previewCompany.created_by && (
                  <div className="col-span-2 pt-4 border-t border-slate-100 mt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Added By</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {previewCompany.created_by.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{previewCompany.created_by.name}</p>
                        <p className="text-xs font-medium text-slate-500 capitalize">{previewCompany.created_by.role} • {previewCompany.created_by.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => { setShowPreviewCompanyModal(false); setPreviewCompany(null); }} 
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
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

      {/* Registered Students Modal */}
      {showRegisteredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" /> Registered Students: {selectedCompanyName}
                </h2>
                <p className="text-sm text-slate-500 mt-1">ATS Match scores based on student resumes vs job description.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={downloadRegisteredExcel}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold text-xs rounded-lg transition-colors shadow-sm border border-emerald-200"
                >
                  <Download className="h-3.5 w-3.5" /> Export Excel
                </button>
                <button onClick={() => setShowRegisteredModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50 p-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-800 font-bold text-xs border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">S.No</th>
                      <th className="px-6 py-4">Roll No</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4 text-center">ATS Score</th>
                      <th className="px-6 py-4">Match Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registeredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No registered students found.</td>
                      </tr>
                    ) : (
                      registeredStudents.map((s, idx) => (
                        <tr 
                          key={s.roll_no} 
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                          onClick={() => setSelectedStudent(s)}
                        >
                          <td className="px-6 py-4 font-bold text-slate-800">{(idx + 1).toString().padStart(2, '0')}</td>
                          <td className="px-6 py-4 font-semibold text-slate-700">{s.roll_no}</td>
                          <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{s.name}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-600">{s.department}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`text-lg font-bold ${s.ats_score >= 80 ? 'text-emerald-600' : s.ats_score >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                                {s.ats_score}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.ats_score >= 80 ? 'bg-emerald-100 text-emerald-700' : s.ats_score >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                              {s.match_status || (s.ats_score >= 80 ? 'High Match' : s.ats_score >= 50 ? 'Medium Match' : 'Low Match')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Student Slide-over Panel */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity overflow-hidden">
          <div className="absolute inset-y-0 right-0 w-[450px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-blue-50 flex items-center justify-center">
                  <img src={getImageUrl(selectedStudent.photo_url, selectedStudent.name)} alt={selectedStudent.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 leading-tight">{selectedStudent.name}</h2>
                  <p className="text-xs font-semibold text-slate-500">{selectedStudent.roll_no}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-5 space-y-6">
              
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase">ATS Match</p>
                   <p className={`text-xl font-bold ${selectedStudent.ats_score >= 80 ? 'text-emerald-600' : selectedStudent.ats_score >= 50 ? 'text-orange-500' : 'text-red-500'}`}>{selectedStudent.ats_score}%</p>
                 </div>
                 <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedStudent.ats_score >= 80 ? 'bg-emerald-100 text-emerald-700' : selectedStudent.ats_score >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedStudent.match_status}
                 </span>
              </div>

              {/* Core Information */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Academic Profile</h3>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-600">Department</span>
                    <span className="text-sm font-bold text-slate-800">{selectedStudent.department}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-600">Gender</span>
                    <span className="text-sm font-bold text-slate-800">{selectedStudent.gender || 'N/A'}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-600">Accommodation</span>
                    <span className="text-sm font-bold text-slate-800">{selectedStudent.acc || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Academic Performance */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Academic Performance</h3>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">10th (SSLC)</p>
                    <p className="text-lg font-bold text-slate-800">{selectedStudent.sslc_percentage}%</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{selectedStudent.sslc_year || 'N/A'}</p>
                  </div>
                  <div className="text-center border-l border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">12th (HSC)</p>
                    <p className="text-lg font-bold text-slate-800">{selectedStudent.hsc_percentage}%</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{selectedStudent.hsc_year || 'N/A'}</p>
                  </div>
                  <div className="text-center border-l border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Degree (UG)</p>
                    <p className="text-lg font-bold text-blue-600">{selectedStudent.ug_percentage}%</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{selectedStudent.grad_year || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact Details</h3>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-600">Email</span>
                    <span className="text-sm font-bold text-slate-800">{selectedStudent.email}</span>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-600">Phone</span>
                    <span className="text-sm font-bold text-slate-800">{selectedStudent.phone}</span>
                  </div>
                </div>
              </div>
              
              {/* Previews */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Digital Assets & Links</h3>
                
                {/* Resume Box */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                      Resume (PDF Preview)
                    </span>
                    {selectedStudent.resume_url && (
                      <a href={selectedStudent.resume_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                        Open in New Tab &nearr;
                      </a>
                    )}
                  </div>
                  <div className="bg-slate-100 h-[350px] relative w-full flex items-center justify-center">
                    {selectedStudent.resume_url ? (
                      <iframe src={getEmbedUrl(selectedStudent.resume_url)} className="w-full h-full border-0 absolute inset-0" title="Resume Preview" />
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">No Resume Provided</span>
                    )}
                  </div>
                </div>

                {/* Video Resume Box */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700">Video Resume (Preview)</span>
                    {selectedStudent.video_url && (
                      <a href={selectedStudent.video_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                        Open in New Tab &nearr;
                      </a>
                    )}
                  </div>
                  <div className="bg-slate-900 h-[220px] relative w-full flex items-center justify-center">
                    {selectedStudent.video_url ? (
                      isDirectVideo(selectedStudent.video_url) ? (
                        <video src={selectedStudent.video_url} controls className="w-full h-full object-cover" />
                      ) : (
                        <iframe src={getEmbedUrl(selectedStudent.video_url)} title="Video Preview" allowFullScreen className="w-full h-full border-0 absolute inset-0" />
                      )
                    ) : (
                      <span className="text-slate-500 text-xs font-medium">No Video Resume Provided</span>
                    )}
                  </div>
                </div>
                
                {/* Links Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div 
                    className={`bg-white rounded-xl border ${selectedStudent.portfolio_url ? 'border-blue-200 hover:border-blue-400 cursor-pointer shadow-sm' : 'border-slate-100 opacity-60'} overflow-hidden h-[100px] flex flex-col relative group`}
                    onClick={() => selectedStudent.portfolio_url && window.open(selectedStudent.portfolio_url, "_blank")}
                  >
                    <div className="p-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center z-10">
                      <span className="text-[10px] font-bold text-slate-600">Portfolio</span>
                      {selectedStudent.portfolio_url && <span className="text-[8px] text-blue-500">&nearr;</span>}
                    </div>
                    <div className="flex-1 bg-slate-100 relative w-full flex items-center justify-center overflow-hidden">
                      {selectedStudent.portfolio_url ? (
                        <iframe src={selectedStudent.portfolio_url} title="Portfolio Preview" className="w-full h-full border-0 rounded pointer-events-none" />
                      ) : (
                        <span className="text-slate-400 text-[9px] font-medium">N/A</span>
                      )}
                      {selectedStudent.portfolio_url && <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors"></div>}
                    </div>
                  </div>

                  <div 
                    className={`bg-white rounded-xl border ${selectedStudent.github_url ? 'border-slate-300 hover:border-slate-500 cursor-pointer shadow-sm' : 'border-slate-100 opacity-60'} overflow-hidden h-[100px] flex flex-col relative group`}
                    onClick={() => selectedStudent.github_url && window.open(selectedStudent.github_url, "_blank")}
                  >
                    <div className="p-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center z-10">
                      <span className="text-[10px] font-bold text-slate-600">GitHub</span>
                      {selectedStudent.github_url && <span className="text-[8px] text-slate-500">&nearr;</span>}
                    </div>
                    <div className="flex-1 bg-slate-100 relative w-full flex items-center justify-center overflow-hidden">
                      {selectedStudent.github_url ? (
                        <iframe src={selectedStudent.github_url} title="GitHub Preview" className="w-full h-full border-0 rounded pointer-events-none" />
                      ) : (
                        <span className="text-slate-400 text-[9px] font-medium">N/A</span>
                      )}
                      {selectedStudent.github_url && <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors"></div>}
                    </div>
                  </div>

                  <div 
                    className={`bg-white rounded-xl border ${selectedStudent.linkedin_url ? 'border-sky-200 hover:border-sky-400 cursor-pointer shadow-sm' : 'border-slate-100 opacity-60'} overflow-hidden h-[100px] flex flex-col relative group`}
                    onClick={() => selectedStudent.linkedin_url && window.open(selectedStudent.linkedin_url, "_blank")}
                  >
                    <div className="p-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center z-10">
                      <span className="text-[10px] font-bold text-slate-600">LinkedIn</span>
                      {selectedStudent.linkedin_url && <span className="text-[8px] text-sky-500">&nearr;</span>}
                    </div>
                    <div className="flex-1 bg-slate-100 relative w-full flex items-center justify-center overflow-hidden">
                      {selectedStudent.linkedin_url ? (
                        <iframe src={selectedStudent.linkedin_url} title="LinkedIn Preview" className="w-full h-full border-0 rounded pointer-events-none" />
                      ) : (
                        <span className="text-slate-400 text-[9px] font-medium">N/A</span>
                      )}
                      {selectedStudent.linkedin_url && <div className="absolute inset-0 bg-sky-500/0 group-hover:bg-sky-500/10 transition-colors"></div>}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      </div>
  );
}
