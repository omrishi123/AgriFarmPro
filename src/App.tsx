import { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { LogIn, LogOut, LayoutDashboard, MessageSquare, Map as MapIcon, Users, Tractor, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import FarmProfile from './components/FarmProfile';
import WorkerManagement from './components/WorkerManagement';
import GeminiChat from './components/GeminiChat';
import Logistics from './components/Logistics';
import { initFirebase, auth, db } from './firebase';

// Lazy loading Firebase reference
let authInstance: any = null;
let dbInstance: any = null;

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [stats, setStats] = useState({
    totalArea: 0,
    workerCount: 0,
    pendingShipments: 0,
    farmName: ''
  });

  useEffect(() => {
    const init = async () => {
      try {
        const response = await fetch('/firebase-applet-config.json');
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const firebaseObj = await initFirebase();
            if (firebaseObj) {
              authInstance = firebaseObj.auth;
              dbInstance = firebaseObj.db;
              
              authInstance.onAuthStateChanged((user: FirebaseUser | null) => {
                setUser(user);
                setLoading(false);
              });
              setFirebaseReady(true);
            } else {
              setLoading(false);
            }
          } else {
            console.warn('Firebase config is not JSON. It might be the SPA fallback.');
            setLoading(false);
          }
        } else {
          console.warn('Firebase config not found. Please set up Firebase in the UI.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!firebaseReady || !user || !db) return;

    // 1. Subscribe to Farm profile details
    const farmDocRef = doc(db, 'farms', user.uid);
    const unsubFarm = onSnapshot(farmDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStats(prev => ({
          ...prev,
          totalArea: data.totalArea || 0,
          farmName: data.farmName || ''
        }));
      }
    });

    // 2. Subscribe to Workers count on this farm
    const qWorkers = query(collection(db, 'workers'), where('assignedFarmId', '==', user.uid));
    const unsubWorkers = onSnapshot(qWorkers, (snap) => {
      setStats(prev => ({
        ...prev,
        workerCount: snap.size
      }));
    });

    // 3. Subscribe to active (pending/in-transit) logistics requests
    const qLogistics = query(collection(db, 'logistics_bookings'), where('farmId', '==', user.uid));
    const unsubLogistics = onSnapshot(qLogistics, (snap) => {
      const pendingAndTransit = snap.docs.filter(
        d => d.data().status === 'pending' || d.data().status === 'in_transit'
      ).length;
      setStats(prev => ({
        ...prev,
        pendingShipments: pendingAndTransit
      }));
    });

    return () => {
      unsubFarm();
      unsubWorkers();
      unsubLogistics();
    };
  }, [firebaseReady, user]);

  const handleLogin = async () => {
    if (!authInstance) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(authInstance, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    if (!authInstance) return;
    try {
      await signOut(authInstance);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!firebaseReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 p-6 text-center">
        <Tractor className="w-16 h-16 text-emerald-600 mb-4" />
        <h1 className="text-2xl font-bold text-emerald-900 mb-2">AgriFarm Pro</h1>
        <p className="text-emerald-700 max-w-md">
          Firebase setup is required to continue. Please ensure you have accepted the terms and the setup process has completed successfully.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-emerald-50 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl shadow-emerald-100 max-w-md w-full text-center"
        >
          <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Tractor className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">Welcome to AgriFarm</h1>
          <p className="text-emerald-600 mb-8">Manage your farm, workers, and logistics with ease.</p>
          
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-200"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Farm Profile', icon: Settings },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'ai-chat', label: 'Ask Expert', icon: MessageSquare },
    { id: 'logistics', label: 'Logistics', icon: MapIcon },
  ];

  return (
    <div className="flex flex-col h-screen bg-emerald-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Tractor className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-emerald-900">AgriFarm Pro</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-emerald-900">{user.displayName}</span>
            <span className="text-xs text-emerald-500">{user.email}</span>
          </div>
          <img 
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-emerald-100"
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={handleLogout}
            className="p-2 text-emerald-400 hover:text-emerald-600 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-emerald-900">Farm Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
                    <h3 className="text-emerald-500 text-sm font-medium mb-1">Total Area</h3>
                    <p className="text-3xl font-bold text-emerald-900">
                      {stats.totalArea > 0 ? `${stats.totalArea} Acres` : 'Not Configured'}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
                    <h3 className="text-emerald-500 text-sm font-medium mb-1">Active Workers</h3>
                    <p className="text-3xl font-bold text-emerald-900">{stats.workerCount}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
                    <h3 className="text-emerald-500 text-sm font-medium mb-1">Active Shipments</h3>
                    <p className="text-3xl font-bold text-emerald-900">{stats.pendingShipments}</p>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 min-h-[300px] flex flex-col items-center justify-center text-center">
                  <div className="bg-emerald-50 p-4 rounded-full mb-4">
                    <LayoutDashboard className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-emerald-900">
                    {stats.farmName ? `Welcome to ${stats.farmName}` : 'Welcome to your Dashboard'}
                  </h3>
                  <p className="text-emerald-600 max-w-sm mt-1">
                    {stats.farmName 
                      ? 'All systems online. Access your operational modules using the bottom navigation menu.' 
                      : 'To get started, update your farm name, size, and location in the Farm Profile tab below.'}
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'profile' && (
              <FarmProfile userId={user.uid} />
            )}
            {activeTab === 'workers' && (
              <WorkerManagement farmId={user.uid} />
            )}
            {activeTab === 'ai-chat' && (
              <GeminiChat />
            )}
            {activeTab === 'logistics' && (
              <Logistics farmId={user.uid} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="bg-white border-t border-emerald-100 px-6 py-2 flex justify-around items-center shadow-lg overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[80px]",
              activeTab === tab.id 
                ? "text-emerald-600 bg-emerald-50" 
                : "text-emerald-400 hover:text-emerald-500 hover:bg-emerald-50/50"
            )}
          >
            <tab.icon className={cn("w-6 h-6", activeTab === tab.id && "animate-pulse")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
