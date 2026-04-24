import React, { useState } from 'react';
import { Calendar, Clock, ChevronRight, Dumbbell, ArrowLeft, CheckCircle2, Play, Edit3 } from 'lucide-react';
import { WorkoutLog, UnitSystem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface WorkoutHistoryProps {
  logs: WorkoutLog[];
  units: UnitSystem;
  onEdit: (log: WorkoutLog) => void;
  onResume: (log: WorkoutLog) => void;
  onUpdateLog: (log: WorkoutLog) => void;
  onDelete: (id: string) => void;
}

export default function WorkoutHistory({ logs, units, onEdit, onResume, onUpdateLog, onDelete }: WorkoutHistoryProps) {
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempLog, setTempLog] = useState<WorkoutLog | null>(null);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start: number, end: number) => {
    const mins = Math.floor((end - start) / 60000);
    return `${mins}m`;
  };

  const getTotalVolume = (log: WorkoutLog) => {
    return log.exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((setTotal, set) => setTotal + ((set.reps || 0) * (set.weight || 0)), 0);
    }, 0);
  };

  const handleEditToggle = () => {
    if (!selectedLog) return;
    if (isEditing) {
      // Save
      if (tempLog) {
        onUpdateLog(tempLog);
        setSelectedLog(tempLog);
      }
      setIsEditing(false);
    } else {
      // Start editing
      setTempLog(JSON.parse(JSON.stringify(selectedLog)));
      setIsEditing(true);
    }
  };

  const updateSet = (exIdx: number, sIdx: number, field: string, value: number) => {
    if (!tempLog) return;
    const newLog = { ...tempLog };
    const newExercises = [...newLog.exercises];
    const newSets = [...newExercises[exIdx].sets];
    newSets[sIdx] = { ...newSets[sIdx], [field]: value };
    newExercises[exIdx] = { ...newExercises[exIdx], sets: newSets };
    newLog.exercises = newExercises;
    setTempLog(newLog);
  };

  if (selectedLog) {
    const displayLog = isEditing ? tempLog! : selectedLog;
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6 pb-24"
      >
        <button 
          onClick={() => setSelectedLog(null)}
          className="flex items-center text-hw-muted hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          <span>Back to History</span>
        </button>

        <div className="glass-panel p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-hw-accent">{selectedLog.planName}</h2>
            <div className="flex items-center space-x-4 text-xs text-hw-muted font-mono mt-2">
              <span className="flex items-center"><Calendar size={12} className="mr-1" /> {formatDate(selectedLog.startTime)}</span>
              <span className="flex items-center"><Clock size={12} className="mr-1" /> {formatTime(selectedLog.startTime)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-xs text-hw-muted uppercase font-bold tracking-widest mb-1">Duration</div>
              <div className="text-xl font-mono font-bold">{formatDuration(selectedLog.startTime, selectedLog.endTime)}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/5">
              <div className="text-xs text-hw-muted uppercase font-bold tracking-widest mb-1">Total Volume</div>
              <div className="text-xl font-mono font-bold text-hw-accent">{getTotalVolume(displayLog)}{units === 'metric' ? 'kg' : 'lbs'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
            <button 
              onClick={() => onResume(selectedLog)}
              className="btn-primary flex items-center justify-center space-x-2 py-3"
            >
              <Play size={16} fill="currentColor" />
              <span>Resume</span>
            </button>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={handleEditToggle}
                className={`btn-secondary flex items-center justify-center space-x-2 py-3 ${isEditing ? 'bg-hw-accent text-black border-hw-accent' : ''}`}
              >
                <Edit3 size={16} />
                <span>{isEditing ? 'Save Changes' : 'Edit Log'}</span>
              </button>
              {isEditing && (
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-hw-muted hover:text-white transition-colors py-2"
                >
                  Cancel
                </button>
              )}
            </div>
            <button 
              onClick={() => {
                onDelete(selectedLog.id);
                setSelectedLog(null);
              }}
              className="col-span-2 text-xs text-red-400/50 hover:text-red-400 transition-colors py-2"
            >
              Delete Log
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-hw-muted uppercase tracking-widest">Exercises</h3>
          {displayLog.exercises.map((ex, idx) => (
            <div key={idx} className="glass-panel p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold">{ex.name}</h4>
                <span className="text-[10px] font-bold uppercase text-hw-muted">{ex.type}</span>
              </div>
              <div className="space-y-2">
                {ex.sets.map((s, sIdx) => (
                  <div key={sIdx} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                    <span className="text-xs text-hw-muted font-mono">Set {sIdx + 1}</span>
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          {ex.type !== 'duration' && (
                            <div className="flex items-center space-x-1">
                              <input 
                                type="number"
                                inputMode="decimal"
                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs font-mono text-center"
                                value={s.reps === 0 ? '' : s.reps}
                                onChange={(e) => updateSet(idx, sIdx, 'reps', parseInt(e.target.value) || 0)}
                              />
                              <span className="text-[10px] text-hw-muted uppercase">R</span>
                            </div>
                          )}
                          {ex.type === 'weightlifting' && (
                            <div className="flex items-center space-x-1">
                              <input 
                                type="number"
                                inputMode="decimal"
                                className="w-14 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs font-mono text-center"
                                value={s.weight === 0 ? '' : s.weight}
                                onChange={(e) => updateSet(idx, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                              />
                              <span className="text-[10px] text-hw-muted uppercase">{units === 'metric' ? 'kg' : 'lb'}</span>
                            </div>
                          )}
                          {ex.type === 'duration' && (
                            <div className="flex items-center space-x-1">
                              <input 
                                type="number"
                                inputMode="decimal"
                                className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs font-mono text-center"
                                value={s.duration === 0 ? '' : s.duration}
                                onChange={(e) => updateSet(idx, sIdx, 'duration', parseInt(e.target.value) || 0)}
                              />
                              <span className="text-[10px] text-hw-muted uppercase">S</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-mono">
                          {ex.type === 'duration' ? `${s.duration}s` : 
                           ex.type === 'bodyweight' ? `${s.reps} reps` :
                           `${s.reps} x ${s.weight}${units === 'metric' ? 'kg' : 'lbs'}`}
                        </span>
                      )}
                      {!isEditing && (s.completed ? <CheckCircle2 size={14} className="text-hw-accent" /> : <div className="w-3.5 h-3.5" />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-hw-muted space-y-4">
        <div className="p-6 rounded-full bg-white/5">
          <Calendar size={48} strokeWidth={1} />
        </div>
        <p className="font-medium">No workouts recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <h2 className="text-xs font-bold text-hw-muted uppercase tracking-widest mb-4">Recent Activity</h2>
      {logs.sort((a, b) => b.startTime - a.startTime).map((log) => (
        <div 
          key={log.id} 
          onClick={() => setSelectedLog(log)}
          className="glass-panel p-4 flex items-center space-x-4 hover:bg-white/5 transition-colors cursor-pointer group"
        >
          <div className="p-3 rounded-xl bg-hw-accent/10 text-hw-accent group-hover:bg-hw-accent group-hover:text-black transition-all">
            <Dumbbell size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate group-hover:text-hw-accent transition-colors">{log.planName}</h3>
            <div className="flex items-center space-x-3 text-xs text-hw-muted font-mono mt-1">
              <span className="flex items-center">
                <Calendar size={12} className="mr-1" />
                {formatDate(log.startTime)}
              </span>
              <span className="flex items-center">
                <Clock size={12} className="mr-1" />
                {formatDuration(log.startTime, log.endTime)}
              </span>
              <span className="text-hw-accent/50">
                {getTotalVolume(log)}{units === 'metric' ? 'kg' : 'lbs'}
              </span>
            </div>
          </div>
          <ChevronRight size={20} className="text-white/10 group-hover:text-hw-accent transition-colors" />
        </div>
      ))}
    </div>
  );
}
