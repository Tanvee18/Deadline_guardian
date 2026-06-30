import React, { useState } from "react";
import { Clock, Calendar, CheckSquare, AlertCircle, Info, Sparkles, Check, Play, Volume2 } from "lucide-react";

export default function TodayDashboard({ 
  deadlines, 
  tasks, 
  scheduleBlocks, 
  driftEvents, 
  onSimulateDrift, 
  onSelectDeadline,
  invokeAgent 
}) {
  const [whyPlanExplanation, setWhyPlanExplanation] = useState("");
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // Expose the Communicator Agent explanation function
  const handleWhyPlan = async () => {
    setLoadingExplanation(true);
    setWhyPlanExplanation("");
    try {
      const data = await invokeAgent("explain-schedule", {});
      if (data && data.explanation) {
        setWhyPlanExplanation(data.explanation);
      }
    } catch (e) {
      console.error(e);
      setWhyPlanExplanation("Failed to load explanation from Communicator Agent.");
    } finally {
      setLoadingExplanation(false);
    }
  };

  const getSubtaskTitle = (taskId) => {
    const t = tasks.find(item => item.id === taskId);
    return t ? t.title : "Unscheduled Task Block";
  };

  const getDeadlineTitle = (taskId) => {
    const t = tasks.find(item => item.id === taskId);
    if (!t) return null;
    const dl = deadlines.find(item => item.id === t.deadline_id);
    return dl ? dl.title : null;
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Upper Grid: Overview Analytics & Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status card */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Status Overview</span>
            <h3 className="text-2xl font-black text-white mt-1">Ready</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Schedule active. {scheduleBlocks.filter(b => b.status === "completed").length} / {scheduleBlocks.length} task blocks completed today.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agent Monitoring Active</span>
          </div>
        </div>

        {/* Deadlines card */}
        <div className="bg-dark-card border border-dark-border p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Deadlines Tracked</span>
            <h3 className="text-2xl font-black text-white mt-1">{deadlines.length} Active</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {deadlines.filter(d => d.priority === "high").length} high-priority deadlines approaching this week.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-rose-400 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Zero Deadlines Overdue</span>
          </div>
        </div>

        {/* Explain Button Card */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/20 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Communicator Agent</span>
            <h3 className="text-lg font-bold text-white mt-1">Why this schedule?</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Query the agent to explain the prioritization choices and time-block arrangements.
            </p>
          </div>
          <button
            onClick={handleWhyPlan}
            disabled={loadingExplanation}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2"
          >
            {loadingExplanation ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Info className="w-4 h-4" />
            )}
            <span>Explain Plan</span>
          </button>
        </div>
      </div>

      {/* Communicator Explanation Card Area */}
      {whyPlanExplanation && (
        <div className="bg-dark-card border border-indigo-500/30 p-5 rounded-2xl relative glow-pulse">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/30 text-indigo-400 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-bold text-white">Communicator Explanation</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                {whyPlanExplanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Timeline Display */}
      <div className="bg-dark-card border border-dark-border rounded-3xl p-6">
        <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Today's Scheduled Blocks
        </h3>

        {scheduleBlocks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-dark-border rounded-2xl">
            <Calendar className="w-8 h-8 mx-auto text-slate-600 mb-3" />
            <p className="text-sm font-medium">Your schedule is currently empty.</p>
            <p className="text-xs text-slate-600 mt-1">Inject a mock email or manual task in the sidebar to populate.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-dark-border pl-6 ml-4 space-y-8">
            {scheduleBlocks.map((block) => {
              const dlTitle = getDeadlineTitle(block.task_id);
              const isMissed = block.status === "missed";
              const isCompleted = block.status === "completed";

              return (
                <div key={block.id} className="relative group">
                  {/* Timeline Dot Indicator */}
                  <div className={`absolute left-[-33px] top-1.5 w-4 h-4 rounded-full border-2 bg-dark-bg transition-colors duration-150 ${
                    isCompleted ? "border-emerald-500 bg-emerald-500" :
                    isMissed ? "border-red-500 bg-red-500" :
                    "border-indigo-400 group-hover:bg-indigo-400"
                  }`} />

                  {/* Block Card */}
                  <div className={`p-4 rounded-2xl border transition duration-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                    isCompleted ? "bg-emerald-950/10 border-emerald-500/20 opacity-70" :
                    isMissed ? "bg-red-950/10 border-red-500/20" :
                    "bg-slate-900/40 border-dark-border hover:border-slate-700"
                  }`}>
                    <div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        <span>{formatTime(block.start_time)} - {formatTime(block.end_time)}</span>
                        {dlTitle && (
                          <span className="text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 max-w-[150px] truncate">
                            For: {dlTitle}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-sm font-bold text-white mt-1.5">{getSubtaskTitle(block.task_id)}</h4>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      {!isCompleted && !isMissed && (
                        <>
                          <button
                            onClick={() => invokeAgent("complete-block", { scheduleBlockId: block.id })}
                            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Complete
                          </button>
                          
                          <button
                            onClick={() => onSimulateDrift(block.id)}
                            className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Simulate Miss
                          </button>
                        </>
                      )}

                      {isCompleted && (
                        <span className="text-xs text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          Done
                        </span>
                      )}

                      {isMissed && (
                        <span className="text-xs text-red-400 font-bold bg-red-500/5 border border-red-500/20 px-2.5 py-1 rounded-lg">
                          Missed (Replanned)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
