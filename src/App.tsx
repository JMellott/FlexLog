import React, { useState, useEffect } from 'react';
import { Plus, Dumbbell, History, Settings as SettingsIcon, Share2, Trash2, Play, ChevronLeft, Edit3, Download, Copy } from 'lucide-react';
import { WorkoutPlan, WorkoutLog, UserSettings } from './types';
import WorkoutCreator from './components/WorkoutCreator';
import ActiveWorkout from './components/ActiveWorkout';
import WorkoutHistory from './components/WorkoutHistory';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [view, setView] = useState<'home' | 'create' | 'workout' | 'settings'>('home');
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [settings, setSettings] = useState<UserSettings>({ units: 'metric' });

  // Load data
  useEffect(() => {
    const savedPlans = localStorage.getItem('flexlog_plans');
    const savedLogs = localStorage.getItem('flexlog_logs');
    const savedSettings = localStorage.getItem('flexlog_settings');
    if (savedPlans) setPlans(JSON.parse(savedPlans));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('flexlog_plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('flexlog_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('flexlog_settings', JSON.stringify(settings));
  }, [settings]);

  const savePlan = (plan: WorkoutPlan) => {
    if (editingPlan) {
      setPlans(plans.map(p => p.id === editingPlan.id ? plan : p));
    } else {
      setPlans([plan, ...plans]);
    }
    setView('home');
    setEditingPlan(null);
  };

  const editPlan = (plan: WorkoutPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlan(plan);
    setView('create');
  };

  const exportPlan = (plan: WorkoutPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    const data = JSON.stringify(plan, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${plan.name || 'workout'}.json`;
    a.click();
  };

  const importPlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const plan = JSON.parse(event.target?.result as string);
        if (!plan.name || !plan.exercises) throw new Error('Invalid plan');
        const newPlan: WorkoutPlan = {
          ...plan,
          id: crypto.randomUUID(),
          createdAt: Date.now()
        };
        setPlans([newPlan, ...plans]);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const copyPlan = (plan: WorkoutPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPlan: WorkoutPlan = {
      ...JSON.parse(JSON.stringify(plan)),
      id: crypto.randomUUID(),
      name: `${plan.name} (Copy)`,
      createdAt: Date.now()
    };
    setPlans([newPlan, ...plans]);
  };

  const deletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this plan?')) {
      setPlans(plans.filter(p => p.id !== id));
    }
  };

  const startWorkout = (plan: WorkoutPlan) => {
    setSelectedPlan(plan);
    setView('workout');
  };

  const completeWorkout = (log: WorkoutLog) => {
    setLogs([log, ...logs]);
    setView('home');
    setSelectedPlan(null);
  };

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-hw-bg overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full p-6"
          >
            <header className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-hw-accent rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,255,65,0.3)]">
                  <Dumbbell size={24} className="text-black" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">FlexLog</h1>
              </div>
              <button 
                onClick={() => setView('settings')}
                className="p-2 text-hw-muted hover:text-white transition-colors"
              >
                <SettingsIcon size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'plans' ? (
                <div className="space-y-4 pb-24">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold text-hw-muted uppercase tracking-widest">My Plans</h2>
                    <div className="flex items-center space-x-3">
                      <label className="text-hw-accent text-xs font-bold uppercase tracking-widest flex items-center cursor-pointer">
                        <Share2 size={14} className="mr-1" /> Import
                        <input type="file" accept=".json" onChange={importPlan} className="hidden" />
                      </label>
                      <button 
                        onClick={() => {
                          setEditingPlan(null);
                          setView('create');
                        }}
                        className="text-hw-accent text-xs font-bold uppercase tracking-widest flex items-center"
                      >
                        <Plus size={14} className="mr-1" /> New Plan
                      </button>
                    </div>
                  </div>
                  
                  {plans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-hw-muted space-y-4">
                      <div className="p-6 rounded-full bg-white/5">
                        <Plus size={48} strokeWidth={1} />
                      </div>
                      <p className="font-medium">No workout plans yet</p>
                      <button onClick={() => setView('create')} className="btn-secondary text-sm">Create your first plan</button>
                    </div>
                  ) : (
                    plans.map((plan) => (
                      <div 
                        key={plan.id} 
                        onClick={() => startWorkout(plan)}
                        className="glass-panel p-5 flex items-center space-x-4 hover:bg-white/5 transition-all cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold truncate group-hover:text-hw-accent transition-colors">{plan.name}</h3>
                          <p className="text-xs text-hw-muted font-mono mt-1">
                            {plan.exercises.length} Exercises • {plan.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)} Sets
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={(e) => exportPlan(plan, e)}
                            className="p-2 text-white/10 hover:text-hw-accent transition-colors"
                            title="Export"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            onClick={(e) => editPlan(plan, e)}
                            className="p-2 text-white/10 hover:text-hw-accent transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={(e) => copyPlan(plan, e)}
                            className="p-2 text-white/10 hover:text-hw-accent transition-colors"
                            title="Duplicate"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={(e) => deletePlan(plan.id, e)}
                            className="p-2 text-white/10 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="p-3 rounded-full bg-hw-accent/10 text-hw-accent group-hover:bg-hw-accent group-hover:text-black transition-all">
                            <Play size={20} fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <WorkoutHistory logs={logs} units={settings.units} />
              )}
            </div>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-6 pb-8 pt-4 bg-gradient-to-t from-hw-bg via-hw-bg to-transparent">
              <div className="glass-panel p-2 flex items-center justify-around">
                <button 
                  onClick={() => setActiveTab('plans')}
                  className={`flex flex-col items-center p-3 rounded-xl flex-1 transition-all ${activeTab === 'plans' ? 'text-hw-accent bg-hw-accent/10' : 'text-hw-muted hover:text-white'}`}
                >
                  <Dumbbell size={20} />
                  <span className="text-[10px] font-bold uppercase mt-1">Plans</span>
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`flex flex-col items-center p-3 rounded-xl flex-1 transition-all ${activeTab === 'history' ? 'text-hw-accent bg-hw-accent/10' : 'text-hw-muted hover:text-white'}`}
                >
                  <History size={20} />
                  <span className="text-[10px] font-bold uppercase mt-1">History</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div 
            key="create"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-hw-bg p-6"
          >
            <WorkoutCreator 
              onSave={savePlan} 
              onCancel={() => {
                setView('home');
                setEditingPlan(null);
              }} 
              units={settings.units}
              initialPlan={editingPlan}
            />
          </motion.div>
        )}

        {view === 'workout' && selectedPlan && (
          <motion.div 
            key="workout"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="fixed inset-0 z-50 bg-hw-bg p-6"
          >
            <ActiveWorkout 
              plan={selectedPlan} 
              onComplete={completeWorkout} 
              units={settings.units}
              onExit={() => {
                if (confirm('Exit workout? Progress will not be saved.')) {
                  setView('home');
                  setSelectedPlan(null);
                }
              }} 
            />
          </motion.div>
        )}

        {view === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-0 z-50 bg-hw-bg p-6 flex flex-col"
          >
            <header className="flex items-center space-x-4 mb-8">
              <button onClick={() => setView('home')} className="p-2 text-hw-muted hover:text-white">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold">Settings</h2>
            </header>

            <div className="space-y-6">
              <div className="glass-panel p-6 space-y-4">
                <h3 className="text-xs font-bold text-hw-muted uppercase tracking-widest">Units</h3>
                <div className="flex p-1 bg-white/5 rounded-xl">
                  <button 
                    onClick={() => setSettings({ ...settings, units: 'metric' })}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${settings.units === 'metric' ? 'bg-hw-accent text-black' : 'text-hw-muted hover:text-white'}`}
                  >
                    Metric (kg)
                  </button>
                  <button 
                    onClick={() => setSettings({ ...settings, units: 'imperial' })}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${settings.units === 'imperial' ? 'bg-hw-accent text-black' : 'text-hw-muted hover:text-white'}`}
                  >
                    Imperial (lbs)
                  </button>
                </div>
              </div>

              <div className="glass-panel p-6">
                <h3 className="text-xs font-bold text-hw-muted uppercase tracking-widest mb-4">App Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-hw-muted">Version</span>
                    <span className="font-mono">1.2.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-hw-muted">Build</span>
                    <span className="font-mono">Production</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
