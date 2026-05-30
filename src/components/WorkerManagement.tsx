import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Users, UserPlus, Trash2, Calendar, DollarSign, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Worker {
  id: string;
  workerName: string;
  dailyWage: number;
  assignedFarmId: string;
  attendanceRecord: Record<string, boolean>;
}

export default function WorkerManagement({ farmId }: { farmId: string }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: '', wage: 500 });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'workers'), where('assignedFarmId', '==', farmId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workerList: Worker[] = [];
      snapshot.forEach((doc) => {
        workerList.push({ id: doc.id, ...doc.data() } as Worker);
      });
      setWorkers(workerList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workers');
    });

    return () => unsubscribe();
  }, [farmId]);

  const handleAddWorker = async () => {
    if (!db || !newWorker.name) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'workers'), {
        workerName: newWorker.name,
        dailyWage: newWorker.wage,
        assignedFarmId: farmId,
        attendanceRecord: {},
        createdAt: serverTimestamp()
      });
      setNewWorker({ name: '', wage: 500 });
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workers');
    } finally {
      setAdding(false);
    }
  };

  const toggleAttendance = async (workerId: string, currentRecord: Record<string, boolean>) => {
    if (!db) return;
    const today = new Date().toISOString().split('T')[0];
    const newRecord = { ...currentRecord, [today]: !currentRecord[today] };
    try {
      await updateDoc(doc(db, 'workers', workerId), {
        attendanceRecord: newRecord
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workers/${workerId}`);
    }
  };

  const deleteWorker = async (workerId: string) => {
    if (!db || !confirm('Are you sure you want to remove this worker?')) return;
    try {
      await deleteDoc(doc(db, 'workers', workerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workers/${workerId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-3 rounded-xl">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900">Worker Management</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-emerald-100"
        >
          <UserPlus className="w-5 h-5" />
          Add Worker
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {workers.map((worker) => {
            const today = new Date().toISOString().split('T')[0];
            const isPresent = worker.attendanceRecord[today];
            return (
              <motion.div
                key={worker.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg">
                    {worker.workerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-900">{worker.workerName}</h3>
                    <div className="flex items-center gap-3 text-xs text-emerald-500 mt-1">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {worker.dailyWage}/day
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAttendance(worker.id, worker.attendanceRecord)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isPresent 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-500'
                    }`}
                  >
                    {isPresent ? <CheckCircle2 className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    {isPresent ? 'Present' : 'Mark Present'}
                  </button>
                  <button
                    onClick={() => deleteWorker(worker.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {workers.length === 0 && (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-emerald-100 text-center">
          <Users className="w-12 h-12 text-emerald-200 mx-auto mb-4" />
          <p className="text-emerald-400">No workers added yet. Click "Add Worker" to start.</p>
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-emerald-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-emerald-900 mb-6">Add New Worker</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-emerald-900 mb-2">Worker Name</label>
                <input
                  type="text"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-emerald-900 mb-2">Daily Wage (₹)</label>
                <input
                  type="number"
                  value={newWorker.wage}
                  onChange={(e) => setNewWorker(prev => ({ ...prev, wage: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-emerald-100 text-emerald-600 font-semibold hover:bg-emerald-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWorker}
                  disabled={adding || !newWorker.name}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-3 rounded-xl transition-all"
                >
                  {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Worker'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
