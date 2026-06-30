import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc, setDoc, addDoc } from "firebase/firestore";
import TodayDashboard from "../components/TodayDashboard";
import DeadlineDetail from "../components/DeadlineDetail";
import ReplanCard from "../components/ReplanCard";
import {
  Calendar,
  CheckSquare,
  AlertTriangle,
  LogOut,
  Settings,
  Plus,
  Mail,
  Play,
  Volume2,
  User,
  Info,
  Clock
} from "lucide-react";

export default function Dashboard() {
  const { user, onboarded, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("today"); // today, deadlines, settings
  const [selectedDeadlineId, setSelectedDeadlineId] = useState(null);

  // Data States
  const [deadlines, setDeadlines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [driftEvents, setDriftEvents] = useState([]);
  const [replanLogs, setReplanLogs] = useState([]);
  const [preferences, setPreferences] = useState(null);

  // Manual Trigger Input State
  const [mockEmailText, setMockEmailText] = useState("");
  const [mockTaskTitle, setMockTaskTitle] = useState("");
  const [mockTaskDueDate, setMockTaskDueDate] = useState("");
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState("");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  // Load user data from Firestore in real-time
  useEffect(() => {
    // 1. Preferences
    const prefUnsub = onSnapshot(doc(db, "user_preferences", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setPreferences(docSnap.data());
      }
    });

    // 2. Deadlines
    const deadlineQuery = query(collection(db, "deadlines"), where("user_id", "==", user.uid));
    const deadlineUnsub = onSnapshot(deadlineQuery, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setDeadlines(list.sort((a, b) => new Date(a.due_at) - new Date(b.due_at)));
    });

    // 3. Tasks (subtasks)
    const taskUnsub = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setTasks(list);
    });

    // 4. Schedule Blocks
    const scheduleUnsub = onSnapshot(collection(db, "schedule_blocks"), (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setScheduleBlocks(list.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
    });

    // 5. Drift Events
    const driftUnsub = onSnapshot(collection(db, "drift_events"), (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setDriftEvents(list.sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at)));
    });

    // 6. Replan Logs
    const replanUnsub = onSnapshot(collection(db, "replan_logs"), (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setReplanLogs(list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    });

    return () => {
      prefUnsub();
      deadlineUnsub();
      taskUnsub();
      scheduleUnsub();
      driftUnsub();
      replanUnsub();
    };
  }, [user.uid]);

  // Backend Agent Invocation Handler
  const invokeAgent = async (endpoint, payload) => {
    setTriggerLoading(true);
    setTriggerMessage("");
    try {
      // Points to our local emulator functions API
      const baseUrl = window.location.hostname === "localhost"
        ? "http://localhost:5001/deadline-guardian-demo/us-central1/api"
        : (import.meta.env.VITE_API_URL || "/api"); // fallback for deployed function

      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: user.uid, ...payload })
      });

      if (!response.ok) {
        throw new Error(`Agent returned status ${response.status}`);
      }

      const data = await response.json();
      setTriggerMessage(data.message || "Agent execution complete!");
      return data;
    } catch (e) {
      console.error(e);
      setTriggerMessage(`Error: ${e.message}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  // Trigger Mock Email Extraction
  const handleEmailExtract = async (e) => {
    e.preventDefault();
    if (!mockEmailText.trim()) return;
    await invokeAgent("extract-deadline", {
      text: mockEmailText,
      source: "gmail"
    });
    setMockEmailText("");
  };

  // Trigger Manual Task Add
  const handleManualTaskAdd = async (e) => {
    e.preventDefault();
    if (!mockTaskTitle.trim() || !mockTaskDueDate) return;
    await invokeAgent("extract-deadline", {
      text: `Task: ${mockTaskTitle}. It is due on ${mockTaskDueDate}.`,
      source: "manual"
    });
    setMockTaskTitle("");
    setMockTaskDueDate("");
  };

  // Trigger Simulated Task Miss (Drift Event)
  const handleSimulateDrift = async (blockId) => {
    await invokeAgent("simulate-drift", { scheduleBlockId: blockId });
  };

  const handleClearDatabase = async () => {
    if (window.confirm("Are you sure you want to clear your local schedule data to start fresh?")) {
      await invokeAgent("clear-database", {});
    }
  };

  const activeDeadline = deadlines.find(d => d.id === selectedDeadlineId);

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Top Header */}
      <header className="bg-dark-card border-b border-dark-border py-4 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/30">
            <Calendar className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">DeadlineGuardian</h1>
            <p className="text-[10px] text-slate-500 font-medium">"It doesn't remind you. It replans your day."</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-dark-bg/80 border border-dark-border px-3 py-1.5 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">{user.email}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-transparent hover:border-red-500/20 transition duration-150"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Sidebar navigation */}
        <aside className="w-full lg:w-64 bg-dark-card border-b lg:border-b-0 lg:border-r border-dark-border p-4 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-1">
              <button
                onClick={() => { setActiveTab("today"); setSelectedDeadlineId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition duration-150 ${activeTab === "today" && !selectedDeadlineId
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
              >
                <Clock className="w-4 h-4" />
                Today's Planner
              </button>

              <div className="pt-4 pb-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 px-4 tracking-wider">Active Deadlines</span>
              </div>

              {deadlines.length === 0 ? (
                <div className="text-xs text-slate-500 px-4 py-2 italic">No active deadlines.</div>
              ) : (
                deadlines.map((dl) => (
                  <button
                    key={dl.id}
                    onClick={() => { setSelectedDeadlineId(dl.id); setActiveTab("deadlines"); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs transition duration-150 ${selectedDeadlineId === dl.id
                      ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold"
                      : "text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
                      }`}
                  >
                    <span className="truncate pr-2">{dl.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${dl.priority === "high" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      dl.priority === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        "bg-slate-700 text-slate-300"
                      }`}>{dl.priority}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* User Bio Footer */}
          <div className="mt-8 pt-4 border-t border-dark-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              {user.displayName ? user.displayName.charAt(0) : "D"}
            </div>
            <div>
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">{user.displayName || "Developer User"}</div>
              <div className="text-[10px] text-slate-500 capitalize">{preferences?.work_style || "Balanced"} Mode</div>
            </div>
          </div>
        </aside>

        {/* Center Content Pane */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Active Replan Card Notification banner if any drift detected */}
          {replanLogs.length > 0 && activeTab === "today" && (
            <ReplanCard log={replanLogs[0]} />
          )}

          {activeTab === "today" && !selectedDeadlineId ? (
            <TodayDashboard
              deadlines={deadlines}
              tasks={tasks}
              scheduleBlocks={scheduleBlocks}
              driftEvents={driftEvents}
              onSimulateDrift={handleSimulateDrift}
              onSelectDeadline={(id) => { setSelectedDeadlineId(id); setActiveTab("deadlines"); }}
              invokeAgent={invokeAgent}
            />
          ) : (
            selectedDeadlineId && activeDeadline ? (
              <DeadlineDetail
                deadline={activeDeadline}
                tasks={tasks.filter(t => t.deadline_id === selectedDeadlineId)}
                scheduleBlocks={scheduleBlocks.filter(b => b.task_id && tasks.some(t => t.id === b.task_id && t.deadline_id === selectedDeadlineId))}
                onBack={() => { setSelectedDeadlineId(null); setActiveTab("today"); }}
              />
            ) : (
              <div className="bg-dark-card border border-dark-border p-8 rounded-2xl text-center text-slate-500">
                Choose a deadline from the sidebar or go to Today's Planner.
              </div>
            )
          )}
        </main>

        {/* Right Sidebar: Hackathon Developer Demo Panel */}
        <aside className="w-full lg:w-80 bg-dark-card border-t lg:border-t-0 lg:border-l border-dark-border p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-dark-border pb-3">
            <Play className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Demo Control Panel</h2>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Use this panel to simulate asynchronous environment triggers (email receipts or task inputs) to witness the live agent extraction, planning, and scheduling process.
          </p>

          {/* Simulate Gmail Intake */}
          <form onSubmit={handleEmailExtract} className="space-y-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              Simulate Gmail Inbound
            </label>
            <textarea
              rows={3}
              value={mockEmailText}
              onChange={(e) => setMockEmailText(e.target.value)}
              placeholder="e.g. 'Hey, can you prepare the slides for the Q3 pitch by Friday at 3:00 PM? High priority.'"
              className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={triggerLoading || !mockEmailText.trim()}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition disabled:opacity-50"
            >
              Simulate Inbound Email
            </button>
          </form>

          {/* Simulate Manual Input */}
          <form onSubmit={handleManualTaskAdd} className="space-y-3 pt-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              Add Task (Manual Text)
            </label>
            <input
              type="text"
              value={mockTaskTitle}
              onChange={(e) => setMockTaskTitle(e.target.value)}
              placeholder="Task title (e.g. Finish tax filing)"
              className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
            <input
              type="datetime-local"
              value={mockTaskDueDate}
              onChange={(e) => setMockTaskDueDate(e.target.value)}
              className="w-full bg-dark-bg border border-dark-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={triggerLoading || !mockTaskTitle.trim() || !mockTaskDueDate}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition disabled:opacity-50"
            >
              Analyze & Schedule Task
            </button>
          </form>

          {/* Trigger Message Status */}
          {triggerMessage && (
            <div className={`p-3 rounded-xl text-xs border ${triggerMessage.startsWith("Error")
              ? "bg-red-900/10 border-red-500/20 text-red-400"
              : "bg-indigo-950/20 border-indigo-500/20 text-indigo-400"
              }`}>
              <div className="font-semibold mb-1">Agent Update:</div>
              <div className="font-mono text-[10px] break-words">{triggerMessage}</div>
            </div>
          )}

          {/* Reset / Developer Utility */}
          <div className="pt-4 border-t border-dark-border space-y-2">
            <button
              onClick={handleClearDatabase}
              className="w-full hover:bg-red-950/20 border border-transparent hover:border-red-500/20 text-red-500 text-xs font-semibold py-2 px-4 rounded-xl transition"
            >
              Clear Demo Database
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
