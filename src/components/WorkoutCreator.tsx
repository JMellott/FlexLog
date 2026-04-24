import React, { useState } from 'react';
import { Plus, Trash2, Save, X, Download, Upload, Link as LinkIcon, Unlink, CheckCircle2 } from 'lucide-react';
import { WorkoutPlan, Exercise, WorkoutSet, ExerciseType, UnitSystem } from '../types';
import { motion } from 'motion/react';

interface WorkoutCreatorProps {
  onSave: (plan: WorkoutPlan) => void;
  onCancel: () => void;
  units: UnitSystem;
  initialPlan?: WorkoutPlan | null;
}

export default function WorkoutCreator({ onSave, onCancel, units, initialPlan }: WorkoutCreatorProps) {
  const [name, setName] = useState(initialPlan?.name || '');
  const [exercises, setExercises] = useState<Exercise[]>(initialPlan?.exercises ? JSON.parse(JSON.stringify(initialPlan.exercises)) : []);
  const [supersetSelector, setSupersetSelector] = useState<number | null>(null);

  const addExercise = () => {
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: '',
      type: 'weightlifting',
      sets: [{ reps: 10, weight: 0, completed: false }]
    };
    setExercises([...exercises, newExercise]);
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    setExercises(exercises.map(ex => {
      if (ex.id === id) {
        const updated = { ...ex, ...updates };
        // If type changes, reset sets to match new type defaults
        if (updates.type && updates.type !== ex.type) {
          updated.sets = updated.sets.map(s => {
            if (updates.type === 'bodyweight') return { reps: s.reps || 10, completed: false };
            if (updates.type === 'duration') return { duration: 60, completed: false };
            return { reps: 10, weight: 0, completed: false };
          });
        }
        return updated;
      }
      return ex;
    }));
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const setExerciseSuperset = (idx: number, sid: string | undefined) => {
    const newExercises = [...exercises];
    if (sid === 'new') {
      newExercises[idx].supersetId = crypto.randomUUID();
    } else {
      newExercises[idx].supersetId = sid;
    }
    
    // Cleanup: remove SIDs from groups with < 2 members
    const counts: Record<string, number> = {};
    newExercises.forEach(ex => {
      if (ex.supersetId) counts[ex.supersetId] = (counts[ex.supersetId] || 0) + 1;
    });
    newExercises.forEach(ex => {
      if (ex.supersetId && counts[ex.supersetId] < 2) {
        // Only delete if it's not the one we just set (wait, if we set it and it's alone, it should stay until we add another or close)
        // Actually, the user might be setting it to an existing one.
        // Let's just keep it simple: if a superset has only 1 exercise, it's effectively not a superset, but we can keep the ID while editing.
      }
    });
    
    setExercises(newExercises);
    setSupersetSelector(null);
  };

  const getSupersets = () => {
    const groups: Record<string, string> = {};
    exercises.forEach(ex => {
      if (ex.supersetId && !groups[ex.supersetId]) {
        groups[ex.supersetId] = ex.name || 'Untitled Exercise';
      }
    });
    return Object.entries(groups);
  };

  const addSet = (exerciseId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        let newSet: WorkoutSet = { completed: false };
        if (ex.type === 'weightlifting') {
          newSet = { ...newSet, reps: lastSet?.reps || 10, weight: lastSet?.weight || 0 };
        } else if (ex.type === 'bodyweight') {
          newSet = { ...newSet, reps: lastSet?.reps || 10 };
        } else {
          newSet = { ...newSet, duration: lastSet?.duration || 60 };
        }
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    }));
  };

  const updateSet = (exerciseId: string, setIndex: number, updates: Partial<WorkoutSet>) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = [...ex.sets];
        newSets[setIndex] = { ...newSets[setIndex], ...updates };
        return { ...ex, sets: newSets };
      }
      return ex;
    }));
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) };
      }
      return ex;
    }));
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;
    const newExercises = [...exercises];
    const [movedItem] = newExercises.splice(fromIndex, 1);
    newExercises.splice(toIndex, 0, movedItem);
    setExercises(newExercises);
  };

  const handleSave = () => {
    if (!name.trim() || exercises.length === 0) return;
    onSave({
      id: initialPlan?.id || crypto.randomUUID(),
      name,
      exercises,
      createdAt: initialPlan?.createdAt || Date.now()
    });
  };

  const exportPlan = () => {
    const data = JSON.stringify({ name, exercises }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'workout'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importPlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const plan = JSON.parse(event.target?.result as string);
        setName(plan.name || '');
        setExercises(plan.exercises || []);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full pt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Create Plan</h2>
        <div className="flex space-x-2">
          <label className="p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
            <Upload size={20} />
            <input type="file" accept=".json" onChange={importPlan} className="hidden" />
          </label>
          <button onClick={exportPlan} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <Download size={20} />
          </button>
          <button onClick={onCancel} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pb-24 pr-1">
        <div className="space-y-2">
          <label className="text-xs font-bold text-hw-muted uppercase tracking-wider">Plan Name</label>
          <input
            type="text"
            placeholder="e.g. Push Day A"
            className="input-field w-full text-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-4 max-w-md mx-auto w-full">
          {exercises.map((ex, idx) => {
            const isSuperset = idx > 0 && ex.supersetId && ex.supersetId === exercises[idx - 1].supersetId;
            const isNextSuperset = idx < exercises.length - 1 && ex.supersetId && ex.supersetId === exercises[idx + 1].supersetId;
            
            return (
              <motion.div 
                key={ex.id} 
                layout
                className="relative pl-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="absolute top-0 bottom-0 left-0 w-8 flex flex-col items-center z-20">
                  <div className={`w-1 h-full transition-colors ${ex.supersetId ? 'bg-hw-accent' : 'bg-white/5'}`} />
                  <button 
                    onClick={() => setSupersetSelector(supersetSelector === idx ? null : idx)}
                    className={`absolute top-4 -left-1 p-2 rounded-full border shadow-xl transition-all hover:scale-110 active:scale-95 ${
                      ex.supersetId ? 'bg-hw-accent border-hw-accent text-black' : 'bg-hw-bg border-white/10 text-hw-muted hover:text-white'
                    }`}
                    title="Set Superset"
                  >
                    <LinkIcon size={16} />
                  </button>

                  {supersetSelector === idx && (
                    <div className="absolute left-10 top-4 z-50 glass-panel p-2 min-w-[160px] shadow-2xl border-hw-accent/20">
                      <div className="text-[10px] font-bold text-hw-muted uppercase tracking-widest mb-2 px-2">Link to Superset</div>
                      <button 
                        onClick={() => setExerciseSuperset(idx, undefined)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-xs flex items-center justify-between"
                      >
                        <span>None</span>
                        {!ex.supersetId && <CheckCircle2 size={12} className="text-hw-accent" />}
                      </button>
                      <button 
                        onClick={() => setExerciseSuperset(idx, 'new')}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-xs flex items-center text-hw-accent"
                      >
                        + New Superset
                      </button>
                      {getSupersets().map(([sid, label]) => (
                        <button 
                          key={sid}
                          onClick={() => setExerciseSuperset(idx, sid)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-xs flex items-center justify-between"
                        >
                          <span className="truncate mr-2">With: {label}</span>
                          {ex.supersetId === sid && <CheckCircle2 size={12} className="text-hw-accent" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className={`glass-panel p-4 space-y-4 transition-all relative ${
                  isSuperset ? 'border-t-0 rounded-t-none border-l-0 bg-hw-accent/5' : ''
                } ${
                  isNextSuperset ? 'border-b-0 rounded-b-none border-l-0 bg-hw-accent/5' : ''
                }`}>
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-col items-center mr-1">
                      <div className="text-[8px] font-bold text-hw-muted uppercase mb-1">Pos</div>
                      <select 
                        className="bg-white/5 border border-white/10 rounded px-1 py-1 text-[10px] font-mono outline-none appearance-none text-center min-w-[30px]"
                        value={idx}
                        onChange={(e) => moveExercise(idx, parseInt(e.target.value))}
                      >
                        {exercises.map((_, i) => (
                          <option key={i} value={i} className="bg-hw-bg">{i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Exercise Name"
                      className="bg-transparent border-b border-white/10 focus:border-hw-accent outline-none flex-1 py-1 font-bold"
                      value={ex.name}
                      onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                    />
                    <button onClick={() => removeExercise(ex.id)} className="text-red-400 p-1">
                      <Trash2 size={18} />
                    </button>
                  </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-hw-muted uppercase tracking-widest">Type:</span>
                      <div className="flex p-1 bg-white/5 rounded-lg flex-1">
                        {(['weightlifting', 'bodyweight', 'duration'] as ExerciseType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => updateExercise(ex.id, { type })}
                            className={`flex-1 py-1 px-2 rounded-md text-[10px] font-bold uppercase transition-all ${
                              ex.type === type ? 'bg-hw-accent text-black' : 'text-hw-muted hover:text-white'
                            }`}
                          >
                            {type === 'weightlifting' ? 'Weight' : type === 'bodyweight' ? 'Body' : 'Time'}
                          </button>
                        ))}
                      </div>
                    </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-hw-muted uppercase text-center">
                      <div>Set</div>
                      {ex.type !== 'duration' && <div>Reps</div>}
                      {ex.type === 'weightlifting' && <div>Weight ({units === 'metric' ? 'kg' : 'lbs'})</div>}
                      {ex.type === 'duration' && <div className="col-span-2">Duration (s)</div>}
                      <div></div>
                    </div>
                    {ex.sets.map((set, sIdx) => (
                      <div key={sIdx} className="grid grid-cols-4 gap-2 items-center">
                        <div className="text-center font-mono text-sm text-hw-muted">{sIdx + 1}</div>
                        
                        {ex.type !== 'duration' && (
                          <input
                            type="number"
                            inputMode="decimal"
                            className="bg-white/5 rounded-lg py-1 text-center font-mono text-sm"
                            value={set.reps === 0 ? '' : set.reps}
                            onChange={(e) => updateSet(ex.id, sIdx, { reps: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        )}
                        
                        {ex.type === 'weightlifting' && (
                          <input
                            type="number"
                            inputMode="decimal"
                            className="bg-white/5 rounded-lg py-1 text-center font-mono text-sm"
                            value={set.weight === 0 ? '' : set.weight}
                            onChange={(e) => updateSet(ex.id, sIdx, { weight: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        )}

                        {ex.type === 'duration' && (
                          <input
                            type="number"
                            inputMode="decimal"
                            className="col-span-2 bg-white/5 rounded-lg py-1 text-center font-mono text-sm"
                            value={set.duration === 0 ? '' : set.duration}
                            onChange={(e) => updateSet(ex.id, sIdx, { duration: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        )}

                        <button onClick={() => removeSet(ex.id, sIdx)} className="text-white/20 hover:text-red-400 flex justify-center">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSet(ex.id)}
                      className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs font-bold text-hw-muted hover:text-hw-accent hover:border-hw-accent/50 transition-colors"
                    >
                      + Add Set
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <button
          onClick={addExercise}
          className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center space-x-2 text-hw-muted hover:text-hw-accent hover:border-hw-accent/50 transition-all max-w-md mx-auto"
        >
          <Plus size={20} />
          <span className="font-bold">Add Exercise</span>
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-hw-bg via-hw-bg to-transparent">
        <button
          onClick={handleSave}
          disabled={!name.trim() || exercises.length === 0}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          <Save size={20} />
          <span>Save Workout Plan</span>
        </button>
      </div>
    </div>
  );
}
