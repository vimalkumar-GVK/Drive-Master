import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import api from "../../lib/api";

export function VerifyOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const devOtp = searchParams.get("dev_otp");
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (!email) navigate("/login");
    
    // Auto-fill in dev mode
    if (devOtp && devOtp.length === 6) {
      setOtp(devOtp.split(""));
    }
  }, [email, navigate, devOtp]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/verify-otp", { email, otp: otpString });
      navigate(`/reset-password?email=${encodeURIComponent(email)}&token=${res.data.reset_token}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setTimeLeft(300);
      alert("A new OTP has been sent to your email.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to resend OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0F172A_100%)] z-0 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10 glass-panel rounded-2xl p-8 border border-white/10 shadow-2xl slide-in-right">
        <Link to="/forgot-password" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        
        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-sm text-slate-400 mb-8">
          We sent a 6-digit verification code to <span className="font-bold text-white">{email}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            ))}
          </div>

          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</div>}

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Expires in: <span className="font-mono text-white">{formatTime(timeLeft)}</span></span>
            <button
              type="button"
              onClick={handleResend}
              disabled={timeLeft > 0 || isLoading}
              className="text-blue-400 font-bold hover:text-blue-300 disabled:text-slate-600 transition-colors"
            >
              Resend OTP
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join("").length !== 6}
            className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Verify Code"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
