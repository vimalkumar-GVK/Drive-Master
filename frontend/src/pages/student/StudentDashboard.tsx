import { useState, useEffect } from "react";
import { 
  Sparkles, Briefcase, FileText, CheckCircle2, AlertCircle, 
  TrendingUp, MapPin, Calendar, 
  Upload, ArrowRight, BookOpen, Clock, Award
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  company_name: string;
  location: string;
  package: string;
  role_type: string;
  deadline: string;
  eligibility_criteria: string;
  description: string;
  required_skills: string[];
}

interface Application {
  id: string;
  job_id: string;
  student_roll_no: string;
  company_name: string;
  job_title: string;
  status: string;
  applied_at: string;
  ats_score: number;
  match_status: string;
  ats_evaluation?: {
    key_strengths?: string[];
    missing_skills?: string[];
    recommendations?: string[];
    summary?: string;
    powered_by?: string;
  };
}

import { useQuery } from "@tanstack/react-query";

export function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<"jobs" | "ats" | "applications" | "readiness">("jobs");
  
  // ATS Analyzer State
  const [resumeText, setResumeText] = useState("");
  const [targetJd, setTargetJd] = useState("");
  const [analyzingAts, setAnalyzingAts] = useState(false);
  const [atsResult, setAtsResult] = useState<any>(null);

  // Student Profile Context (simulated active student)
  const studentProfile = {
    name: "Rahul Sharma",
    roll_no: "2024CS108",
    department: "Computer Science & Engineering",
    cgpa: "8.65",
    batch: "2026",
    status: "Eligible for All Tier-1 Drives"
  };

  const { data: jobs = [], refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/api/v1/jobs");
      if (!res.ok) throw new Error("Failed to load jobs");
      return res.json();
    }
  });

  const { data: applications = [], refetch: refetchApplications } = useQuery<Application[]>({
    queryKey: ['applications', studentProfile.roll_no],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/api/v1/jobs/applications/${studentProfile.roll_no}`);
      if (!res.ok) throw new Error("Failed to load applications");
      return res.json();
    }
  });

  const handleApply = async (job: Job) => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          student_roll_no: studentProfile.roll_no,
          resume_text: `Proficient in ${job.required_skills.slice(0, 3).join(", ")}, Data Structures, Algorithms, Web Development, and Cloud Basics.`
        })
      });
      if (res.ok) {
        const result = await res.json();
        alert(`🎉 Application Submitted for ${job.company_name}! Initial AI ATS Score: ${result.application.ats_score}%`);
        refetchApplications();
      }
    } catch (err) {
      alert("Failed to apply for drive.");
    }
  };

  const runCustomAtsAnalysis = async () => {
    if (!targetJd.trim() || !resumeText.trim()) {
      alert("Please enter both the Job Description and your Resume summary/skills text.");
      return;
    }
    setAnalyzingAts(true);
    try {
      const res = await fetch("http://localhost:8000/api/ats/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: targetJd,
          resume_text: resumeText
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setAtsResult(data.data);
      } else {
        alert("Evaluation could not be completed.");
      }
    } catch (err) {
      alert("Error contacting ATS scoring engine.");
    } finally {
      setAnalyzingAts(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Student Welcome Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e293b] via-[#243548] to-[#1e3a5f] p-8 text-white shadow-xl border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold tracking-wide border border-emerald-500/30">
              <Sparkles className="h-3.5 w-3.5" /> AI Placement Portal • Student View
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Welcome back, {studentProfile.name} 👋
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              {studentProfile.department} • Roll No: <span className="font-mono text-emerald-400">{studentProfile.roll_no}</span> • CGPA: <span className="font-semibold text-white">{studentProfile.cgpa}</span>
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex items-center gap-4 bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/60">
            <div className="text-center px-3 border-r border-slate-700">
              <div className="text-2xl font-bold text-emerald-400">{jobs.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Active Drives</div>
            </div>
            <div className="text-center px-3 border-r border-slate-700">
              <div className="text-2xl font-bold text-blue-400">{applications.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Applied</div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl font-bold text-amber-400">88%</div>
              <div className="text-[11px] text-slate-400 font-medium">Avg ATS Match</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white p-1.5 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "jobs"
              ? "bg-[#2B3D52] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Campus Drives & Jobs ({jobs.length})
        </button>

        <button
          onClick={() => setActiveTab("ats")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "ats"
              ? "bg-[#2B3D52] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="h-4 w-4 text-emerald-400" />
          AI Resume ATS Analyzer
        </button>

        <button
          onClick={() => setActiveTab("applications")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "applications"
              ? "bg-[#2B3D52] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          My Applications ({applications.length})
        </button>

        <button
          onClick={() => setActiveTab("readiness")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "readiness"
              ? "bg-[#2B3D52] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Placement Readiness
        </button>
      </div>

      {/* TAB 1: CAMPUS DRIVES */}
      {activeTab === "jobs" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Featured Placement Drives</h2>
              <p className="text-sm text-slate-500">Live recruitment opportunities curated for your department.</p>
            </div>
            <div className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              ✨ 100% Placement Verified
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => {
              const isApplied = applications.some((a) => a.job_id === job.id);
              return (
                <div 
                  key={job.id} 
                  className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group hover:border-slate-300"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center font-bold text-lg text-slate-700 group-hover:scale-105 transition-transform">
                          {job.company_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{job.title}</h3>
                          <p className="text-sm text-slate-500 font-medium">{job.company_name}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {job.package}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" /> Apply before {job.deadline}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Required Skills</div>
                      <div className="flex flex-wrap gap-1.5">
                        {job.required_skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setTargetJd(job.description + "\nRequired Skills: " + job.required_skills.join(", "));
                        setActiveTab("ats");
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Check ATS Score
                    </button>

                    {isApplied ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4" /> Applied
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApply(job)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2B3D52] hover:bg-[#1E2B3C] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        Apply Now <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: AI RESUME ATS ANALYZER */}
      {activeTab === "ats" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-900/10 via-slate-900/5 to-blue-900/10 p-6 rounded-2xl border border-emerald-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">AI-Powered ATS Score & Gap Analysis</h2>
                <p className="text-sm text-slate-600">
                  Powered by Gemini 1.5 Flash. Test your resume against any Job Description to uncover missing skills, match percentages, and optimization tips.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Column */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" /> Target Job Description (JD)
              </h3>
              <textarea
                rows={5}
                value={targetJd}
                onChange={(e) => setTargetJd(e.target.value)}
                placeholder="Paste the job description or role requirements here..."
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2B3D52] font-mono leading-relaxed"
              />

              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 pt-2">
                <Upload className="h-4 w-4 text-emerald-600" /> Your Resume Summary / Skills Content
              </h3>
              <textarea
                rows={6}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content, experience, and project highlights here..."
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2B3D52] font-mono leading-relaxed"
              />

              <button
                disabled={analyzingAts}
                onClick={runCustomAtsAnalysis}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2B3D52] to-[#1E2B3C] hover:from-[#1E2B3C] hover:to-[#0f172a] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {analyzingAts ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Running AI ATS Evaluation...
                  </span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    Analyze Resume Compatibility
                  </>
                )}
              </button>
            </div>

            {/* Results Column */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              {atsResult ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Match</span>
                      <h3 className="text-2xl font-bold text-slate-900">{atsResult.match_status || "Evaluated"}</h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-3xl font-extrabold text-emerald-600">{atsResult.ats_score}%</div>
                      <span className="text-[10px] text-slate-400">Score (0 - 100)</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {atsResult.summary}
                  </p>

                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Identified Strengths
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {atsResult.key_strengths?.map((str: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                          {str}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-500" /> Critical Missing Skills / Gaps
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {atsResult.missing_skills?.map((sk: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-800">Actionable Recommendations:</div>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                      {atsResult.recommendations?.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-[11px] text-slate-400 italic text-right">
                    Engine: {atsResult.powered_by || "Gemini 1.5 Flash"}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-400">
                  <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-slate-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-700 text-sm">No Analysis Generated Yet</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Paste your target JD and resume profile on the left and click "Analyze" to see your AI matching report.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY APPLICATIONS */}
      {activeTab === "applications" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Application Tracker</h3>
                <p className="text-xs text-slate-500">Real-time status of your submissions across college placement drives.</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {applications.length} Total Applications
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-3">
                <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No active applications</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  You have not applied to any campus drives yet. Head over to the Campus Drives tab to get started!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <div key={app.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{app.job_title}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {app.company_name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-4">
                        <span>Applied: {app.applied_at}</span>
                        <span>•</span>
                        <span className="font-medium text-emerald-600">ATS Match: {app.ats_score}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-700">{app.status}</span>
                      </div>
                      <button 
                        onClick={() => alert(`Status for ${app.company_name}: ${app.status}. Placement round updates will be sent via college email.`)}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PLACEMENT READINESS */}
      {activeTab === "readiness" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Target Skills to Build</h3>
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 font-medium flex justify-between items-center">
                <span>System Design & Scalability</span>
                <span className="text-emerald-600 font-bold">High Demand</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 font-medium flex justify-between items-center">
                <span>Docker & Cloud Deployment</span>
                <span className="text-blue-600 font-bold">Recommended</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-700 font-medium flex justify-between items-center">
                <span>REST API Architecture</span>
                <span className="text-emerald-600 font-bold">High Demand</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Placement Readiness Score</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Academic Eligibility</span>
                <span className="font-bold text-emerald-600">100%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full w-full" />
              </div>

              <div className="flex justify-between items-center text-xs pt-2">
                <span className="text-slate-600">Core Technical Readiness</span>
                <span className="font-bold text-blue-600">85%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full w-[85%]" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Upcoming Campus Rounds</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="border-l-2 border-emerald-500 pl-3 py-1">
                <div className="font-bold text-slate-800">Microsoft Online Assessment</div>
                <div className="text-slate-500">Oct 28, 2026 • 10:00 AM</div>
              </div>
              <div className="border-l-2 border-blue-500 pl-3 py-1">
                <div className="font-bold text-slate-800">Google Technical Round 1</div>
                <div className="text-slate-500">Nov 15, 2026 • 02:00 PM</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
