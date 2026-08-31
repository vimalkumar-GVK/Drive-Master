import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import { X, Play, FileText, LayoutTemplate, Plus, Upload, Loader2, Sparkles, Users, Edit2, Trash2, RotateCcw, AlertTriangle, ArrowLeft } from "lucide-react";

interface Student {
  id: string;
  roll_no: string;
  name: string;
  department: string;
  gender: string;
  acc: string;
  sslc: string;
  hsc: string;
  ug: string;
  grad_year: string;
  email: string;
  phone: string;
  resume_url?: string;
  video_url?: string;
  photo_url?: string;
  portfolio_url?: string;
  github_url?: string;
  linkedin_url?: string;
  placement_status?: string;
}

interface AtsAnalysis {
  roll_no: string;
  name: string;
  department: string;
  resume_url?: string;
  resume_quality?: {
    grammar_score: number;
    structure_score: number;
    overall_score: number;
    issues: string[];
    suggestions: string[];
  };
}

const getEmbedUrl = (url?: string) => {
  if (!url) return "";
  try {
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch && docMatch[1]) {
      return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
    }
    const driveMatch = url.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    return url;
  } catch {
    return url;
  }
};

const getImageUrl = (url?: string, seed?: string) => {
  if (!url) {
    const name = seed ? encodeURIComponent(seed) : 'Student';
    return `https://ui-avatars.com/api/?name=${name}&background=random&color=fff&size=256`;
  }
  try {
    const driveMatch = url.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }
    return url;
  } catch {
    return url;
  }
};

const isDirectVideo = (url?: string) => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm') || url.toLowerCase().endsWith('.ogg');
};

