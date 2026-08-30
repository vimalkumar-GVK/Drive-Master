import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, UserSquare2, Building2, 
  FileBarChart2, Sparkles, Briefcase, 
  CheckCircle2, PlusCircle, Award, LogOut, ArrowLeftRight
} from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "admin" | "manager" | "placement_lead" | "student" | "recruiter";
}

export function Sidebar({ className, role }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const getLinks = () => {
    const base = `/${role.replace("_", "-")}`;

    if (role === "student") {
      return [
        { name: "Student Dashboard", href: `${base}`, icon: LayoutDashboard },
        { name: "Campus Drives & Jobs", href: `${base}`, icon: Briefcase },
        { name: "AI ATS Resume Analyzer", href: `${base}`, icon: Sparkles },
        { name: "My Applications", href: `${base}`, icon: CheckCircle2 },
      ];
    }

    if (role === "recruiter") {
      return [
        { name: "Recruiter Dashboard", href: `${base}`, icon: LayoutDashboard },
        { name: "Candidate ATS Pipeline", href: `${base}`, icon: Users },
        { name: "Post Job Description", href: `${base}`, icon: PlusCircle },
        { name: "Shortlisted Candidates", href: `${base}`, icon: Award },
      ];
    }

    // Default: Admin / Manager / Placement Lead
    const links = [
      { name: "Dashboard", href: `${base}`, icon: LayoutDashboard },
    ];

    if (role === "admin" || role === "manager" || role === "placement_lead") {
      links.push({ name: "Student Details", href: `${base}/students`, icon: UserSquare2 });
    }
    
    if (role === "admin" || role === "manager") {
      links.push({ name: "Placement Team & Industry", href: `${base}/team`, icon: Users });
    }

    if (role === "admin" || role === "manager" || role === "placement_lead") {
      links.push({ name: "Recruiters", href: `${base}/recruiters`, icon: Building2 });
      links.push({ name: "Reports", href: `${base}/reports`, icon: FileBarChart2 });
    }

    return links;
  };

  const links = getLinks();

  const getRoleColors = (r: string) => {
    switch (r) {
      case "manager": return { accent: "bg-emerald-500", text: "text-emerald-400", shadow: "shadow-[0_0_10px_rgba(16,185,129,0.8)]", glow: "bg-emerald-500/10", iconBg: "from-emerald-500 to-teal-600" };
      case "placement_lead": return { accent: "bg-amber-500", text: "text-amber-400", shadow: "shadow-[0_0_10px_rgba(245,158,11,0.8)]", glow: "bg-amber-500/10", iconBg: "from-amber-500 to-orange-600" };
      default: return { accent: "bg-indigo-500", text: "text-indigo-400", shadow: "shadow-[0_0_10px_rgba(99,102,241,0.8)]", glow: "bg-indigo-500/10", iconBg: "from-indigo-500 to-purple-600" };
    }
  };
  const colors = getRoleColors(role);

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-slate-900 via-[#111827] to-indigo-950 text-slate-300 w-[280px] flex flex-col shrink-0 shadow-2xl z-20 justify-between relative overflow-hidden", className)}>
      {/* Decorative background glow */}
      <div className={`absolute top-0 left-0 w-full h-64 ${colors.glow} blur-[100px] pointer-events-none`}></div>
      
      <div className="relative z-10">
        {/* Portal Header */}
        <div className="h-20 flex items-center px-8 shrink-0 border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${colors.iconBg} flex items-center justify-center shadow-lg shadow-indigo-500/20 mr-3`}>
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Placement AI
            </h2>
            <div className={`text-[10px] uppercase font-bold ${colors.text} tracking-widest mt-0.5`}>
              {role.replace("_", " ")} Portal
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <div className="py-8 px-4">
          <div className="space-y-1.5">
            {links.map((link, idx) => {
              const isActive = location.pathname === link.href || (link.href !== `/${role.replace("_", "-")}` && location.pathname.startsWith(link.href));
              return (
                <Link
                  key={idx}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-300 rounded-xl relative overflow-hidden group",
                    isActive
                      ? "text-white bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] border border-white/5"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 ${colors.accent} rounded-r-full ${colors.shadow}`}></div>
                  )}
                  <link.icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", isActive ? colors.text : "opacity-70")} />
                  <span className="relative z-10">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Role Switcher & Sign Out Footer */}
      <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-md space-y-3 relative z-10">
        <button
          onClick={() => navigate("/login")}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
        >
          <LogOut className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
