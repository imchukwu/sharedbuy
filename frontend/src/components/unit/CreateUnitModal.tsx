import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo } from '../../utils/formatters';
import { X, Sparkles, ShieldCheck, Truck, Percent, Store, CheckCircle, Loader2 } from 'lucide-react';

interface CreateUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnitCreated: () => void;
}

const PRODUCTS = [
  {
    id: 'prod-rice-mama-gold-50kg',
    name: 'Mama Gold Premium Long Grain Parboiled Rice',
    category: 'Grains',
    packSize: '50kg Bag',
    defaultShareSize: '5kg Share',
    defaultPacks: 1,
    defaultShares: 10,
    defaultWholesalePackNaira: 66500,
    defaultDeliveryFeeNaira: 13125,
  },
  {
    id: 'prod-lactorich-milk-25kg',
    name: 'Lactorich Instant Full Cream Powdered Milk',
    category: 'Dairy',
    packSize: '25kg Bag',
    defaultShareSize: '2.5kg Share',
    defaultPacks: 1,
    defaultShares: 10,
    defaultWholesalePackNaira: 69920,
    defaultDeliveryFeeNaira: 13800,
  },
  {
    id: 'prod-crayfish-bag',
    name: 'Oron Premium Dried Crayfish',
    category: 'Seafood & Seasonings',
    packSize: 'Large Sack (Bag)',
    defaultShareSize: 'Paint Bucket Share (~2kg)',
    defaultPacks: 1,
    defaultShares: 8,
    defaultWholesalePackNaira: 57000,
    defaultDeliveryFeeNaira: 11250,
  },
  {
    id: 'prod-palm-oil-25l',
    name: 'Direct Mill Pure Red Palm Oil',
    category: 'Oils',
    packSize: '25L Gallon',
    defaultShareSize: '5L Share',
    defaultPacks: 1,
    defaultShares: 5,
    defaultWholesalePackNaira: 63840,
    defaultDeliveryFeeNaira: 12600,
  },
];

const PIWOYI_HUBS = [
  {
    address: '16 Biana street, New Extension, Piwoyi, Abuja',
    landmark: '16 Biana street, New Extension',
  },
  {
    address: 'Behind Salam Salam, Piwoyi, Abuja',
    landmark: 'Behind Salam Salam',
  },
  {
    address: 'Behind Sarah Dominion School, Piwoyi, Abuja',
    landmark: 'Behind Sarah Dominion School',
  },
  {
    address: 'By Bakery, Piwoyi, Abuja',
    landmark: 'By Bakery, Piwoyi Main Road',
  },
];

