import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MapPin, Navigation, Truck, Loader2, Plus, Calendar, Check, AlertCircle, Sparkles, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Booking {
  id: string;
  bookingId: string;
  farmId: string;
  pickupName: string;
  dropoffName: string;
  truckType: string;
  loadSize: number; // in tons
  distance: number; // in km
  estimatedPrice: number;
  status: 'pending' | 'in_transit' | 'delivered';
  createdAt: any;
}

const TRUCK_TYPES = [
  { id: 'mini', name: 'Tata Ace (Small)', capacity: '1.5 Tons', ratePerKm: 18, icon: '🚚' },
  { id: 'medium', name: 'Mahindra Pik-Up (Medium)', capacity: '3.0 Tons', ratePerKm: 28, icon: '🚛' },
  { id: 'large', name: 'Eicher 14ft (Large)', capacity: '7.0 Tons', ratePerKm: 45, icon: '🚛' },
];

const HUB_LOCATIONS = [
  { id: 'market-1', name: 'Apex Central Aggregation Market', latOffset: 0.05, lngOffset: -0.05, type: 'market' },
  { id: 'cold-1', name: 'Greenfield Cold Storage Facility', latOffset: -0.04, lngOffset: 0.07, type: 'cold' },
  { id: 'market-2', name: 'Regional Grain Terminal & Port', latOffset: 0.12, lngOffset: 0.03, type: 'market' },
  { id: 'cold-2', name: 'SuperFresh Multi-temp Cold Vault', latOffset: -0.08, lngOffset: -0.06, type: 'cold' }
];

