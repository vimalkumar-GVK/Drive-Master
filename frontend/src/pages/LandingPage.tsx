import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Brain, ArrowRight, Scan, Trophy, Workflow } from 'lucide-react';

export function LandingPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  
  // Mouse spotlight & 3D tilt tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      if (tiltRef.current) {
        const rect = tiltRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;
        
        tiltRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      }
    };
    
    const handleMouseLeave = () => {
      if (tiltRef.current) {
        tiltRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
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

  // Scroll progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${totalScroll / windowHeight}`;
      setScrollProgress(Number(scroll));
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0A0F1F] text-slate-300 font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 z-50 origin-left"
        style={{ width: '100%', transform: `scaleX(${scrollProgress})`, transition: 'transform 0.1s ease-out' }}
      />

      {/* Dynamic Aurora Background & Noise */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay z-10"></div>
        {/* Dot grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
        
        {/* Spotlight */}
        <div 
          className="absolute w-[1000px] h-[1000px] rounded-full bg-blue-500/15 blur-[100px] pointer-events-none transition-transform duration-300 ease-out z-0"
          style={{ transform: `translate(${mousePos.x - 500}px, ${mousePos.y - 500}px)` }}
        />

        {/* Aurora Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] mix-blend-screen aurora-orb" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[120px] mix-blend-screen aurora-orb" style={{ animationDelay: '-4s', animationDuration: '14s' }} />
        <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-teal-600/20 blur-[120px] mix-blend-screen aurora-orb" style={{ animationDelay: '-8s', animationDuration: '10s' }} />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0A0F1F]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">PlacementAI</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          </nav>

          <div className="flex items-center gap-6">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              to="/login"
              className="px-4 py-2 rounded-full bg-white text-slate-900 text-sm font-bold hover:bg-slate-200 transition-colors flex items-center gap-2 group"
            >
              Get Started <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-32">
        {/* HERO SECTION */}
        <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/30 mb-8 backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Sparkles className="h-4 w-4" /> Revolutionizing Campus Hiring
          </div>
          
          <h1 className="stagger-2 text-5xl md:text-[72px] font-[900] tracking-tight text-white mb-8 leading-[1.1] max-w-5xl">
            Match the right talent with the <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">perfect</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500">opportunity</span>
          </h1>
          
          <p className="stagger-3 text-lg md:text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed">
            Our Next-Gen AI Placement Platform leverages deep learning to instantly analyze resumes, rank candidates, and seamlessly manage recruiter pipelines.
          </p>
          
          <div className="stagger-4 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link 
              to="/login"
              className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-lg font-bold transition-all hover:scale-[1.02] shadow-[0_0_40px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 w-full sm:w-auto overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 flex items-center gap-2">Access Portal <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></span>
            </Link>
            <a 
              href="#features"
              className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white text-lg font-semibold hover:bg-white/10 transition-all flex items-center justify-center w-full sm:w-auto backdrop-blur-sm"
            >
              Explore Features
            </a>
          </div>
        </section>

        {/* FLOATING DASHBOARD PREVIEW */}
        <section className="stagger-5 px-6 max-w-6xl mx-auto -mt-6 perspective-container relative z-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none z-0" />
          
          <div 
            ref={tiltRef}
            className="dashboard-3d transition-transform duration-200 ease-out will-change-transform relative z-10"
          >
            <div className="glass-panel rounded-[24px] p-2 aspect-[16/9] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-[#0f172a] to-slate-800 z-0 opacity-80" />
              
              {/* Floating particles */}
              {[...Array(10)].map((_, i) => (
                <div key={`p-${i}`} className="particle" style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 3 + 1}px`,
                  height: `${Math.random() * 3 + 1}px`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${Math.random() * 3 + 2}s`
                }} />
              ))}
              
              {/* Subtle Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] [background-size:40px_40px] z-0" />

              {/* Fake UI Header */}
              <div className="h-12 border-b border-white/10 flex items-center px-6 gap-4 relative z-10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                  <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                  <div className="w-3 h-3 rounded-full bg-slate-600/50" />
                </div>
                <div className="h-6 w-48 bg-slate-800/50 rounded-md" />
              </div>

              {/* Fake UI Content */}
              <div className="p-8 h-full relative z-10 flex flex-col md:flex-row gap-8">
                
                {/* Floating Badge (Top Left Overflow) */}
                <div className="absolute -top-4 -left-4 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-800/80 border border-white/10 shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-xl z-30 transform hover:scale-105 transition-transform duration-300">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest mb-0.5">ATS MATCH SCORE</p>
                    <p className="text-sm text-white font-extrabold">94% - Excellent Match</p>
                  </div>
                </div>

                {/* LEFT PANEL - CANDIDATE RANKING (AI) */}
                <div className="flex-1 flex flex-col relative z-10 mt-6 md:mt-0">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-xs text-slate-400 font-bold tracking-widest">CANDIDATE RANKING (AI)</p>
                    <div className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]">LIVE</div>
                  </div>
                  
                  <div className="flex-1 relative flex items-end justify-between px-4 perspective-container">
                    {/* Neon Line Overlay */}
                    <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path d="M 5 60 Q 15 40, 25 55 T 45 40 T 65 30 T 85 50 T 95 10" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>

                    {[
                      { h: 40, name: "Liam T.", s: "72%" },
                      { h: 70, name: "Sophia K.", s: "85%" },
                      { h: 45, name: "Noah R.", s: "75%" },
                      { h: 90, name: "Aarav S.", s: "94%" },
                      { h: 65, name: "Emma B.", s: "82%" },
                      { h: 85, name: "Oliver J.", s: "91%" },
                      { h: 100, name: "Ava M.", s: "98%" }
                    ].map((bar, i) => (
                      <div key={i} className="relative w-12 h-full flex items-end group cursor-pointer z-10 perspective-container">
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 shadow-xl backdrop-blur-md z-30 whitespace-nowrap pointer-events-none">
                          <p className="text-xs text-white font-bold">{bar.name}</p>
                          <p className="text-[10px] text-cyan-400">{bar.s} Match</p>
                        </div>
                        {/* 3D Bar */}
                        <div 
                          className="w-full relative draw-bar-3d"
                          style={{ height: `${bar.h}%`, animationDelay: `${0.5 + i * 0.1}s` }}
                        >
                          <div className="bar-3d-face bg-gradient-to-t from-blue-600 to-cyan-400 group-hover:from-blue-500 group-hover:to-cyan-300 h-full shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* RIGHT PANEL - PIPELINE CONVERSION */}
                <div className="w-full md:w-[40%] flex flex-col relative z-10 border-l border-white/5 pl-8 mt-8 md:mt-0">
                  <p className="text-xs text-slate-400 font-bold tracking-widest mb-6">PIPELINE CONVERSION</p>
                  
                  {/* 3D Radial/Donut representation */}
                  <div className="relative w-40 h-40 mx-auto mb-8 perspective-container group cursor-pointer">
                    <div className="absolute inset-0 rounded-full border-[16px] border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] transform rotateX(60deg) rotateZ(45deg) group-hover:rotateX(50deg) transition-transform duration-500" />
                    <div className="absolute inset-0 rounded-full border-[16px] border-transparent border-t-blue-500 border-r-teal-400 border-l-violet-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] transform rotateX(60deg) rotateZ(45deg) group-hover:rotateX(50deg) transition-transform duration-500" />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center transform -translate-y-4">
                      <p className="text-2xl font-extrabold text-white drop-shadow-md">87%</p>
                      <p className="text-[9px] text-slate-400 font-bold tracking-wider">HIRED</p>
                    </div>
                  </div>

                  {/* 3D Funnel */}
                  <div className="flex-1 flex flex-col items-center justify-end gap-2 pb-4 perspective-container">
                    <div className="w-full h-8 bg-gradient-to-r from-blue-600/80 to-blue-400/80 rounded-lg transform rotateX(30deg) flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform cursor-pointer">
                      <span className="text-[10px] font-bold text-white tracking-widest drop-shadow-md">1,204 APPLIED</span>
                    </div>
                    <div className="w-[80%] h-8 bg-gradient-to-r from-teal-600/80 to-teal-400/80 rounded-lg transform rotateX(30deg) flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:scale-105 transition-transform cursor-pointer">
                      <span className="text-[10px] font-bold text-white tracking-widest drop-shadow-md">450 SCREENED</span>
                    </div>
                    <div className="w-[50%] h-8 bg-gradient-to-r from-emerald-600/80 to-emerald-400/80 rounded-lg transform rotateX(30deg) flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform cursor-pointer">
                      <span className="text-[10px] font-bold text-white tracking-widest drop-shadow-md">120 HIRED</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* INFINITE MARQUEE */}
        <section className="mt-32 overflow-hidden border-y border-white/5 bg-slate-900/30 py-10">
          <p className="text-center text-sm font-medium text-slate-500 mb-8 tracking-widest">TRUSTED BY LEADING TECH GIANTS</p>
          <div className="relative flex max-w-[100vw] overflow-hidden mask-edges">
            <div className="animate-marquee flex items-center gap-16 pr-16 whitespace-nowrap">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-16 opacity-40 grayscale">
                  <span className="text-2xl font-bold">Google</span>
                  <span className="text-2xl font-bold">Microsoft</span>
                  <span className="text-2xl font-bold">Amazon</span>
                  <span className="text-2xl font-bold">Meta</span>
                  <span className="text-2xl font-bold">Netflix</span>
                  <span className="text-2xl font-bold">Apple</span>
                  <span className="text-2xl font-bold">Stripe</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="max-w-7xl mx-auto px-6 mt-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-8 rounded-[24px] group hover:bg-slate-800/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <Scan className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">AI Resume Analysis</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Deep learning parses 1000s of resumes in seconds, extracting key skills and experiences effortlessly.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-[24px] group hover:bg-slate-800/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Trophy className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Smart Ranking</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Intelligent scoring & ranking ensures the absolute best fit for specific job descriptions based on semantics.</p>
            </div>

            <div className="glass-panel p-8 rounded-[24px] group hover:bg-slate-800/50 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6 border border-violet-500/20 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                <Workflow className="h-6 w-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Pipeline Automation</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Seamless recruiter management from cold leads to hot drives with real-time status updates.</p>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <section className="max-w-5xl mx-auto px-6 mt-32">
          <div className="glass-panel rounded-full py-8 px-12 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-white mb-1">10K+</p>
              <p className="text-sm text-slate-400 font-medium tracking-wide">RESUMES ANALYZED</p>
            </div>
            <div className="w-px h-12 bg-white/10 hidden md:block" />
            <div className="text-center">
              <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-1">94%</p>
              <p className="text-sm text-slate-400 font-medium tracking-wide">MATCH ACCURACY</p>
            </div>
            <div className="w-px h-12 bg-white/10 hidden md:block" />
            <div className="text-center">
              <p className="text-4xl font-extrabold text-white mb-1">500+</p>
              <p className="text-sm text-slate-400 font-medium tracking-wide">COLLEGES TRUST US</p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[#0A0F1F] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-slate-400" />
            <span className="text-lg font-bold text-slate-400">PlacementAI</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
      
      <style>{`
        .mask-edges {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
      `}</style>
    </div>
  );
}
