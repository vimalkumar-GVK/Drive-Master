import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { UndoRedoControls } from "./UndoRedoControls";

interface DashboardLayoutProps {
  role: "admin" | "manager" | "placement_lead" | "student" | "recruiter";
}

export function DashboardLayout({ role }: DashboardLayoutProps) {
  const getRoleColors = (r: string) => {
    switch (r) {
      case "manager": return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", gradient: "from-emerald-500 to-teal-600" };
      case "placement_lead": return { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", gradient: "from-amber-500 to-orange-600" };
      default: return { text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", gradient: "from-indigo-500 to-purple-600" };
    }
  };
  const colors = getRoleColors(role);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans selection:bg-indigo-500/30">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Decorative background glow for main area */}
        <div className={`absolute top-0 right-0 w-1/2 h-[500px] ${colors.bg.replace('50', '400/5')} blur-[120px] pointer-events-none rounded-full`}></div>

        {/* Top Navbar */}
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-end px-10 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.02)] z-10 sticky top-0">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className={`font-bold text-xs tracking-widest uppercase px-3 py-1.5 rounded-full border ${colors.text} ${colors.bg} ${colors.border}`}>{role.replace("_", " ")}</span>
              <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${colors.gradient} p-[2px] shadow-md`}>
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <User className={`h-5 w-5 ${colors.text}`} />
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <button className={`relative text-slate-400 hover:${colors.text} transition-colors p-2 rounded-full hover:${colors.bg}`}>
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-10 relative z-0">
          <div className="mx-auto max-w-[1600px] animate-in fade-in slide-in-from-bottom-4 duration-200">
            <Outlet context={{ role }} />
          </div>
        </main>
        
        {/* Global Undo/Redo Widget */}
        <UndoRedoControls />
      </div>
    </div>
  );
}
