import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Mail, Lock, ArrowLeft, Eye, EyeOff, Loader2, Target, BarChart
} from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Parallax tracking
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      
      if (tiltRef.current) {
        const rect = tiltRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        
        tiltRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }
    };
    
    const handleMouseLeave = () => {
      if (tiltRef.current) {
        tiltRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    if (tiltRef.current) {
      tiltRef.current.addEventListener('mouseleave', handleMouseLeave);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (tiltRef.current) {
        tiltRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      // Need to use URLSearchParams because backend expects OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      // We use standard fetch here or axios api instance
      // Assuming api instance from "../../lib/api" is available? Wait, import it.
      // Let's import it at the top
      
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1") + "/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 404 || res.status === 403) {
          setError(data.detail || "Login failed");
        } else {
          setError("Login failed. Please try again.");
        }
        return;
      }
      
      // success
      localStorage.setItem("token", data.access_token);
      
      const role = data.user?.role?.toUpperCase() || "ADMIN";
      if (role === "MANAGER") {
        navigate("/manager");
      } else if (role === "PLACEMENT_LEAD") {
        navigate("/placement_lead");
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans overflow-hidden bg-[#10172A] text-slate-300 selection:bg-blue-500/30">
      
      {/* Left Panel - Branding (Hidden on small mobile, turns into header on lg mobile) */}
      <div className="hidden lg:flex w-[45%] relative flex-col justify-between overflow-hidden bg-[#0A0F1F] border-r border-white/5 p-12 z-10">
        
        {/* Animated Background & Noise */}
        <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
        
        {/* Aurora Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] mix-blend-screen aurora-orb pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] mix-blend-screen aurora-orb pointer-events-none" style={{ animationDelay: '-4s', animationDuration: '14s' }} />
        
        {/* Header */}
        <div className="relative z-20 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 group bg-white p-2 rounded-xl w-max shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-[1.02] transition-transform">
            <img src="/logo-full.png" alt="Rathinam College of Arts & Science" className="h-10 object-contain" />
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col justify-center flex-1 my-12">
          <h1 className="text-5xl font-[900] text-white mb-8 leading-[1.1] tracking-tight">
            Streamline your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              hiring pipeline
            </span>
          </h1>
          
          {/* 3D Illustration Area */}
          <div 
            ref={tiltRef}
            className="relative h-64 w-full transition-transform duration-200 ease-out will-change-transform perspective-container flex items-center justify-center"
          >
            {/* Main Glass Card */}
            <div className="absolute inset-0 max-w-sm mx-auto glass-panel rounded-2xl p-6 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform rotateY(-10deg) rotateX(10deg) flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Target className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">AI Resume Match</p>
                  <p className="text-emerald-400 text-xs font-semibold">98% Accuracy</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <BarChart className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Candidate Score</p>
                  <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-blue-500 w-[85%] rounded-full relative">
                      <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/50 blur-[2px]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Mini Card */}
            <div className="absolute -right-4 -bottom-4 glass-panel rounded-xl px-4 py-3 border border-white/10 shadow-2xl transform translate-z-[50px] animate-float flex items-center gap-3">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold tracking-wider">THIS MONTH</p>
                <p className="text-sm text-white font-bold">2,500+ Placements</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-20 stagger-5">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-[#0A0F1F] bg-slate-800 flex items-center justify-center text-xs font-bold text-white bg-[url('https://i.pravatar.cc/100?img=${i+10}')] bg-cover shadow-lg`} />
              ))}
            </div>
            <p className="text-sm font-medium text-slate-400">
              Trusted by <span className="text-white">50+</span> leading universities
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative w-full lg:w-[55%]">
        
        {/* Soft Vignette & Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#10172A_100%)] pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none z-0" />

        {/* Mobile Header (Only visible on small screens) */}
        <div className="lg:hidden absolute top-8 left-8 z-20">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/rgu-logo.png" alt="Rathinam Global University" className="h-8 object-contain" />
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">RGU Placement Portal</span>
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[380px] space-y-8 relative z-10 slide-in-right">
          
          <div className="text-center lg:text-left space-y-2 stagger-1">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-4 lg:hidden uppercase tracking-wider">
              <ArrowLeft className="h-3 w-3" /> Back to Home
            </Link>
            <h2 className="text-3xl font-[900] text-white tracking-tight">Welcome back</h2>
            <p className="text-slate-400 text-sm">Sign in to your portal to continue</p>
          </div>

          {/* Form */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm px-4 py-3 rounded-xl mb-6 flex items-center justify-center font-medium">
              {error}
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-6 mt-4">
            <div className="space-y-2 stagger-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-900/50 backdrop-blur-md border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                  placeholder="admin@example.com (try 'manager')"
                />
              </div>
            </div>

            <div className="space-y-2 stagger-3">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">Forgot password?</Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3.5 rounded-xl bg-slate-900/50 backdrop-blur-md border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="stagger-4 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-white text-slate-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowLeft className="h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
            
            <p className="text-center text-xs text-slate-500 font-medium stagger-5">
              Don't have an account? <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors ml-1">Contact IT Support</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
