import { useState, useEffect } from "react";
import { 
  Building2, PlusCircle, Users, Sparkles, 
  Search, Video, FileText, 
  Award, X
} from "lucide-react";

interface CandidateMatch {
  id: string;
  roll_no: string;
  name: string;
  department: string;
  ug_percentage: number;
  email: string;
  phone: string;
  resume_url: string;
  video_url: string;
  ats_score: number;
  match_status: string;
  key_strengths: string[];
  missing_skills: string[];
  recommendations: string[];
}

interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  package: string;
  deadline: string;
  description: string;
  required_skills: string[];
}

export function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState<"candidates" | "post_job" | "shortlisted">("candidates");
  const [candidates, setCandidates] = useState<CandidateMatch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewUrl, setPreviewUrl] = useState<{ url: string; title: string; type: "pdf" | "video" } | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);

  // Post Job Form State
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("Google Inc.");
  const [location, setLocation] = useState("Bengaluru, India");
  const [packageAmount, setPackageAmount] = useState("20 - 28 LPA");
  const [eligibility, setEligibility] = useState("UG > 70%, No backlogs");
  const [skillsInput, setSkillsInput] = useState("React, TypeScript, Python, TailwindCSS, REST APIs");
  const [jobDescription, setJobDescription] = useState("");
  const [submittingJob, setSubmittingJob] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchCandidates();
  }, [selectedJobId]);

  const fetchJobs = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const url = selectedJobId === "all" 
        ? "http://localhost:8000/api/v1/jobs/candidates/matches"
        : `http://localhost:8000/api/v1/jobs/candidates/matches?job_id=${selectedJobId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !jobDescription) {
      alert("Please fill in the Job Title and Description.");
      return;
    }
    setSubmittingJob(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          company_name: companyName,
          location: location,
          package: packageAmount,
          eligibility_criteria: eligibility,
          description: jobDescription,
          required_skills: skillsInput.split(",").map(s => s.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        alert("✨ Campus Drive Job Description posted successfully!");
        setJobTitle("");
        setJobDescription("");
        fetchJobs();
        setActiveTab("candidates");
      }
    } catch (err) {
      alert("Failed to create job drive.");
    } finally {
      setSubmittingJob(false);
    }
  };

  const toggleShortlist = (id: string) => {
    if (shortlistedIds.includes(id)) {
      setShortlistedIds(shortlistedIds.filter(item => item !== id));
    } else {
      setShortlistedIds([...shortlistedIds, id]);
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Recruiter Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e3a5f] p-8 text-white shadow-xl border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold tracking-wide border border-blue-500/30">
              <Building2 className="h-3.5 w-3.5" /> Corporate Recruiter & Hiring Portal
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Recruitment Intelligence Hub
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Evaluate campus talent, filter high-scoring ATS candidates, preview resumes & video profiles, and manage placement pipelines.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/60">
            <div className="text-center px-3 border-r border-slate-700">
              <div className="text-2xl font-bold text-blue-400">{jobs.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Active JDs</div>
            </div>
            <div className="text-center px-3 border-r border-slate-700">
              <div className="text-2xl font-bold text-emerald-400">{candidates.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Eligible Pool</div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl font-bold text-amber-400">{shortlistedIds.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Shortlisted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white p-1.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("candidates")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "candidates"
                ? "bg-[#2B3D52] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="h-4 w-4" />
            Candidate ATS Pipeline ({candidates.length})
          </button>

          <button
            onClick={() => setActiveTab("post_job")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "post_job"
                ? "bg-[#2B3D52] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Post New Job Description
          </button>

          <button
            onClick={() => setActiveTab("shortlisted")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "shortlisted"
                ? "bg-[#2B3D52] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Award className="h-4 w-4 text-emerald-400" />
            Shortlisted Candidates ({shortlistedIds.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CANDIDATES ATS PIPELINE */}
      {activeTab === "candidates" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Filter By Role/JD:</span>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2B3D52]"
              >
                <option value="all">All Drives & General Benchmark</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.company_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate by name, roll..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2B3D52]"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#2B3D52] border-t-transparent mb-3" />
              <p className="text-xs font-semibold text-slate-500">Evaluating Student Cohort against ATS Engine...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-500">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No matching candidates found</p>
              <p className="text-xs text-slate-400 mt-1">Upload student records via the Admin panel or try a different search filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2B3D52] text-white uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Rank & Candidate</th>
                      <th className="py-3 px-4">Dept & CGPA</th>
                      <th className="py-3 px-4 text-center">ATS Score (AI)</th>
                      <th className="py-3 px-4">Match Status</th>
                      <th className="py-3 px-4">Top Strengths</th>
                      <th className="py-3 px-4 text-center">Profiles</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCandidates.map((c, idx) => {
                      const isShortlisted = shortlistedIds.includes(c.id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-400 text-xs w-5">#{idx + 1}</span>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{c.roll_no}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="font-medium text-slate-800">{c.department}</div>
                            <div className="text-[11px] text-slate-500">UG: {c.ug_percentage}%</div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              c.ats_score >= 80 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : c.ats_score >= 60
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              <Sparkles className="h-3 w-3 mr-1" />
                              {c.ats_score}%
                            </span>
                          </td>

                          <td className="py-4 px-4 font-semibold text-slate-700">
                            {c.match_status}
                          </td>

                          <td className="py-4 px-4 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {c.key_strengths.slice(0, 2).map((s, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium truncate">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setPreviewUrl({
                                  url: c.resume_url || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                                  title: `${c.name} - Resume Preview`,
                                  type: "pdf"
                                })}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors title='Preview Resume'"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setPreviewUrl({
                                  url: c.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                                  title: `${c.name} - Video Intro`,
                                  type: "video"
                                })}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors title='Intro Video'"
                              >
                                <Video className="h-4 w-4" />
                              </button>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => toggleShortlist(c.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isShortlisted
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {isShortlisted ? "✓ Shortlisted" : "Shortlist"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: POST NEW JOB DESCRIPTION */}
      {activeTab === "post_job" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Post New Campus Recruitment Drive</h2>
            <p className="text-xs text-slate-500 mt-1">Publish a Job Description to begin automated AI ATS candidate screening.</p>
          </div>

          <form onSubmit={handleCreateJob} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Job Title / Role *</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Associate Cloud Engineer"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#2B3D52] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Microsoft"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#2B3D52] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru / Remote"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#2B3D52] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Package (CTC)</label>
                <input
                  type="text"
                  value={packageAmount}
                  onChange={(e) => setPackageAmount(e.target.value)}
                  placeholder="e.g. 18 - 24 LPA"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#2B3D52] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Eligibility</label>
                <input
                  type="text"
                  value={eligibility}
                  onChange={(e) => setEligibility(e.target.value)}
                  placeholder="e.g. UG > 70%"
                  className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#2B3D52] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Required Skills (Comma separated)</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="Python, React, Docker, SQL, REST APIs"
                className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#2B3D52] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Detailed Job Description *</label>
              <textarea
                required
                rows={6}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description, key responsibilities, and qualifications..."
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#2B3D52] focus:outline-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={submittingJob}
              className="w-full py-3 rounded-xl bg-[#2B3D52] hover:bg-[#1E2B3C] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {submittingJob ? "Posting Drive..." : "Publish Job & Activate AI ATS Screener"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SHORTLISTED */}
      {activeTab === "shortlisted" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Shortlisted Candidates ({shortlistedIds.length})</h2>
            {shortlistedIds.length > 0 && (
              <button
                onClick={() => alert(`Exporting ${shortlistedIds.length} candidate profiles to Excel/CSV...`)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Export Candidate List
              </button>
            )}
          </div>

          {shortlistedIds.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Award className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold">No candidates shortlisted yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Review the Candidate ATS Pipeline and click "Shortlist" to add students here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.filter(c => shortlistedIds.includes(c.id)).map(c => (
                <div key={c.id} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.department} • Roll: {c.roll_no}</div>
                    <div className="text-xs font-bold text-emerald-700">ATS Score: {c.ats_score}%</div>
                  </div>
                  <button
                    onClick={() => toggleShortlist(c.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                {previewUrl.type === "pdf" ? <FileText className="h-4 w-4 text-blue-600" /> : <Video className="h-4 w-4 text-emerald-600" />}
                {previewUrl.title}
              </h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-900 p-2 flex items-center justify-center">
              {previewUrl.type === "pdf" ? (
                <iframe
                  src={previewUrl.url}
                  className="w-full h-full rounded-lg bg-white"
                  title="Document Preview"
                />
              ) : (
                <video
                  src={previewUrl.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