export default function Logistics({ farmId }: { farmId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.2090 }); // Default to Delhi
  const [gpsLoading, setGpsLoading] = useState(false);

  // Form states
  const [selectedHub, setSelectedHub] = useState(HUB_LOCATIONS[0].id);
  const [selectedTruck, setSelectedTruck] = useState(TRUCK_TYPES[0].id);
  const [loadSize, setLoadSize] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState<string>('');

  useEffect(() => {
    // Standard Geolocation check
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setGpsLoading(false);
        },
        () => {
          setGpsLoading(false); // Fallback to default
        }
      );
    }

    if (!db) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'logistics_bookings'),
      where('farmId', '==', farmId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Booking);
      });
      // Sort bookings by creation time if possible, or keep as retrieved
      setBookings(list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Error reading logistics bookings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [farmId]);

  const targetHub = HUB_LOCATIONS.find(h => h.id === selectedHub) || HUB_LOCATIONS[0];
  const targetTruck = TRUCK_TYPES.find(t => t.id === selectedTruck) || TRUCK_TYPES[0];

  // Simple visual Euclidean distance generator for mock route realism
  const calculateSimulatedDistance = () => {
    const latDiff = targetHub.latOffset * 111.32; // ~111km per degree
    const lngDiff = targetHub.lngOffset * 96.44;  // approx
    const distanceKm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    return parseFloat(distanceKm.toFixed(1));
  };

  const distanceVal = calculateSimulatedDistance();
  const estimatedCost = Math.round(distanceVal * targetTruck.ratePerKm);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setSubmitting(true);

    const randomId = 'BK-' + Math.floor(100000 + Math.random() * 900000);

    try {
      await addDoc(collection(db, 'logistics_bookings'), {
        bookingId: randomId,
        farmId,
        pickupName: "My Loaded Farm Plot",
        pickupLocation: { lat: currentCoords.lat, lng: currentCoords.lng },
        dropoffName: targetHub.name,
        dropoffLocation: { lat: currentCoords.lat + targetHub.latOffset, lng: currentCoords.lng + targetHub.lngOffset },
        truckType: targetTruck.name,
        loadSize: Number(loadSize),
        distance: distanceVal,
        estimatedPrice: estimatedCost,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      alert('Your logistics partner has accepted the booking order! ID: ' + randomId);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'logistics_bookings');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      {/* Booking Form and Active Routing Visual (8 Columns) */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                <Navigation className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-950 text-lg">Route Logistics Planner</h3>
                <p className="text-xs text-emerald-600">Centered on your spatial GPS coordinates</p>
              </div>
            </div>
            {gpsLoading && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching GPS...
              </span>
            )}
          </div>

          {/* Simulated Premium Interactive Vector Map */}
          <div className="relative h-64 w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner mb-6">
            {/* Ambient grid design */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"></div>
            
            {/* Abstract radial coordinate waves */}
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 w-48 h-48 rounded-full border border-emerald-500/10 animate-[ping_4s_infinite]"></div>
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 w-80 h-80 rounded-full border border-emerald-500/5"></div>

            {/* Path visualization */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              {/* Route connecting line */}
              <motion.path
                d={`M 150 120 Q 250 80, 270 140 T 360 110`}
                fill="none"
                stroke="url(#routeGrad)"
                strokeWidth="3.5"
                strokeDasharray="8 4"
                animate={{ strokeDashoffset: [-20, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              />
            </svg>

            {/* Farm Pivot (Pickup location) */}
            <div className="absolute top-[120px] left-[150px] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="bg-emerald-500 text-white p-2 rounded-full ring-4 ring-emerald-500/20 shadow-lg cursor-pointer">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-white bg-slate-900/95 border border-emerald-500/30 px-2 py-0.5 rounded-md mt-1.5 whitespace-nowrap shadow-md">
                🎯 My Farm Plot (Origin)
              </span>
            </div>

            {/* Dynamic Destination Marker */}
            <motion.div 
              key={selectedHub}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-[110px] left-[360px] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
            >
              <div className="bg-blue-500 text-white p-2 rounded-full ring-4 ring-blue-500/20 shadow-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-white bg-slate-900/95 border border-blue-500/30 px-2 py-0.5 rounded-md mt-1.5 whitespace-nowrap shadow-md">
                🚚 Booking Hub Target
              </span>
            </motion.div>

            {/* Other points on map coordinate spectrum */}
            {HUB_LOCATIONS.map((loc) => {
              if (loc.id === selectedHub) return null;
              // visual offset placement
              const leftOffset = 210 + (loc.lngOffset * 500);
              const topOffset = 130 + (loc.latOffset * 500) * -1;
              return (
                <div 
                  key={loc.id} 
                  style={{ left: `${leftOffset}px`, top: `${topOffset}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${loc.type === 'cold' ? 'bg-sky-400' : 'bg-amber-400'}`}></div>
                </div>
              );
            })}

            {/* Floating Navigation details panel */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-white backdrop-blur-sm shadow-xl flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 font-bold font-mono text-sm">
                {distanceVal} KM
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Active Routing Calc</p>
                <p className="text-xs font-semibold text-slate-100 max-w-[200px] truncate">{targetHub.name}</p>
              </div>
            </div>
          </div>

          {/* Form Controls */}
          <form onSubmit={handleCreateBooking} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                Select Destination Center
              </label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/20 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              >
                {HUB_LOCATIONS.map(hub => (
                  <option key={hub.id} value={hub.id}>
                    {hub.name} ({hub.type === 'cold' ? '❄️ Cold Vault' : '🌾 Aggregation'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                Logistics Payload Load Weight (Tons)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                max="15.0"
                value={loadSize}
                onChange={(e) => setLoadSize(parseFloat(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/20 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-3">
                Choose Transport Class
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TRUCK_TYPES.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTruck(t.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedTruck === t.id
                        ? 'border-emerald-600 bg-emerald-50/80 shadow-md shadow-emerald-50'
                        : 'border-emerald-100 bg-white hover:bg-emerald-50/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{t.icon}</span>
                      <span className="font-bold text-emerald-950 text-sm">{t.name.split(' ')[0]}</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">{t.capacity} cap</div>
                    <div className="text-xs font-bold text-emerald-950 mt-1 flex items-center justify-between">
                      <span>Rate:</span>
                      <span className="text-emerald-700">₹{t.ratePerKm}/km</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-emerald-50 mt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex gap-4 items-center">
                <div className="bg-emerald-50 p-2 rounded-xl text-emerald-700">
                  <span className="text-xs uppercase font-bold tracking-widest block text-emerald-500">Estimations</span>
                  <span className="text-lg font-extrabold">₹{estimatedCost}</span>
                  <span className="text-xs font-medium text-emerald-600 ml-1">({distanceVal} km span)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Truck className="w-5 h-5" /> Book Fast Transport
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* History and Active Feed / Live Tracker (4 Columns) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-50">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h4 className="font-bold text-emerald-950 text-sm">Active Fleet Requests</h4>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[480px]">
            {bookings.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-emerald-100">
                <Truck className="w-10 h-10 text-emerald-200 mx-auto mb-2" />
                <p className="text-xs text-emerald-500 font-medium">No live bookings dispatched.</p>
              </div>
            ) : (
              bookings.map((bk) => (
                <div 
                  key={bk.id}
                  className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl space-y-2.5 hover:ring-2 hover:ring-emerald-600/10 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {bk.bookingId}
                    </span>
                    <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                      bk.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : bk.status === 'in_transit'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      • {bk.status}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5"></div>
                      <p className="text-xs font-semibold text-emerald-950 truncate max-w-[200px]">
                        {bk.pickupName || "Origin Yard"}
                      </p>
                    </div>
                    <div className="w-0.5 h-3 bg-emerald-200 ml-[4px]"></div>
                    <div className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                        {bk.dropoffName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-emerald-700 font-medium pt-2 border-t border-emerald-100/50">
                    <span>{bk.truckType}</span>
                    <span className="font-bold font-mono">₹{bk.estimatedPrice}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
