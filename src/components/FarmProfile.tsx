import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MapPin, Save, Loader2, Tractor } from 'lucide-react';
import { motion } from 'motion/react';

interface FarmData {
  farmName: string;
  totalArea: number;
  currentCrops: string[];
  location: { lat: number; lng: number } | null;
}

export default function FarmProfile({ userId }: { userId: string }) {
  const [farm, setFarm] = useState<FarmData>({
    farmName: '',
    totalArea: 0,
    currentCrops: [],
    location: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cropInput, setCropInput] = useState('');

  useEffect(() => {
    const fetchFarm = async () => {
      if (!db) return;
      try {
        const farmDoc = await getDoc(doc(db, 'farms', userId));
        if (farmDoc.exists()) {
          setFarm(farmDoc.data() as FarmData);
        }
      } catch (error) {
        console.error('Error fetching farm:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFarm();
  }, [userId]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFarm(prev => ({
          ...prev,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }));
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location. Please check permissions.');
      }
    );
  };

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      const farmRef = doc(db, 'farms', userId);
      await setDoc(farmRef, {
        ...farm,
        ownerId: userId,
        farmId: userId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Farm profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `farms/${userId}`);
    } finally {
      setSaving(false);
    }
  };

  const addCrop = () => {
    if (cropInput.trim() && !farm.currentCrops.includes(cropInput.trim())) {
      setFarm(prev => ({
        ...prev,
        currentCrops: [...prev.currentCrops, cropInput.trim()]
      }));
      setCropInput('');
    }
  };

  const removeCrop = (crop: string) => {
    setFarm(prev => ({
      ...prev,
      currentCrops: prev.currentCrops.filter(c => c !== crop)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-emerald-100 p-3 rounded-xl">
          <Tractor className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-900">Farm Profile</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-emerald-900 mb-2">Farm Name</label>
          <input
            type="text"
            value={farm.farmName}
            onChange={(e) => setFarm(prev => ({ ...prev, farmName: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
            placeholder="Enter farm name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-emerald-900 mb-2">Total Area (Acres)</label>
            <input
              type="number"
              value={farm.totalArea}
              onChange={(e) => setFarm(prev => ({ ...prev, totalArea: parseFloat(e.target.value) }))}
              className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-emerald-900 mb-2">Location</label>
            <button
              onClick={handleGetLocation}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 hover:bg-emerald-50 text-emerald-700 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              {farm.location ? 'Update Location' : 'Get Current'}
            </button>
            {farm.location && (
              <p className="text-[10px] text-emerald-500 mt-1 text-center">
                {farm.location.lat.toFixed(4)}, {farm.location.lng.toFixed(4)}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-emerald-900 mb-2">Current Crops</label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={cropInput}
              onChange={(e) => setCropInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCrop()}
              className="flex-1 px-4 py-3 rounded-xl border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30"
              placeholder="Add a crop (e.g. Wheat)"
            />
            <button
              onClick={addCrop}
              className="px-6 py-3 bg-emerald-100 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-200 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {farm.currentCrops.map(crop => (
              <span
                key={crop}
                className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium border border-emerald-100"
              >
                {crop}
                <button onClick={() => removeCrop(crop)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95 mt-4"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Farm Profile
        </button>
      </div>
    </motion.div>
  );
}
