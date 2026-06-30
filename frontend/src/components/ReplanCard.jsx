import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Sparkles } from "lucide-react";

export default function ReplanCard({ log }) {
  const [expanded, setExpanded] = useState(false);

  if (!log) return null;

  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6 relative overflow-hidden transition-all duration-300">
      {/* Visual left indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500" />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/30 text-red-400 mt-0.5 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Schedule Re-optimized</span>
              <span className="text-[10px] text-slate-500 font-medium">at {formatDate(log.created_at || new Date().toISOString())}</span>
            </div>
            <h4 className="text-sm font-bold text-white mt-1">Schedule drift detected & resolved</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Drift trigger: <span className="text-slate-300 font-semibold">"{log.reason}"</span>. Remaining tasks were rescheduled.
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 bg-slate-900/60 hover:bg-slate-900 border border-dark-border hover:border-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold self-start sm:self-center transition"
        >
          <span>{expanded ? "Hide Details" : "View Shift Details"}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 pt-4 border-t border-red-500/20 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {/* Old Schedule Block */}
          <div className="p-4 bg-slate-900/40 rounded-xl border border-dark-border">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-600" />
              Pre-Drift Schedule
            </div>
            {log.old_schedule && log.old_schedule.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {log.old_schedule.map((block, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs opacity-50">
                    <span className="truncate text-slate-400 pr-2">{block.title || "Task block"}</span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {block.start_time ? new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-600 italic">No historical timeline snapshot available.</span>
            )}
          </div>

          {/* New Schedule Block */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-indigo-500/10">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Adjusted Schedule
            </div>
            {log.new_schedule && log.new_schedule.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {log.new_schedule.map((block, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="truncate text-slate-300 font-semibold pr-2">{block.title || "Task block"}</span>
                    <span className="font-mono text-[10px] text-indigo-400 shrink-0">
                      {block.start_time ? new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-600 italic">No new scheduled slots generated.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
