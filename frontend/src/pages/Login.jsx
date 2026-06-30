import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Calendar, Shield, Sparkles, RefreshCw } from "lucide-react";

export default function Login() {
  const { user, onboarded, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    if (onboarded) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/onboarding" replace />;
    }
  }

  const handleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      setError(e.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-4xl bg-dark-card border border-dark-border rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row glow-pulse">
        {/* Left Side: Product Intro */}
        <div className="flex-1 bg-gradient-to-br from-indigo-950/60 to-slate-900/80 p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-dark-border">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/30">
                <Shield className="w-6 h-6 text-indigo-400" />
              </div>
              <span className="font-semibold text-white tracking-wide text-lg">DeadlineGuardian</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
              It doesn't remind you.<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
                It replans your day.
              </span>
            </h1>
            
            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6">
              An AI-powered companion that monitors your Google Calendar, scans your emails for deadlines, and dynamically optimizes your schedule when plans fall behind.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-3 bg-dark-bg/60 border border-dark-border rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-400 mb-2" />
              <div className="font-semibold text-white text-xs">AI Extraction</div>
              <div className="text-[10px] text-slate-500">Gemini extracts task items from Gmail</div>
            </div>
            <div className="p-3 bg-dark-bg/60 border border-dark-border rounded-xl">
              <RefreshCw className="w-5 h-5 text-violet-400 mb-2" />
              <div className="font-semibold text-white text-xs">Self-Correcting</div>
              <div className="text-[10px] text-slate-500">Drift detection triggers auto-replanning</div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Action */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center items-center bg-slate-900/40">
          <div className="w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
            <p className="text-slate-400 text-sm mb-8">
              Sign in with your Google account to authorize secure Gmail and Calendar sync.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-xs text-left">
                {error}
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 font-semibold py-3.5 px-6 rounded-xl transition duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>{loading ? "Initializing..." : "Sign in with Google"}</span>
            </button>

            <div className="mt-8 flex items-center gap-2 justify-center text-[11px] text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Google API demo environment (Mock enabled)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