export const CreateUnitModal: React.FC<CreateUnitModalProps> = ({ isOpen, onClose, onUnitCreated }) => {
  const { token, user } = useAuth();
  const [selectedProdId, setSelectedProdId] = useState(PRODUCTS[0].id);
  const [selectedHub, setSelectedHub] = useState(PIWOYI_HUBS[0]);
  const [totalPacks, setTotalPacks] = useState(PRODUCTS[0].defaultPacks);
  const [maxMembers, setMaxMembers] = useState(PRODUCTS[0].defaultShares);
  const [shareSize, setShareSize] = useState(PRODUCTS[0].defaultShareSize);
  const [wholesalePackNaira, setWholesalePackNaira] = useState(PRODUCTS[0].defaultWholesalePackNaira);
  const [deliveryFeeNaira, setDeliveryFeeNaira] = useState(PRODUCTS[0].defaultDeliveryFeeNaira);
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [sharingDaysAhead, setSharingDaysAhead] = useState(4);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentProduct = PRODUCTS.find((p) => p.id === selectedProdId) || PRODUCTS[0];

  const handleProductChange = (prodId: string) => {
    const prod = PRODUCTS.find((p) => p.id === prodId);
    if (prod) {
      setSelectedProdId(prod.id);
      setTotalPacks(prod.defaultPacks);
      setMaxMembers(prod.defaultShares);
      setShareSize(prod.defaultShareSize);
      setWholesalePackNaira(prod.defaultWholesalePackNaira);
      setDeliveryFeeNaira(prod.defaultDeliveryFeeNaira);
    }
  };

  // --- Real-time Unit Economics & Cost Breakdown Calculator ---
  const totalGoodsNaira = wholesalePackNaira * totalPacks;
  const goodsCostShareNaira = Math.round(totalGoodsNaira / maxMembers);
  const deliveryCostShareNaira = Math.round(deliveryFeeNaira / maxMembers);
  const platformFeeShareNaira = Math.round(goodsCostShareNaira * 0.04);
  const managerCommissionShareNaira = Math.round(goodsCostShareNaira * 0.03);
  const bufferShareNaira = Math.round(goodsCostShareNaira * 0.04);

  const pricePerShareQuotedNaira =
    goodsCostShareNaira +
    deliveryCostShareNaira +
    platformFeeShareNaira +
    managerCommissionShareNaira +
    bufferShareNaira;

  const pricePerShareQuotedKobo = pricePerShareQuotedNaira * 100;
  const estimatedRetailNaira = Math.round(pricePerShareQuotedNaira * 1.28);
  const estimatedSavingsNaira = estimatedRetailNaira - pricePerShareQuotedNaira;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: selectedProdId,
          manager_id: user?.id,
          area_id: 'area-piwoyi-abuja',
          collection_address: selectedHub.address,
          collection_landmark: selectedHub.landmark,
          collection_map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHub.address)}`,
          total_packs: totalPacks,
          share_size: shareSize,
          max_members: maxMembers,
          price_per_share_quoted_kobo: pricePerShareQuotedKobo,
          payment_deadline_hours: deadlineHours,
          sharing_days_ahead: sharingDaysAhead,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        onUnitCreated();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create unit');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              Coordinator Unit Creator
            </span>
            <h3 className="font-bold text-base text-gray-900 mt-1">Launch New Buying Unit</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle size={32} />
            </div>
            <h4 className="font-bold text-base text-gray-900">Unit Successfully Launched!</h4>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              Your unit for <strong>{currentProduct.name}</strong> at <strong>{selectedHub.landmark}</strong> is now live and accepting neighbor joins.
            </p>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-semibold">
              Share Price: {formatKobo(pricePerShareQuotedKobo)} ({shareSize}) • {maxMembers} Shares Total
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer"
            >
              Done & View Unit
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-3 space-y-4 text-xs">
            {/* 1. Select Product */}
            <div>
              <label className="font-semibold text-gray-700 block mb-1">1. Select Staple Product</label>
              <select
                value={selectedProdId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-300 font-semibold text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {PRODUCTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.packSize})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Pickup Hub in Piwoyi */}
            <div>
              <label className="font-semibold text-gray-700 block mb-1">2. Collection Hub (Piwoyi, Abuja)</label>
              <select
                value={selectedHub.address}
                onChange={(e) => {
                  const hub = PIWOYI_HUBS.find((h) => h.address === e.target.value);
                  if (hub) setSelectedHub(hub);
                }}
                className="w-full p-2.5 rounded-xl border border-gray-300 font-medium text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                {PIWOYI_HUBS.map((h) => (
                  <option key={h.address} value={h.address}>
                    {h.landmark} — {h.address}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Pack count and Shares configuration */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Total Packs</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={totalPacks}
                  onChange={(e) => setTotalPacks(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-gray-300 font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Max Shares</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-gray-300 font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Share Size</label>
                <input
                  type="text"
                  value={shareSize}
                  onChange={(e) => setShareSize(e.target.value)}
                  className="w-full p-2 rounded-xl border border-gray-300 font-semibold text-xs"
                />
              </div>
            </div>

            {/* 4. Wholesale Pricing Parameters */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Wholesale / Pack (₦)</label>
                <input
                  type="number"
                  step={500}
                  value={wholesalePackNaira}
                  onChange={(e) => setWholesalePackNaira(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-gray-300 font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Delivery Logistics (₦)</label>
                <input
                  type="number"
                  step={250}
                  value={deliveryFeeNaira}
                  onChange={(e) => setDeliveryFeeNaira(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-gray-300 font-bold text-xs"
                />
              </div>
            </div>

            {/* 5. Live Automated Cost Breakdown Console (76 / 15 / 4 / 3 / 4) */}
            <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-950 pb-1.5 border-b border-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Percent size={13} className="text-emerald-700" /> Automated Cost Breakdown Model
                </span>
                <span className="text-[11px] text-emerald-800 font-extrabold">
                  {formatKobo(pricePerShareQuotedKobo)} / share
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-gray-700">
                  <span>1. Wholesale Farm/Mill Cost (76%):</span>
                  <span className="font-bold">₦{goodsCostShareNaira.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center gap-1">
                    <Truck size={10} className="text-emerald-700" /> 2. Logistics & Delivery (15%):
                  </span>
                  <span className="font-bold">₦{deliveryCostShareNaira.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={10} className="text-emerald-700" /> 3. SharedBuy Platform Escrow (4%):
                  </span>
                  <span className="font-bold">₦{platformFeeShareNaira.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center gap-1">
                    <Store size={10} className="text-amber-700" /> 4. Coordinator Reward (3%):
                  </span>
                  <span className="font-bold text-emerald-800 font-mono">
                    ₦{managerCommissionShareNaira.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>5. Price Fluctuation Buffer (4%):</span>
                  <span className="font-bold">₦{bufferShareNaira.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/70 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500">Retail benchmark: ~₦{estimatedRetailNaira.toLocaleString()}</div>
                  <div className="text-xs font-bold text-emerald-900">
                    Member Net Price: ₦{pricePerShareQuotedNaira.toLocaleString()}
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                  <Sparkles size={11} /> Save ~₦{estimatedSavingsNaira.toLocaleString()} (28%)
                </div>
              </div>
            </div>

            {/* 6. Timeline Settings */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Payment Deadline</label>
                <select
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-gray-300 text-xs font-medium bg-white"
                >
                  <option value={24}>24 Hours</option>
                  <option value={48}>48 Hours (Standard)</option>
                  <option value={72}>72 Hours</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Sharing Date</label>
                <select
                  value={sharingDaysAhead}
                  onChange={(e) => setSharingDaysAhead(Number(e.target.value))}
                  className="w-full p-2 rounded-xl border border-gray-300 text-xs font-medium bg-white"
                >
                  <option value={3}>In 3 Days</option>
                  <option value={4}>In 4 Days</option>
                  <option value={5}>In 5 Days</option>
                  <option value={7}>In 1 Week</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || maxMembers <= 0 || pricePerShareQuotedKobo <= 0}
              className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Launching Unit...</span>
                </>
              ) : (
                <span>Launch Unit at {formatKobo(pricePerShareQuotedKobo)} / Share</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
