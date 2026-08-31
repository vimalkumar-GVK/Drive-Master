import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";
import { Bell, User, Menu } from "lucide-react";
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans selection:bg-indigo-500/30">
      <Sidebar role={role} isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full lg:w-auto">
        {/* Decorative background glow for main area */}
        <div className={`absolute top-0 right-0 w-1/2 h-[500px] ${colors.bg.replace('50', '400/5')} blur-[120px] pointer-events-none rounded-full`}></div>

        {/* Top Navbar */}
        <header className="h-16 md:h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between lg:justify-end px-4 md:px-10 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.02)] z-10 sticky top-0">
          <div className="lg:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center gap-4 md:gap-8">
            <img src="/logo-full.png" alt="Rathinam College" className="h-8 object-contain hidden sm:block mr-2" />
            <div className="flex items-center gap-3">
              <span className={`font-bold text-xs tracking-widest uppercase px-3 py-1.5 rounded-full border ${colors.text} ${colors.bg} ${colors.border}`}>{role.replace("_", " ")}</span>
              <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${colors.gradient} p-[2px] shadow-md`}>
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <User className={`h-5 w-5 ${colors.text}`} />
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`relative text-slate-400 hover:${colors.text} transition-colors p-2 rounded-full hover:${colors.bg}`}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </button>
              
              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-800">Notifications</h3>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">3 New</span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto">
                      <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">New Student Registered</p>
                          <p className="text-xs text-slate-500 mt-0.5">Rahul from B.Tech has registered for Google Drive.</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">5 minutes ago</span>
                        </div>
                      </div>
                      <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">System Update</p>
                          <p className="text-xs text-slate-500 mt-0.5">The platform has been updated with new ATS features.</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">2 hours ago</span>
                        </div>
                      </div>
                      <div className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Manager Added</p>
                          <p className="text-xs text-slate-500 mt-0.5">A new placement manager was added to your team.</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">1 day ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
                      <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                        Mark all as read
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 relative z-0">
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
