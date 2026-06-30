import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Navigate } from "react-router-dom";
import { Sparkles, Clock, Compass, Bell, Volume2, Shield } from "lucide-react";

export default function Onboarding() {
  const { user, onboarded, setOnboarded } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form states
  const [focusHours, setFocusHours] = useState("morning"); // morning, afternoon, evening
  const [workStyle, setWorkStyle] = useState("balanced"); // sprint, focused, balanced
  const [notificationStyle, setNotificationStyle] = useState("realtime"); // realtime, digest, silent
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Save onboarding data in Firestore
      await setDoc(doc(db, "user_preferences", user.uid), {
        user_id: user.uid,
        peak_focus_hours: focusHours,
        work_style: workStyle,
        notification_style: notificationStyle,
        voice_enabled: voiceEnabled,
        updated_at: new Date().toISOString()
      });

      setOnboarded(true);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving onboarding choices:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-2xl bg-dark-card border border-dark-border rounded-3xl p-8 md:p-12 shadow-2xl relative">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/30">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-xs font-semibold uppercase text-indigo-400 tracking-wider">Onboarding</span>
        </div>

        <h2 className="text-3xl font-extrabold text-white mb-2">Configure Your Guard</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Tell DeadlineGuardian how you work. Our Scheduler Agent uses these parameters to position task blocks on your calendar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Peak Focus Hours Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              Peak Focus Hours
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "morning", title: "Morning", time: "8 AM - 12 PM" },
                { id: "afternoon", title: "Afternoon", time: "1 PM - 5 PM" },
                { id: "evening", title: "Evening", time: "6 PM - 10 PM" },
              ].map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setFocusHours(slot.id)}
                  className={`p-4 rounded-2xl border text-left transition duration-150 ${
                    focusHours === slot.id
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-dark-border bg-slate-900/40 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-semibold text-sm">{slot.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{slot.time}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Work Style Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <Compass className="w-4 h-4 text-slate-400" />
              Work Strategy
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "sprint", title: "Sprint-heavy", desc: "Short, intense blocks" },
                { id: "focused", title: "Deep Work", desc: "Long, uninterrupted blocks" },
                { id: "balanced", title: "Balanced", desc: "Standard 1-2 hour chunks" },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setWorkStyle(style.id)}
                  className={`p-4 rounded-2xl border text-left transition duration-150 ${
                    workStyle === style.id
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-dark-border bg-slate-900/40 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-semibold text-sm">{style.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Notification Preference */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <Bell className="w-4 h-4 text-slate-400" />
              Notification Settings
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "realtime", title: "Real-time", desc: "Alert immediately on drift" },
                { id: "digest", title: "Daily Digest", desc: "Summary of daily updates" },
                { id: "silent", title: "Silent", desc: "Silent update, no popups" },
              ].map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => setNotificationStyle(notif.id)}
                  className={`p-4 rounded-2xl border text-left transition duration-150 ${
                    notificationStyle === notif.id
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-dark-border bg-slate-900/40 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-semibold text-sm">{notif.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{notif.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Interface Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-900/40 border border-dark-border rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <Volume2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="font-semibold text-sm text-white">Voice Explanations (Phase 2)</div>
                <div className="text-xs text-slate-500">Let Gemini speak schedules & changes out loud.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                voiceEnabled ? "bg-indigo-500" : "bg-slate-700"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  voiceEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition duration-150 shadow-lg disabled:opacity-50"
          >
            {loading ? "Activating Agent..." : "Complete Setup & Launch Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
