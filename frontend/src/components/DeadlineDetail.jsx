import React from "react";
import { ArrowLeft, Calendar, Clock, CheckSquare, Shield, AlertTriangle } from "lucide-react";

export default function DeadlineDetail({ deadline, tasks, scheduleBlocks, onBack }) {
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Header breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition duration-150 text-sm font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Deadline Info Banner */}
      <div className="bg-dark-card border border-dark-border p-8 rounded-3xl relative overflow-hidden">
        {/* Priority background badge */}
        <div className="absolute top-6 right-6">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${
            deadline.priority === "high" ? "bg-red-500/10 text-red-400 border-red-500/20" :
            deadline.priority === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
            "bg-slate-700/30 text-slate-300 border-slate-700/40"
          }`}>
            {deadline.priority} Priority
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Active Deadline Contract</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white">{deadline.title}</h2>
          
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-400 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              Due: <span className="text-slate-300">{formatTime(deadline.due_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Total Effort: <span className="text-slate-300">{totalMinutes} minutes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-bold">
                Source: {deadline.source}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400">Planning Resolution Progress</span>
              <span className="text-indigo-400">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Subtask List & Calendar allocation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subtask Breakdown */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            Planner Subtask Breakdown
          </h3>

          {tasks.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              No planned subtasks.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                    task.status === "completed"
                      ? "bg-slate-900/20 border-slate-800 opacity-60"
                      : "bg-slate-900/40 border-dark-border"
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white">{task.title}</h4>
                    <span className="text-[10px] text-slate-500">{task.estimated_minutes} min estimated</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    task.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    "bg-slate-800 text-slate-400"
                  }`}>
                    {task.status === "completed" ? "Completed" : "Planned"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Schedule Blocks */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Calendar Block Allocation
          </h3>

          {scheduleBlocks.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              No calendar slots booked.
            </div>
          ) : (
            <div className="space-y-3">
              {scheduleBlocks.map((block) => (
                <div
                  key={block.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    block.status === "completed" ? "bg-emerald-950/10 border-emerald-500/20 opacity-60" :
                    block.status === "missed" ? "bg-red-950/10 border-red-500/20" :
                    "bg-slate-900/40 border-dark-border"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold block">
                      {formatTime(block.start_time)} - {formatTime(block.end_time)}
                    </span>
                    <span className="text-xs font-semibold text-white block">
                      {tasks.find(t => t.id === block.task_id)?.title || "Focus Block"}
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                    block.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    block.status === "missed" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {block.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
