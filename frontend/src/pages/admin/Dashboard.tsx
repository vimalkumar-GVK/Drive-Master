import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../../lib/api";
import { Users, X, Edit2, Trash2 } from "lucide-react";

interface MetricsData {
  student_info: {
    total: number;
    registered: number;
    placed: number;
    not_placed: number;
    avg_ctc: number;
    pending_interviews: number;
  };
  students_list: {
    roll_no: string;
    name: string;
    department: string;
    email: string;
    phone: string;
    status: string;
  }[];
  team_members: {
    name: string;
    role: string;
    avatar: string;
    email: string;
  }[];
  companies: {
    name: string;
    location: string;
    contact: string;
    appeared: number;
    selected: number;
    ctc: number;
  }[];
  monthly_placements: any[];
}

const getDepartmentColor = (dept: string) => {
  const d = dept.toLowerCase();
  if (d.includes('cse')) return 'bg-blue-100 text-blue-600';
  if (d.includes('ece')) return 'bg-indigo-100 text-indigo-600';
  if (d.includes('mech')) return 'bg-orange-100 text-orange-600';
  if (d.includes('it')) return 'bg-emerald-100 text-emerald-600';
  return 'bg-slate-100 text-slate-600';
};

const getStatusColor = (status: string) => {
  if (status.toLowerCase() === 'placed') return 'bg-emerald-500 text-white';
  if (status.toLowerCase() === 'scheduled') return 'bg-amber-500 text-white';
  return 'bg-slate-300 text-white';
};

const getRoleBadge = (role: string) => {
  const r = role.toLowerCase();
  if (r.includes('lead')) return 'bg-indigo-500 text-white';
  if (r.includes('external')) return 'bg-blue-500 text-white';
  if (r.includes('training')) return 'bg-emerald-500 text-white';
  return 'bg-slate-400 text-white';
};

export function AdminDashboard() {
  const location = useLocation();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const isAdmin = true;
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingEmail, setEditingEmail] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "Manager"
  });

  const fetchMetrics = async () => {
    try {
      const response = await api.get("/dashboard/admin/metrics");
      setData(response.data);
    } catch (err) {
      console.error("Failed to fetch metrics", err);
      setError("Failed to load dashboard metrics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Member management moved to TeamManagement.tsx

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading Dashboard Metrics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="p-8 text-center text-slate-500">No data available</div>;

  const chartData = data.monthly_placements || [];

  const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 pb-12 bg-[#F1F5F9] min-h-full rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel 1 Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview & insights for placements • Updated today, {currentDate} • {currentTime}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input type="text" placeholder="Search students, companies..." className="pl-10 pr-4 py-2 bg-white rounded-lg text-sm border-none shadow-sm focus:ring-2 focus:ring-indigo-500 w-64" />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button className="p-2 bg-white rounded-lg shadow-sm text-slate-600 hover:text-indigo-600 relative">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-red-500"></span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-indigo-100 rounded-full text-indigo-600 shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Students</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{data.student_info.total}</h3>
            <p className="text-xs font-medium text-emerald-500 mt-1">+12 this month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-full text-emerald-500 shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Placed</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{data.student_info.placed}</h3>
            <p className="text-xs font-medium text-emerald-500 mt-1">{(data.student_info.placed / (data.student_info.total || 1) * 100).toFixed(1)}% placement rate</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-full text-orange-500 shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Avg CTC (LPA)</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{data.student_info.avg_ctc} LPA</h3>
            <p className="text-xs font-medium text-emerald-500 mt-1">+0.8 LPA vs last year</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-500 shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Pending Interviews</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{data.student_info.pending_interviews}</h3>
            <p className="text-xs font-medium text-blue-500 mt-1">8 scheduled this week</p>
          </div>
        </div>
      </div>

      {/* Main Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Spans 2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Student Information */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Student Information</h2>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">
                {data.students_list.length} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-2">Roll No</th>
                    <th className="py-3 px-2">Name</th>
                    <th className="py-3 px-2">Department</th>
                    <th className="py-3 px-2">Email</th>
                    <th className="py-3 px-2">Phone</th>
                    <th className="py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.students_list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((student, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + idx + 1}. {student.roll_no}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getDepartmentColor(student.department)}`}>
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-700">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${getDepartmentColor(student.department)}`}>
                          {student.department.substring(0, 4)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-500">{student.email}</td>
                      <td className="py-3 px-2 text-slate-500">{student.phone}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 w-max ${getStatusColor(student.status)}`}>
                          {student.status}
                          {student.status.toLowerCase() === 'placed' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-1"></span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.students_list.length === 0 && (
                     <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">No students found.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50 text-xs text-slate-500">
              <span>Showing {Math.min((currentPage - 1) * itemsPerPage + 1, data.students_list.length)}-{Math.min(currentPage * itemsPerPage, data.students_list.length)} of {data.students_list.length}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-slate-400 hover:text-slate-700 disabled:opacity-50"
                >
                  &lt;
                </button>
                {Array.from({ length: Math.ceil(data.students_list.length / itemsPerPage) }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-2 py-1 ${currentPage === i + 1 ? 'font-bold text-slate-700' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(data.students_list.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(data.students_list.length / itemsPerPage) || data.students_list.length === 0}
                  className="px-2 py-1 text-slate-400 hover:text-slate-700 disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>

          {/* Placement Team Members */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 bg-blue-100 rounded text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Placement Team Members</h2>
                  <p className="text-xs text-slate-500">{data.team_members.length} active members</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.team_members.slice(0, 5).map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-3 relative">
                    <div className="relative">
                      <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full bg-slate-100" />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" title="Online"></div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{member.name}</h4>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-[11px] font-bold rounded-full ${getRoleBadge(member.role)}`}>
                      {member.role.split(' ')[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Spans 1) */}
        <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-100 rounded text-teal-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800">Companies & Placement Data</h2>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Avg CTC: {data.student_info.avg_ctc} LPA
            </span>
          </div>

          <div className="flex-1">
            <table className="w-full text-xs text-left mb-8">
              <thead className="text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="py-2">Company</th>
                  <th className="py-2 text-center">Appeared</th>
                  <th className="py-2 text-center">Selected</th>
                  <th className="py-2">CTC (LPA)</th>
                  <th className="py-2">Selection Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.companies.slice(0, 5).map((comp, idx) => {
                  const rate = comp.appeared > 0 ? (comp.selected / comp.appeared) * 100 : 0;
                  return (
                    <tr key={idx}>
                      <td className="py-3 font-semibold text-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 rounded text-center flex items-center justify-center font-bold text-[10px] text-slate-400">
                          {comp.name.charAt(0)}
                        </div>
                        {comp.name.substring(0, 10)}
                      </td>
                      <td className="py-3 text-center text-slate-600 font-medium">{comp.appeared}</td>
                      <td className="py-3 text-center text-slate-800 font-bold">{comp.selected}</td>
                      <td className="py-3 text-emerald-600 font-bold">{comp.ctc > 0 ? comp.ctc : "-"} LPA</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(rate, 100)}%` }}></div>
                          </div>
                          <span className="text-slate-600 font-bold">{rate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Monthly Placements Chart */}
            <div className="mt-auto pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 mb-4">Monthly Placements</h3>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={true} stroke="#e2e8f0" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">Trend: Steadily increasing placement rate</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