export function StudentList() {
  const [activeTab, setActiveTab] = useState<"directory" | "trash" | "ats">("directory");
  const [students, setStudents] = useState<Student[]>([]);
  const [trashedStudents, setTrashedStudents] = useState<Student[]>([]);

  const [atsAnalysis, setAtsAnalysis] = useState<AtsAnalysis[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companyAtsScores, setCompanyAtsScores] = useState<any[]>([]);
  const [loadingCompanyAts, setLoadingCompanyAts] = useState(false);
  const processingAtsRef = useRef<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [showManualModal, setShowManualModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const [showUploadConfirmModal, setShowUploadConfirmModal] = useState(false);
  const [uploadStats, setUploadStats] = useState({ newCount: 0, existingCount: 0, totalCount: 0 });
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { role } = useOutletContext<{ role: string }>();
  const canEdit = role === "admin" || role === "manager";

  const [formData, setFormData] = useState({
    roll_no: "", name: "", department: "", gender: "Male", acc: "Hosteller",
    sslc_percentage: 0, sslc_year: "", hsc_percentage: 0, hsc_year: "",
    ug_percentage: 0, ug_year: "", grad_year: "", email: "", phone: "",
    resume_url: "", video_url: "", photo_url: "", portfolio_url: "", github_url: "", linkedin_url: "", placement_status: "YTBP"
  });

  const [filters, setFilters] = useState({
    roll_no: "",
    name: "",
    department: "",
    gender: "",
    acc: "",
    grad_year: "",
    placement_status: ""
  });

  const filteredStudents = students.filter(student => {
    return (
      (filters.roll_no === "" || student.roll_no.toLowerCase().includes(filters.roll_no.toLowerCase())) &&
      (filters.name === "" || student.name.toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.department === "" || student.department.toLowerCase().includes(filters.department.toLowerCase())) &&
      (filters.gender === "" || (student.gender || "").toLowerCase().includes(filters.gender.toLowerCase())) &&
      (filters.acc === "" || (student.acc || "").toLowerCase().includes(filters.acc.toLowerCase())) &&
      (filters.grad_year === "" || (student.grad_year || "").toString().includes(filters.grad_year)) &&
      (filters.placement_status === "" || (student.placement_status || "YTBP").toLowerCase().includes(filters.placement_status.toLowerCase()))
    );
  });

  const filteredAtsAnalysis = atsAnalysis.filter(student => {
    return (
      (filters.roll_no === "" || (student.roll_no || "").toLowerCase().includes(filters.roll_no.toLowerCase())) &&
      (filters.name === "" || (student.name || "").toLowerCase().includes(filters.name.toLowerCase())) &&
      (filters.department === "" || (student.department || "").toLowerCase().includes(filters.department.toLowerCase()))
    );
  });

  const fetchStudents = () => {
    api.get("/students/admin/students")
      .then(res => setStudents(res.data))
      .catch(err => console.error("Error fetching students:", err));
      
    api.get("/students/admin/students/trash")
      .then(res => setTrashedStudents(res.data))
      .catch(err => console.error("Error fetching trashed students:", err));
  };

  const handleDelete = async (studentId: string) => {
    if (!window.confirm("Are you sure you want to move this student to trash?")) return;
    try {
      await api.delete(`/students/admin/students/${studentId}`);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Failed to delete student.");
    }
  };

  const handleRestore = async (studentId: string) => {
    try {
      await api.post(`/students/admin/students/${studentId}/restore`);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Failed to restore student.");
    }
  };

  const handlePermanentDelete = async (studentId: string) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this student? This action cannot be undone.")) return;
    try {
      await api.delete(`/students/admin/students/${studentId}/permanent`);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Failed to permanently delete student.");
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (activeTab === "ats") {
      api.get(`/students/admin/ats-analysis`)
        .then(res => {
          setAtsAnalysis(res.data.analysis);
        })
        .catch(err => console.error("Error fetching ATS analysis:", err));
        
      api.get(`/companies`)
        .then(res => {
          setCompanies(res.data);
        })
        .catch(err => console.error("Error fetching companies:", err));
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "ats" && selectedCompanyId) {
      setLoadingCompanyAts(true);
      api.get(`/companies/${selectedCompanyId}/registered_students`)
        .then(res => {
          setCompanyAtsScores(res.data.students);
        })
        .catch(err => console.error("Error fetching company ATS:", err))
        .finally(() => setLoadingCompanyAts(false));
    }
  }, [selectedCompanyId, activeTab]);

  useEffect(() => {
    if (activeTab === "ats") {
      const pendingStudents = atsAnalysis.filter(a => !a.resume_quality && a.resume_url && !processingAtsRef.current.has(a.roll_no));
      if (pendingStudents.length > 0) {
        pendingStudents.forEach(async (student) => {
          processingAtsRef.current.add(student.roll_no);
          try {
            const res = await api.post(`/students/admin/students/${student.roll_no}/calculate-quality`);
            setAtsAnalysis(prev => prev.map(a => a.roll_no === student.roll_no ? { ...a, resume_quality: res.data } : a));
          } catch (err) {
            console.error(`Failed to calculate quality for ${student.roll_no}`, err);
          }
        });
      }
    }
  }, [atsAnalysis, activeTab]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudentId) {
        await api.put(`/students/admin/students/${editingStudentId}`, formData);
        alert("Student updated successfully!");
      } else {
        await api.post("/students/admin/students", formData);
        alert("Student added successfully!");
      }
      setShowManualModal(false);
      setEditingStudentId(null);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert(editingStudentId ? "Failed to update student." : "Failed to add student.");
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setPendingUploadFile(file);
    const data = new FormData();
    data.append("file", file);
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${baseURL}/students/admin/students/upload?mode=preview`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: data,
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
      
      const resData = await response.json();
      const { new_count, existing_count, total_count } = resData;
      setUploadStats({ newCount: new_count, existingCount: existing_count, totalCount: total_count });
      
      if (existing_count > 0) {
        setShowExcelModal(false);
        setShowUploadConfirmModal(true);
      } else {
        // No conflicts, process directly
        await processFinalUpload(file, "insert_only");
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Failed to preview Excel file.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.detail) errorMsg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
      } catch (e) {}
      alert(errorMsg);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const processFinalUpload = async (file: File, mode: "upsert" | "insert_only") => {
    const data = new FormData();
    data.append("file", file);
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${baseURL}/students/admin/students/upload?mode=${mode}`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: data,
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
      
      const resData = await response.json();
      alert(resData.message);
      setShowUploadConfirmModal(false);
      setShowExcelModal(false);
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Failed to upload Excel file.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.detail) errorMsg = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
      } catch (e) {}
      alert(errorMsg);
    } finally {
      setIsUploading(false);
      setPendingUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  return (
    <div className="relative pb-12 space-y-8">

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Student Directory</h1>
          <p className="text-slate-500 font-medium">Manage and analyze student placement profiles.</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
            <button
              onClick={() => {
                setFormData({
                  roll_no: "", name: "", department: "", gender: "Male", acc: "Hosteller",
                  sslc_percentage: 0, sslc_year: "", hsc_percentage: 0, hsc_year: "",
                  ug_percentage: 0, ug_year: "", grad_year: "", email: "", phone: "",
                  resume_url: "", video_url: "", photo_url: "", portfolio_url: "", github_url: "", linkedin_url: "", placement_status: "YTBP"
                });
                setEditingStudentId(null);
                setShowManualModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md group"
            >
              <Plus className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              Add Manually
            </button>
            <button
              onClick={() => setShowExcelModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
            >
              <Upload className="h-4 w-4" />
              Upload Excel
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto hide-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "directory" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Student Directory
        </button>
        <button
          onClick={() => setActiveTab("trash")}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "trash" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Trash
        </button>
        <button
          onClick={() => setActiveTab("ats")}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "ats" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          AI ATS Analysis
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-8">

        {/* STUDENT DATABASE TABLE */}
        {activeTab === "directory" && (
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100/60 bg-slate-50/30 flex justify-between items-center">
            <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Student Master Database</h2>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">
              {filteredStudents.length} Records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 font-bold tracking-wider uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 w-16">S.NO</th>
                  <th className="px-6 py-4">ROLL NO</th>
                  <th className="px-6 py-4">NAME</th>
                  <th className="px-6 py-4">DEPT.</th>
                  <th className="px-6 py-4">GENDER</th>
                  <th className="px-6 py-4">ACC.</th>
                  <th className="px-6 py-4">SSLC % <span className="text-[10px] font-semibold opacity-70">(YR)</span></th>
                  <th className="px-6 py-4">HSC % <span className="text-[10px] font-semibold opacity-70">(YR)</span></th>
                  <th className="px-6 py-4">UG % <span className="text-[10px] font-semibold opacity-70">(YR)</span></th>
                  <th className="px-6 py-4">GRAD. <span className="text-[10px] font-semibold opacity-70">YR</span></th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4">EMAIL</th>
                  <th className="px-6 py-4">PHONE</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2">
                    <input type="text" placeholder="Filter..." className="w-24 text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filters.roll_no} onChange={e => setFilters({...filters, roll_no: e.target.value})} />
                  </th>
                  <th className="px-2 py-2">
                    <input type="text" placeholder="Filter..." className="w-32 text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})} />
                  </th>
                  <th className="px-2 py-2">
                    <input type="text" placeholder="Filter..." className="w-32 text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} />
                  </th>
                  <th className="px-2 py-2">
                    <select className="w-24 text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white" value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})}>
                      <option value="">All</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </th>
                  <th className="px-2 py-2">
                    <input type="text" placeholder="Filter..." className="w-24 text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filters.acc} onChange={e => setFilters({...filters, acc: e.target.value})} />
                  </th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2">
                    <input type="text" placeholder="Year..." className="w-20 text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" value={filters.grad_year} onChange={e => setFilters({...filters, grad_year: e.target.value})} />
                  </th>
                  <th className="px-2 py-2">
                    <select className="w-28 text-xs font-normal px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none bg-white" value={filters.placement_status} onChange={e => setFilters({...filters, placement_status: e.target.value})}>
                      <option value="">All</option>
                      <option value="Placed">Placed</option>
                      <option value="YTBP">YTBP</option>
                    </select>
                  </th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2 text-right">
                    <button onClick={() => setFilters({roll_no: "", name: "", department: "", gender: "", acc: "", grad_year: "", placement_status: ""})} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors px-2 py-1">
                      Clear
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="cursor-pointer transition-all hover:bg-indigo-50/40 group"
                  >
                    <td className="px-6 py-4 text-slate-400 font-medium">{index + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{student.roll_no}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{student.department}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold">{student.gender}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-bold">{student.acc}</td>
                    <td className="px-6 py-4 text-slate-600">{student.sslc}</td>
                    <td className="px-6 py-4 text-slate-600">{student.hsc}</td>
                    <td className="px-6 py-4 text-slate-600">{student.ug}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{student.grad_year}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        student.placement_status === 'Placed' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {student.placement_status || 'YTBP'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{student.email}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{student.phone}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({
                                  roll_no: student.roll_no,
                                  name: student.name,
                                  department: student.department,
                                  gender: student.gender || "Male",
                                  acc: student.acc || "Hosteller",
                                  sslc_percentage: parseFloat(student.sslc?.split(" ")[0]) || 0,
                                  sslc_year: student.sslc?.split("(")[1]?.replace(")", "") || "",
                                  hsc_percentage: parseFloat(student.hsc?.split(" ")[0]) || 0,
                                  hsc_year: student.hsc?.split("(")[1]?.replace(")", "") || "",
                                  ug_percentage: parseFloat(student.ug?.split(" ")[0]) || 0,
                                  ug_year: student.ug?.split("(")[1]?.replace(")", "") || "",
                                  grad_year: student.grad_year,
                                  email: student.email,
                                  phone: student.phone,
                                  resume_url: student.resume_url || "",
                                  video_url: student.video_url || "",
                                  photo_url: student.photo_url || "",
                                  portfolio_url: student.portfolio_url || "",
                                  github_url: student.github_url || "",
                                  linkedin_url: student.linkedin_url || "",
                                  placement_status: student.placement_status || "YTBP"
                                });
                                setEditingStudentId(student.id);
                                setShowManualModal(true);
                              }}
                              className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-md transition-colors" 
                              title="Edit Student"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(student.id);
                              }}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded-md transition-colors" 
                              title="Move to Trash"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">No students found matching your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* TRASH TABLE */}
        {activeTab === "trash" && (
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 overflow-hidden">
          <div className="p-8 border-b border-rose-100/60 bg-rose-50/30">
            <h2 className="text-sm font-bold tracking-widest text-rose-400 uppercase">Deleted Students (Trash)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap border-collapse">
              <thead className="bg-rose-50/80 text-rose-500 font-bold tracking-wider uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">ROLL NO</th>
                  <th className="px-6 py-4">NAME</th>
                  <th className="px-6 py-4">DEPT.</th>
                  <th className="px-6 py-4">EMAIL</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {trashedStudents.map((student) => (
                  <tr key={student.id} className="transition-all hover:bg-rose-50/40 group">
                    <td className="px-6 py-4 font-bold text-slate-800">{student.roll_no}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{student.department}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{student.email}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleRestore(student.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(student.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Permanent Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {trashedStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
                          <AlertTriangle className="h-6 w-6 text-rose-400" />
                        </div>
                        <p className="text-slate-500 font-medium">Trash is empty.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* AI ATS ANALYSIS PIPELINE */}
        {activeTab === "ats" && (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl shadow-xl border border-indigo-500/20 p-8 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-sm font-bold tracking-widest text-indigo-300 uppercase">AI Resume Quality Analysis</h2>
            <div className="flex items-center gap-3 bg-indigo-950/50 p-2 rounded-xl border border-indigo-500/20">
              <span className="text-xs font-bold text-indigo-200">Company JD Filter:</span>
              <select 
                className="bg-indigo-900/50 text-white border border-indigo-500/30 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 min-w-[200px]"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                <option value="">None (Global Resume Quality)</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                {selectedCompanyId ? "Company JD Match Scores" : "Candidate Resume Quality Score"}
              </h3>
              {selectedCompanyId && companyAtsScores.length > 0 && (
                <div className="flex flex-col items-end">
                  <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1">Overall JD ATS Score</span>
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                    <span className="text-emerald-400 font-black text-xl">
                      {Math.round(companyAtsScores.reduce((acc, curr) => acc + (curr.ats_score || 0), 0) / companyAtsScores.length)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-indigo-500/20 bg-indigo-950/30 backdrop-blur-md">
              <table className="w-full text-sm text-center border-collapse">
                <thead className="bg-indigo-950/50 text-indigo-200 font-bold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left">ROLL NO</th>
                    <th className="px-6 py-4 text-left">NAME</th>
                    <th className="px-6 py-4">DEPT.</th>
                    <th className="px-6 py-4">{selectedCompanyId ? "MATCH STATUS" : "QUALITY LABEL"}</th>
                    <th className="px-6 py-4">{selectedCompanyId ? "JD ATS SCORE" : "QUALITY SCORE"}</th>
                    <th className="px-6 py-4 text-right">RESUME</th>
                  </tr>
                  <tr className="bg-indigo-950/30 border-t border-indigo-500/10">
                    <th className="px-2 py-2 text-left pl-6">
                      <input type="text" placeholder="Filter..." className="w-24 text-xs font-normal px-2 py-1.5 border border-indigo-500/30 bg-indigo-900/50 text-white rounded focus:ring-1 focus:ring-purple-500 outline-none" value={filters.roll_no} onChange={e => setFilters({...filters, roll_no: e.target.value})} />
                    </th>
                    <th className="px-2 py-2 text-left pl-6">
                      <input type="text" placeholder="Filter..." className="w-32 text-xs font-normal px-2 py-1.5 border border-indigo-500/30 bg-indigo-900/50 text-white rounded focus:ring-1 focus:ring-purple-500 outline-none" value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})} />
                    </th>
                    <th className="px-2 py-2">
                      <input type="text" placeholder="Filter..." className="w-32 text-xs font-normal px-2 py-1.5 border border-indigo-500/30 bg-indigo-900/50 text-white rounded focus:ring-1 focus:ring-purple-500 outline-none mx-auto block" value={filters.department} onChange={e => setFilters({...filters, department: e.target.value})} />
                    </th>
                    <th className="px-2 py-2"></th>
                    <th className="px-2 py-2"></th>
                    <th className="px-2 py-2 text-right pr-6">
                      <button onClick={() => setFilters({roll_no: "", name: "", department: "", gender: "", acc: "", grad_year: "", placement_status: ""})} className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors px-2 py-1">
                        Clear
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/10">
                  {(() => {
                    const dataToMap = selectedCompanyId ? companyAtsScores : filteredAtsAnalysis;
                    const filteredData = dataToMap.filter(student => {
                      return (
                        (filters.roll_no === "" || (student.roll_no || "").toLowerCase().includes(filters.roll_no.toLowerCase())) &&
                        (filters.name === "" || (student.name || "").toLowerCase().includes(filters.name.toLowerCase())) &&
                        (filters.department === "" || (student.department || "").toLowerCase().includes(filters.department.toLowerCase()))
                      );
                    });
                    
                    if (loadingCompanyAts) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-indigo-300">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-50" />
                            Loading Company ATS Scores...
                          </td>
                        </tr>
                      );
                    }

                    if (filteredData.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-indigo-300">
                            No students found.
                          </td>
                        </tr>
                      );
                    }

                    return filteredData.map((row: any, i: number) => {
                      const hasQuality = selectedCompanyId ? (row.ats_score !== undefined && row.ats_score !== null) : !!row.resume_quality;
                      const overallScore = selectedCompanyId ? (row.ats_score || 0) : (row.resume_quality?.overall_score || 0);
                    
                    let statusColor = "bg-white/5 border-white/10 text-indigo-300";
                    let label = "Pending";
                    let progressColor = "text-indigo-900/50";
                    
                    if (hasQuality) {
                      if (overallScore >= 71) {
                        statusColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                        label = selectedCompanyId ? (row.match_status || "Excellent Match") : "Excellent Structure";
                        progressColor = "text-emerald-400";
                      } else if (overallScore >= 41) {
                        statusColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                        label = selectedCompanyId ? (row.match_status || "Good Match") : "Average";
                        progressColor = "text-amber-400";
                      } else {
                        statusColor = "bg-rose-500/10 border-rose-500/20 text-rose-400";
                        label = selectedCompanyId ? (row.match_status || "Average Match") : "Needs Improvement";
                        progressColor = "text-rose-400";
                      }
                    }

                    return (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-5 text-indigo-100 font-bold text-left">{row.roll_no}</td>
                      <td className="px-6 py-5 text-white font-bold text-left">{row.name}</td>
                      <td className="px-6 py-5 text-indigo-200">{row.department}</td>
                      <td className="px-6 py-5 text-indigo-300 font-medium">
                        {hasQuality ? (
                          <span className={`px-3 py-1 rounded-full text-xs border ${statusColor}`}>{label}</span>
                        ) : row.resume_url ? (
                          <span className="px-3 py-1 bg-white/5 rounded-full text-xs border border-white/10 flex items-center justify-center gap-2 w-max mx-auto"><Loader2 className="h-3 w-3 animate-spin" /> Analyzing</span>
                        ) : (
                          <span className="text-xs text-slate-500">No Resume</span>
                        )}
                      </td>
                      <td className="px-6 py-5 flex justify-center items-center">
                        {hasQuality ? (
                          <div className="group/tooltip relative flex justify-center">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="text-indigo-900/50" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className={`transition-all duration-1000 ${progressColor}`} strokeWidth="4" strokeDasharray={`${overallScore}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{overallScore}%</div>
                            </div>
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:flex flex-col items-center z-50">
                              <div className="bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-700 p-3 whitespace-nowrap space-y-1">
                                {!selectedCompanyId ? (
                                  <>
                                    <div className="font-bold flex justify-between gap-4 border-b border-slate-700 pb-1 mb-1">
                                      <span>Grammar: <span className="text-emerald-400">{row.resume_quality?.grammar_score}%</span></span>
                                      <span>Structure: <span className="text-blue-400">{row.resume_quality?.structure_score}%</span></span>
                                    </div>
                                    <div className="text-slate-300">Issues Found: <span className="text-rose-400 font-bold">{row.resume_quality?.issues?.length || 0}</span></div>
                                  </>
                                ) : (
                                  <div className="font-bold text-slate-200 flex flex-col gap-1">
                                    <span>Match Status: <span className={progressColor}>{row.match_status || "Pending"}</span></span>
                                    <span>Calculated dynamically against JD</span>
                                  </div>
                                )}
                              </div>
                              <div className="w-3 h-3 bg-slate-900 border-b border-r border-slate-700 transform rotate-45 -mt-1.5"></div>
                            </div>
                          </div>
                        ) : row.resume_url ? (
                          <div className="w-16 h-16 rounded-full bg-indigo-500/10 animate-pulse border-2 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"></div>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {row.resume_url ? (
                          <a 
                            href={getEmbedUrl(row.resume_url)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" /> Preview
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">N/A</span>
                        )}
                      </td>
                    </tr>
                    );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

      </div>
      {/* End Main Content */}

      {/* Right Side Preview Overlay */}
      {selectedStudent && (
        <div className="fixed top-0 right-0 h-full w-80 bg-[#F4F6F9] shadow-2xl border-l border-slate-200 z-50 flex flex-col overflow-y-auto">
          <div className="p-4 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10">
            <button 
              onClick={() => setSelectedStudent(null)} 
              className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setFormData({
                    roll_no: selectedStudent.roll_no,
                    name: selectedStudent.name,
                    department: selectedStudent.department,
                    gender: selectedStudent.gender || "Male",
                    acc: selectedStudent.acc || "Hosteller",
                    sslc_percentage: parseFloat(selectedStudent.sslc?.split(" ")[0]) || 0,
                    sslc_year: selectedStudent.sslc?.split("(")[1]?.replace(")", "") || "",
                    hsc_percentage: parseFloat(selectedStudent.hsc?.split(" ")[0]) || 0,
                    hsc_year: selectedStudent.hsc?.split("(")[1]?.replace(")", "") || "",
                    ug_percentage: parseFloat(selectedStudent.ug?.split(" ")[0]) || 0,
                    ug_year: selectedStudent.ug?.split("(")[1]?.replace(")", "") || "",
                    grad_year: selectedStudent.grad_year,
                    email: selectedStudent.email,
                    phone: selectedStudent.phone,
                    resume_url: selectedStudent.resume_url || "",
                    video_url: selectedStudent.video_url || "",
                    photo_url: selectedStudent.photo_url || "",
                    portfolio_url: selectedStudent.portfolio_url || "",
                    github_url: selectedStudent.github_url || "",
                    linkedin_url: selectedStudent.linkedin_url || "",
                    placement_status: selectedStudent.placement_status || "YTBP"
                  });
                  setEditingStudentId(selectedStudent.id);
                  setShowManualModal(true);
                }}
                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-md transition-colors" 
                title="Edit Student"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleDelete(selectedStudent.id)}
                className="p-1.5 hover:bg-red-100 text-red-600 rounded-md transition-colors" 
                title="Move to Trash"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {/* Resume */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-2">
                <span className="text-xs font-semibold">Resume (PDF Preview)</span>
                {selectedStudent.resume_url && (
                  <a href={selectedStudent.resume_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                    Open Link
                  </a>
                )}
              </div>
              <div className="w-full h-64 bg-slate-50 flex items-center justify-center rounded border border-slate-200 text-slate-400 overflow-hidden relative">
                {selectedStudent.resume_url ? (
                  <iframe src={getEmbedUrl(selectedStudent.resume_url)} className="w-full h-full border-0 absolute inset-0" title="Resume Preview" />
                ) : (
                  <div className="flex flex-col items-center opacity-50 z-10">
                    <FileText className="h-10 w-10 mb-2" />
                    <span className="text-xs font-medium">No resume provided</span>
                  </div>
                )}
              </div>
            </div>

            {/* Video */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-2">
                <span className="text-xs font-semibold">Self-Intro Video (Preview)</span>
                {selectedStudent.video_url && (
                  <a href={selectedStudent.video_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                    Open Link
                  </a>
                )}
              </div>
              <div className="w-full h-44 bg-slate-800 flex items-center justify-center rounded relative overflow-hidden group">
                {selectedStudent.video_url ? (
                  isDirectVideo(selectedStudent.video_url) ? (
                    <video src={selectedStudent.video_url} controls className="w-full h-full object-cover" />
                  ) : (
                    <iframe src={getEmbedUrl(selectedStudent.video_url)} title="Video Preview" allowFullScreen className="w-full h-full border-0 absolute inset-0" />
                  )
                ) : (
                  <div className="flex flex-col items-center text-slate-400 z-10">
                    <Play className="h-10 w-10 mb-2 opacity-30" />
                    <span className="text-xs font-medium">No video provided</span>
                  </div>
                )}
              </div>
            </div>

            {/* Photo */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-2">
                <span className="text-xs font-semibold">Photo (JPG Preview)</span>
                {selectedStudent.photo_url && (
                  <a href={selectedStudent.photo_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                    Open Link
                  </a>
                )}
              </div>
              <div className="w-24 h-24 rounded-full bg-emerald-400/20 border-4 border-emerald-400 flex items-center justify-center overflow-hidden">
                <img
                  src={getImageUrl(selectedStudent.photo_url, selectedStudent.name)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Portfolio */}
            <div
              className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 flex flex-col items-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => selectedStudent.portfolio_url && window.open(selectedStudent.portfolio_url, "_blank")}
            >
              <div className="w-full flex justify-between items-center mb-2">
                <span className="text-xs font-semibold">Portfolio (External Link)</span>
              </div>
              <div className="w-full h-24 bg-slate-50 flex flex-col items-center justify-center rounded border border-slate-200 text-slate-400 p-2 text-center">
                {selectedStudent.portfolio_url ? (
                  <>
                    <LayoutTemplate className="h-6 w-6 mb-1 text-blue-500" />
                    <span className="text-[10px] text-slate-600 font-medium break-all line-clamp-2">{selectedStudent.portfolio_url}</span>
                    <span className="text-[10px] text-blue-500 mt-1">Click to open</span>
                  </>
                ) : (
                  <LayoutTemplate className="h-10 w-10 opacity-50" />
                )}
              </div>
            </div>

            {/* GitHub */}
            <div
              className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 flex flex-col items-center cursor-pointer hover:border-slate-800 transition-colors"
              onClick={() => selectedStudent.github_url && window.open(selectedStudent.github_url, "_blank")}
            >
              <div className="w-full flex justify-between items-center mb-2">
                <span className="text-xs font-semibold">GitHub (External Link)</span>
              </div>
              <div className="w-full h-24 bg-slate-50 flex flex-col items-center justify-center rounded border border-slate-200 text-slate-400 p-2 text-center">
                {selectedStudent.github_url ? (
                  <>
                    <LayoutTemplate className="h-6 w-6 mb-1 text-slate-700" />
                    <span className="text-[10px] text-slate-600 font-medium break-all line-clamp-2">{selectedStudent.github_url}</span>
                    <span className="text-[10px] text-slate-700 mt-1">Click to open</span>
                  </>
                ) : (
                  <LayoutTemplate className="h-10 w-10 opacity-50" />
                )}
              </div>
            </div>

            {/* LinkedIn */}
            <div
              className="bg-white rounded-lg p-3 shadow-sm border border-slate-200 flex flex-col items-center cursor-pointer hover:border-blue-600 transition-colors"
              onClick={() => selectedStudent.linkedin_url && window.open(selectedStudent.linkedin_url, "_blank")}
            >
              <div className="w-full flex justify-between items-center mb-2">
                <span className="text-xs font-semibold">LinkedIn (External Link)</span>
              </div>
              <div className="w-full h-24 bg-slate-50 flex flex-col items-center justify-center rounded border border-slate-200 text-slate-400 p-2 text-center">
                {selectedStudent.linkedin_url ? (
                  <>
                    <LayoutTemplate className="h-6 w-6 mb-1 text-blue-600" />
                    <span className="text-[10px] text-slate-600 font-medium break-all line-clamp-2">{selectedStudent.linkedin_url}</span>
                    <span className="text-[10px] text-blue-600 mt-1">Click to open</span>
                  </>
                ) : (
                  <LayoutTemplate className="h-10 w-10 opacity-50" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{editingStudentId ? "Edit Student" : "Add Student Manually"}</h2>
              <button onClick={() => {
                setShowManualModal(false);
                setEditingStudentId(null);
              }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Roll No</label>
                  <input required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.roll_no} onChange={(e) => setFormData({...formData, roll_no: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Name</label>
                  <input required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Department</label>
                  <input required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Gender</label>
                  <select className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Accommodation</label>
                  <select className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.acc} onChange={(e) => setFormData({...formData, acc: e.target.value})}>
                    <option value="Day Scholar">Day Scholar</option>
                    <option value="Hosteller">Hosteller</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Placement Status</label>
                  <select className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.placement_status} onChange={(e) => setFormData({...formData, placement_status: e.target.value})}>
                    <option value="YTBP">YTBP (Yet To Be Placed)</option>
                    <option value="Placed">Placed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Email</label>
                  <input type="email" required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Phone</label>
                  <input required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">SSLC %</label>
                  <input type="number" step="0.1" required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.sslc_percentage} onChange={(e) => setFormData({...formData, sslc_percentage: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">SSLC Year</label>
                  <input required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.sslc_year} onChange={(e) => setFormData({...formData, sslc_year: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">HSC %</label>
                  <input type="number" step="0.1" required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.hsc_percentage} onChange={(e) => setFormData({...formData, hsc_percentage: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">HSC Year</label>
                  <input required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.hsc_year} onChange={(e) => setFormData({...formData, hsc_year: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">UG %</label>
                  <input type="number" step="0.1" required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.ug_percentage} onChange={(e) => setFormData({...formData, ug_percentage: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Grad Year</label>
                  <input required className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.grad_year} onChange={(e) => setFormData({...formData, grad_year: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Resume Link</label>
                  <input className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.resume_url} onChange={(e) => setFormData({...formData, resume_url: e.target.value})} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Intro Video Link</label>
                  <input className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.video_url} onChange={(e) => setFormData({...formData, video_url: e.target.value})} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Photo Link</label>
                  <input className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.photo_url} onChange={(e) => setFormData({...formData, photo_url: e.target.value})} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Portfolio Link</label>
                  <input className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.portfolio_url} onChange={(e) => setFormData({...formData, portfolio_url: e.target.value})} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">GitHub Link</label>
                  <input className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.github_url} onChange={(e) => setFormData({...formData, github_url: e.target.value})} placeholder="https://github.com/..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">LinkedIn Link</label>
                  <input className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500" value={formData.linkedin_url} onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})} placeholder="https://linkedin.com/in/..." />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => {
                  setShowManualModal(false);
                  setEditingStudentId(null);
                }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Upload Excel Sheet</h2>
            <p className="text-sm text-slate-500 mb-6">Upload a .xlsx or .csv file matching the template format (Roll No, Name, Department, etc.)</p>
            <label className={`w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors relative overflow-hidden ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="file"
                accept=".xlsx,.csv"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                ref={fileInputRef}
                onChange={handleExcelUpload}
                disabled={isUploading}
              />
              {isUploading ? <Loader2 className="h-8 w-8 text-blue-500 animate-spin" /> : <Upload className="h-8 w-8 text-slate-400" />}
              <span className="text-sm font-medium text-slate-600">{isUploading ? "Uploading & Processing..." : "Click or drag to select file"}</span>
            </label>
            <div className="mt-6">
              <button
                onClick={() => setShowExcelModal(false)}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Confirmation Modal */}
      {showUploadConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-90" />
              <h2 className="text-xl font-bold">Existing Records Detected</h2>
              <p className="text-amber-100 mt-1 text-sm">We found some students that are already in the database.</p>
            </div>
            
            <div className="p-6">
              <div className="flex justify-center gap-6 mb-8">
                <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex-1">
                  <p className="text-3xl font-black text-emerald-600">{uploadStats.newCount}</p>
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mt-1">New Students</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100 flex-1">
                  <p className="text-3xl font-black text-amber-600">{uploadStats.existingCount}</p>
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mt-1">Existing Students</p>
                </div>
              </div>
              
              <p className="text-slate-600 text-sm text-center mb-6">
                Would you like to <strong className="text-slate-800">update</strong> the existing student records with the new data from this spreadsheet, or <strong className="text-slate-800">skip</strong> them and only add the new students?
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => pendingUploadFile && processFinalUpload(pendingUploadFile, "upsert")}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md disabled:opacity-70"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Update Existing & Add New
                </button>
                <button
                  onClick={() => pendingUploadFile && processFinalUpload(pendingUploadFile, "insert_only")}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-70"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Skip Existing (Add {uploadStats.newCount} New Only)
                </button>
                <button
                  onClick={() => {
                    setShowUploadConfirmModal(false);
                    setPendingUploadFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={isUploading}
                  className="w-full mt-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
