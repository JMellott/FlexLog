import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Edit3, X, Save, List } from 'lucide-react';
import { WorkoutPlan, Exercise, WorkoutLog, WorkoutSet, UnitSystem } from '../types';
import RestTimer from './RestTimer';
import { motion, AnimatePresence } from 'motion/react';

interface ActiveWorkoutProps {
  plan: WorkoutPlan;
  initialLog?: WorkoutLog;
  isEditing?: boolean;
  onComplete: (log: WorkoutLog) => void;
  onExit: () => void;
  units: UnitSystem;
}

interface WorkoutStep {
  exerciseIdx: number;
  setIdx: number;
}

export default function ActiveWorkout({ plan, initialLog, isEditing, onComplete, onExit, units }: ActiveWorkoutProps) {
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    if (initialLog) return JSON.parse(JSON.stringify(initialLog.exercises));
    return JSON.parse(JSON.stringify(plan.exercises));
  });
  const [currentStepIdx, setCurrentStepIdx] = useState(() => {
    if (initialLog) {
      // Find the first uncompleted set
      const flatSets: WorkoutStep[] = [];
      const processedExerciseIndices = new Set<number>();
      for (let i = 0; i < initialLog.exercises.length; i++) {
        if (processedExerciseIndices.has(i)) continue;
        const currentEx = initialLog.exercises[i];
        if (currentEx.supersetId) {
          const supersetGroup: number[] = [];
          for (let j = i; j < initialLog.exercises.length; j++) {
            if (initialLog.exercises[j].supersetId === currentEx.supersetId) {
              supersetGroup.push(j);
              processedExerciseIndices.add(j);
            } else break;
          }
          const maxSets = Math.max(...supersetGroup.map(idx => initialLog.exercises[idx].sets.length));
          for (let s = 0; s < maxSets; s++) {
            for (const exIdx of supersetGroup) {
              if (s < initialLog.exercises[exIdx].sets.length) {
                flatSets.push({ exerciseIdx: exIdx, setIdx: s });
              }
            }
          }
        } else {
          for (let s = 0; s < currentEx.sets.length; s++) {
            flatSets.push({ exerciseIdx: i, setIdx: s });
          }
          processedExerciseIndices.add(i);
        }
      }
      const firstUncompleted = flatSets.findIndex(step => !initialLog.exercises[step.exerciseIdx].sets[step.setIdx].completed);
      return firstUncompleted === -1 ? 0 : firstUncompleted;
    }
    return 0;
  });
  const [startTime] = useState(initialLog?.startTime || Date.now());
  const [showPlanView, setShowPlanView] = useState(isEditing || false);
  const [editingSet, setEditingSet] = useState<{ exIdx: number, setIdx: number } | null>(null);
  const [editValues, setEditValues] = useState<Partial<WorkoutSet>>({});
  const [timerKey, setTimerKey] = useState(0);
  const [showCompletePrompt, setShowCompletePrompt] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const hasUnfinishedSets = useMemo(() => {
    return exercises.some(ex => ex.sets.some(s => !s.completed));
  }, [exercises]);

  // Flatten the workout into a sequence of steps, accounting for supersets
  const sequence = useMemo(() => {
    const steps: WorkoutStep[] = [];
    const processedExerciseIndices = new Set<number>();

    for (let i = 0; i < exercises.length; i++) {
      if (processedExerciseIndices.has(i)) continue;

      const currentEx = exercises[i];
      if (currentEx.supersetId) {
        // Find all exercises in this superset
        const supersetGroup: number[] = [];
        for (let j = i; j < exercises.length; j++) {
          if (exercises[j].supersetId === currentEx.supersetId) {
            supersetGroup.push(j);
            processedExerciseIndices.add(j);
          } else {
            break; // Supersets must be contiguous
          }
        }

        // Interleave sets: Ex1 S1, Ex2 S1, Ex1 S2, Ex2 S2...
        const maxSets = Math.max(...supersetGroup.map(idx => exercises[idx].sets.length));
        for (let s = 0; s < maxSets; s++) {
          for (const exIdx of supersetGroup) {
            if (s < exercises[exIdx].sets.length) {
              steps.push({ exerciseIdx: exIdx, setIdx: s });
            }
          }
        }
      } else {
        // Normal exercise
        for (let s = 0; s < currentEx.sets.length; s++) {
          steps.push({ exerciseIdx: i, setIdx: s });
        }
        processedExerciseIndices.add(i);
      }
    }
    return steps;
  }, [exercises]);

  const currentStep = sequence[currentStepIdx];
  const currentExercise = exercises[currentStep.exerciseIdx];
  const currentSet = currentExercise.sets[currentStep.setIdx];

  // Find next exercises in the current superset for the stack visual
  const supersetNextExercises = useMemo(() => {
    if (!currentExercise.supersetId) return [];
    const nextExs: string[] = [];
    const seen = new Set<string>();
    seen.add(currentExercise.id);

    for (let i = currentStepIdx + 1; i < sequence.length; i++) {
      const step = sequence[i];
      const ex = exercises[step.exerciseIdx];
      if (ex.supersetId === currentExercise.supersetId && !seen.has(ex.id)) {
        nextExs.push(ex.name);
        seen.add(ex.id);
      }
      if (nextExs.length >= 2) break;
    }
    return nextExs;
  }, [currentExercise, currentStepIdx, sequence, exercises]);

  // Find all exercises in the current superset for the title
  const currentSupersetExercises = useMemo(() => {
    if (!currentExercise.supersetId) return [currentExercise];
    return exercises.filter(ex => ex.supersetId === currentExercise.supersetId);
  }, [currentExercise, exercises]);

  // Media Session API for Lock Screen view
  useEffect(() => {
    if ('mediaSession' in navigator) {
      const setInfo = currentExercise.type === 'duration' 
        ? `${currentSet.duration}s` 
        : currentExercise.type === 'bodyweight'
          ? `${currentSet.reps} reps`
          : `${currentSet.reps} x ${currentSet.weight}${units === 'metric' ? 'kg' : 'lbs'}`;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${currentExercise.name} (Set ${currentStep.setIdx + 1})`,
        artist: `FlexLog: ${setInfo}`,
        album: plan.name,
        artwork: [
          { src: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=512&h=512&fit=crop', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        toggleSetComplete();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (currentStepIdx > 0) setCurrentStepIdx(prev => prev - 1);
      });
      
      navigator.mediaSession.playbackState = 'playing';
    }
  }, [currentExercise, currentSet, currentStep, plan.name, units]);

  const handleNext = () => {
    if (currentStepIdx < sequence.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const toggleSetComplete = () => {
    const newExercises = [...exercises];
    const set = newExercises[currentStep.exerciseIdx].sets[currentStep.setIdx];
    set.completed = !set.completed;
    setExercises(newExercises);

    if (set.completed) {
      setTimerKey(prev => prev + 1);
      setTimeout(() => {
        if (currentStepIdx === sequence.length - 1) {
          setShowCompletePrompt(true);
        } else {
          handleNext();
        }
      }, 500);
    }
  };

  const openEdit = () => {
    setEditValues({ ...currentSet });
    setEditingSet({ exIdx: currentStep.exerciseIdx, setIdx: currentStep.setIdx });
  };

  const saveEdit = () => {
    if (!editingSet) return;
    const newExercises = [...exercises];
    newExercises[editingSet.exIdx].sets[editingSet.setIdx] = {
      ...newExercises[editingSet.exIdx].sets[editingSet.setIdx],
      ...editValues
    };
    setExercises(newExercises);
    setEditingSet(null);
  };

  const finishWorkout = () => {
    setShowFinishConfirm(false);
    onComplete({
      id: initialLog?.id || crypto.randomUUID(),
      planId: plan.id,
      planName: plan.name,
      startTime,
      endTime: Date.now(),
      exercises
    });
  };

  const addSetDuringWorkout = (exIdx: number) => {
    const newExercises = [...exercises];
    const ex = newExercises[exIdx];
    const lastSet = ex.sets[ex.sets.length - 1];
    let newSet: WorkoutSet = { completed: false };
    
    if (ex.type === 'weightlifting') {
      newSet = { ...newSet, reps: lastSet?.reps || 10, weight: lastSet?.weight || 0 };
    } else if (ex.type === 'bodyweight') {
      newSet = { ...newSet, reps: lastSet?.reps || 10 };
    } else {
      newSet = { ...newSet, duration: lastSet?.duration || 60 };
    }
    
    ex.sets.push(newSet);
    setExercises(newExercises);
  };

  const removeSetDuringWorkout = (exIdx: number, sIdx: number) => {
    if (exercises[exIdx].sets.length <= 1) return;
    
    const newExercises = [...exercises];
    newExercises[exIdx].sets.splice(sIdx, 1);
    
    // Adjust currentStepIdx if needed
    const currentStep = sequence[currentStepIdx];
    if (currentStep.exerciseIdx === exIdx && currentStep.setIdx >= newExercises[exIdx].sets.length) {
      setCurrentStepIdx(Math.max(0, currentStepIdx - 1));
    }
    
    setExercises(newExercises);
  };

  const nextStep = sequence[currentStepIdx + 1];
  const nextInfo = nextStep ? {
    exerciseName: exercises[nextStep.exerciseIdx].name,
    setNumber: nextStep.setIdx + 1,
    details: exercises[nextStep.exerciseIdx].type === 'duration' ? `${exercises[nextStep.exerciseIdx].sets[nextStep.setIdx].duration}s` : 
             exercises[nextStep.exerciseIdx].type === 'bodyweight' ? `${exercises[nextStep.exerciseIdx].sets[nextStep.setIdx].reps} reps` :
             `${exercises[nextStep.exerciseIdx].sets[nextStep.setIdx].reps} x ${exercises[nextStep.exerciseIdx].sets[nextStep.setIdx].weight}${units === 'metric' ? 'kg' : 'lbs'}`
  } : null;

  return (
    <div className="flex flex-col h-full relative pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-hw-accent truncate">{plan.name}</h2>
          <p className="text-hw-muted text-[10px] font-mono uppercase tracking-widest">
            Step {currentStepIdx + 1} of {sequence.length}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowPlanView(!showPlanView)} className={`p-2 rounded-lg transition-colors ${showPlanView ? 'bg-hw-accent text-black' : 'text-hw-muted hover:text-white'}`}>
            <List size={20} />
          </button>
          <button onClick={() => setShowExitConfirm(true)} className="p-2 text-hw-muted hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Persistent Timer View */}
        {currentStepIdx > 0 && (
          <div className={`transition-all duration-300 z-50 ${
            showPlanView 
              ? 'sticky top-0 left-0 right-0 py-2 bg-hw-bg/80 backdrop-blur-md mb-2' 
              : 'absolute bottom-[30%] left-1/2 -translate-x-1/2'
          }`}>
            <RestTimer resetKey={timerKey} />
          </div>
        )}
        <AnimatePresence mode="wait">
          {!showPlanView ? (
            <motion.div
              key={`${currentStep.exerciseIdx}-${currentStep.setIdx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col space-y-4"
            >
              <div className="text-center">
                <div className="flex flex-wrap justify-center items-center gap-1 mb-2">
                  {currentSupersetExercises.map((ex, idx) => (
                    <React.Fragment key={ex.id}>
                      <span className={`text-2xl font-bold transition-all ${ex.id === currentExercise.id ? 'text-white' : 'text-hw-muted opacity-50'}`}>
                        {ex.name}
                      </span>
                      {idx < currentSupersetExercises.length - 1 && <span className="text-hw-muted opacity-30 text-2xl">/</span>}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-center space-x-1">
                  {currentExercise.sets.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1 w-6 rounded-full transition-all ${
                        idx === currentStep.setIdx ? 'bg-hw-accent' : 
                        currentExercise.sets[idx].completed ? 'bg-hw-accent/30' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="relative flex-1 flex flex-col items-center justify-center">
                {/* Visual Stack Background for Supersets */}
                {currentExercise.supersetId && (
                  <>
                    {supersetNextExercises[1] && (
                      <motion.div 
                        className="absolute inset-0 scale-[0.82] translate-y-12 opacity-10 glass-panel max-w-sm mx-auto w-full -z-20 flex items-end justify-center pb-2 border border-white/5 shadow-2xl"
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 0.1, y: 48 }}
                      >
                        <span className="text-[8px] font-bold uppercase tracking-tighter text-hw-muted truncate px-4">
                          {supersetNextExercises[1]}
                        </span>
                      </motion.div>
                    )}
                    {supersetNextExercises[0] && (
                      <motion.div 
                        className="absolute inset-0 scale-[0.9] translate-y-6 opacity-20 glass-panel max-w-sm mx-auto w-full -z-10 flex items-end justify-center pb-2 border border-white/10 shadow-xl"
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 0.2, y: 24 }}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-tight text-hw-muted truncate px-4">
                          {supersetNextExercises[0]}
                        </span>
                      </motion.div>
                    )}
                  </>
                )}
                
                <div className="glass-panel p-6 flex flex-col items-center justify-center space-y-4 w-full max-w-sm mx-auto aspect-square flex-shrink-0 relative bg-hw-card/80 backdrop-blur-xl rounded-t-3xl rounded-b-[4rem] shadow-2xl overflow-hidden">
                   <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-30">
                     <div className="font-mono text-[10px] text-hw-muted uppercase tracking-widest">
                       SET {currentStep.setIdx + 1}
                     </div>
                     <button
                        onClick={openEdit}
                        className="p-2 -mr-2 text-hw-muted hover:text-hw-accent transition-colors"
                     >
                       <Edit3 size={16} />
                     </button>
                   </div>

                 {currentExercise.type !== 'duration' && (
                   <div className="text-center">
                     <div className="text-6xl font-bold font-mono leading-none">
                       {currentSet.reps}
                     </div>
                     <div className="text-hw-muted font-bold uppercase tracking-widest text-[10px] mt-1">
                       Reps
                     </div>
                   </div>
                 )}

                 {currentExercise.type === 'weightlifting' && (
                   <>
                     <div className="h-px w-8 bg-white/10" />
                     <div className="text-center">
                       <div className="text-3xl font-bold font-mono leading-none">
                         {currentSet.weight}<span className="text-sm ml-1">{units === 'metric' ? 'kg' : 'lbs'}</span>
                       </div>
                       <div className="text-hw-muted font-bold uppercase tracking-widest text-[10px] mt-1">
                         Weight
                       </div>
                     </div>
                   </>
                 )}

                 {currentExercise.type === 'duration' && (
                   <div className="text-center">
                     <div className="text-6xl font-bold font-mono leading-none">
                       {currentSet.duration}<span className="text-2xl ml-1">s</span>
                     </div>
                     <div className="text-hw-muted font-bold uppercase tracking-widest text-[10px] mt-1">
                       Duration
                     </div>
                   </div>
                 )}

                 {currentStepIdx > 0 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                      <RestTimer resetKey={timerKey} />
                    </div>
                 )}
                </div>
              </div>

              {/* Next Set Info */}
              <div className="space-y-3">
                {nextInfo && (
                  <div className="glass-panel p-3 bg-white/5 border-white/5">
                    <div className="text-[10px] font-bold text-hw-muted uppercase tracking-widest mb-1">Up Next</div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold truncate mr-2">{nextInfo.exerciseName}</span>
                      <span className="font-mono text-xs text-hw-accent whitespace-nowrap">
                        Set {nextInfo.setNumber}: {nextInfo.details}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 overflow-y-auto space-y-4 pr-1 pb-20"
            >
              {exercises.map((ex, eIdx) => (
                <div key={ex.id} className={`glass-panel p-4 ${eIdx === currentStep.exerciseIdx ? 'border-hw-accent/50 bg-hw-accent/5' : ''}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold">{ex.name}</h4>
                    <button 
                      onClick={() => addSetDuringWorkout(eIdx)}
                      className="text-[10px] font-bold uppercase text-hw-accent bg-hw-accent/10 px-2 py-1 rounded"
                    >
                      + Add Set
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {ex.sets.map((s, sIdx) => (
                      <div key={sIdx} className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            const stepIdx = sequence.findIndex(step => step.exerciseIdx === eIdx && step.setIdx === sIdx);
                            if (stepIdx !== -1) setCurrentStepIdx(stepIdx);
                            setShowPlanView(false);
                          }}
                          className={`flex-1 p-3 rounded-xl flex items-center justify-between font-mono text-xs transition-all ${
                            eIdx === currentStep.exerciseIdx && sIdx === currentStep.setIdx ? 'bg-hw-accent text-black' :
                            s.completed ? 'bg-hw-accent/20 text-hw-accent' : 'bg-white/5 text-hw-muted'
                          }`}
                        >
                          <span>SET {sIdx + 1}</span>
                          <span className="font-bold">
                            {ex.type === 'duration' ? `${s.duration}s` : 
                             ex.type === 'bodyweight' ? `${s.reps} reps` :
                             `${s.reps} x ${s.weight}${units === 'metric' ? 'kg' : 'lbs'}`}
                          </span>
                        </button>
                        <button 
                          onClick={() => removeSetDuringWorkout(eIdx, sIdx)}
                          className="p-3 text-red-400/50 hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="pt-6 pb-4 space-y-4">
        <div className="flex items-center justify-center space-x-6">
          <button 
            onClick={handlePrev}
            disabled={currentStepIdx === 0}
            className="p-3 rounded-full bg-white/5 disabled:opacity-20"
          >
            <ChevronLeft size={24} />
          </button>

          <button 
            onClick={toggleSetComplete}
            className={`p-6 rounded-full shadow-2xl transition-all active:scale-90 ${
              currentSet.completed ? 'bg-hw-accent text-black' : 'bg-white/10 text-white'
            }`}
          >
            <CheckCircle2 size={40} />
          </button>

          <button 
            onClick={handleNext}
            disabled={currentStepIdx === sequence.length - 1}
            className="p-3 rounded-full bg-white/5 disabled:opacity-20"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex items-center justify-center">
          <button 
            onClick={() => setShowFinishConfirm(true)}
            className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-widest"
          >
            Finish & Save Workout
          </button>
        </div>
      </div>

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-6 backdrop-blur-sm">
          <div className={`glass-panel w-full max-w-sm p-8 space-y-6 text-center ${hasUnfinishedSets ? 'border-amber-500/20' : 'border-hw-accent/20'}`}>
            <div className={`w-16 h-16 ${hasUnfinishedSets ? 'bg-amber-500/10' : 'bg-hw-accent/10'} rounded-full flex items-center justify-center mx-auto mb-2`}>
              {hasUnfinishedSets ? (
                <List size={32} className="text-amber-500" />
              ) : (
                <CheckCircle2 size={32} className="text-hw-accent" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">
                {hasUnfinishedSets ? 'Unfinished Sets' : 'Finish Workout?'}
              </h3>
              <p className="text-hw-muted text-sm">
                {hasUnfinishedSets 
                  ? 'You have unfinished sets left in your workout. Are you sure you want to finish?' 
                  : 'Great job! Ready to save your progress to history?'}
              </p>
            </div>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={finishWorkout}
                className={`w-full py-3 ${hasUnfinishedSets ? 'bg-amber-500' : 'bg-hw-accent'} text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-colors`}
              >
                Save Workout
              </button>
              <button 
                onClick={() => setShowFinishConfirm(false)}
                className="w-full py-3 bg-white/5 text-hw-muted rounded-xl font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
              >
                {hasUnfinishedSets ? 'Go Back' : 'Keep Going'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-6 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm p-8 space-y-6 text-center border-red-500/20">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <X size={32} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">End Workout?</h3>
              <p className="text-hw-muted text-sm">Your progress for this session will not be saved.</p>
            </div>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={onExit}
                className="w-full py-3 bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-colors"
              >
                End Session
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3 bg-white/5 text-hw-muted rounded-xl font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
              >
                Continue Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-6">
          <div className="glass-panel w-full max-w-sm p-6 space-y-6">
            <h3 className="text-xl font-bold">Edit Set</h3>
            <div className="grid grid-cols-2 gap-4">
              {exercises[editingSet.exIdx].type !== 'duration' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-hw-muted uppercase">Reps</label>
                  <input 
                    type="number"
                    inputMode="decimal"
                    className="input-field w-full font-mono text-2xl text-center"
                    value={editValues.reps === 0 ? '' : editValues.reps}
                    onChange={(e) => setEditValues({ ...editValues, reps: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              )}
              {exercises[editingSet.exIdx].type === 'weightlifting' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-hw-muted uppercase">Weight ({units === 'metric' ? 'kg' : 'lbs'})</label>
                  <input 
                    type="number"
                    inputMode="decimal"
                    className="input-field w-full font-mono text-2xl text-center"
                    value={editValues.weight === 0 ? '' : editValues.weight}
                    onChange={(e) => setEditValues({ ...editValues, weight: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              )}
              {exercises[editingSet.exIdx].type === 'duration' && (
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-hw-muted uppercase">Duration (s)</label>
                  <input 
                    type="number"
                    inputMode="decimal"
                    className="input-field w-full font-mono text-2xl text-center"
                    value={editValues.duration === 0 ? '' : editValues.duration}
                    onChange={(e) => setEditValues({ ...editValues, duration: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setEditingSet(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveEdit} className="btn-primary flex-1 flex items-center justify-center space-x-2">
                <Save size={20} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Completion Prompt */}
      {showCompletePrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-6">
          <div className="glass-panel w-full max-w-sm p-8 space-y-8 text-center">
            <div className={`w-20 h-20 ${hasUnfinishedSets ? 'bg-amber-500/20' : 'bg-hw-accent/20'} rounded-full flex items-center justify-center mx-auto`}>
              {hasUnfinishedSets ? (
                <List size={48} className="text-amber-500" />
              ) : (
                <CheckCircle2 size={48} className="text-hw-accent" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">
                {hasUnfinishedSets ? 'Workout Finished' : 'Workout Complete!'}
              </h3>
              <p className="text-hw-muted">
                {hasUnfinishedSets 
                  ? 'You reached the end, but have some unfinished sets left.' 
                  : "You've finished all sets in your plan. Great job!"}
              </p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={finishWorkout} 
                className={`w-full py-4 text-lg font-bold rounded-xl transition-all ${hasUnfinishedSets ? 'bg-amber-500 text-black' : 'bg-hw-accent text-black'}`}
              >
                Finish & Save
              </button>
              <button onClick={() => setShowCompletePrompt(false)} className="btn-secondary w-full py-4 text-lg">Continue (Review)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
