import React, { useState } from 'react';
import { formatKobo, formatDate } from '../../utils/formatters';
import {
  MapPin,
  Clock,
  Phone
} from 'lucide-react';

export const MyUnitsPage: React.FC = () => {
  const [tab, setTab] = useState<'active' | 'completed' | 'cancelled'>('active');

  // Sample units for member
  const sampleActiveUnits = [
    {
      id: 'unit-rice-maiduguri-02',
      product_name: 'Premium Long Grain Parboiled Rice',
      share_size: '5kg share (1 share)',
      amount_paid_kobo: 982500,
      status: 'READY_FOR_COLLECTION',
      collection_code: '840192',
      manager_name: 'Fatima Mohammed',
      manager_phone: '+2348044445555',
      collection_address: 'No. 3 Airport Road, Bulumkutu, Maiduguri (Behind Federal High Court)',
      sharing_date: '2026-10-27T10:00:00Z',
    },
    {
      id: 'unit-rice-maiduguri-01',
      product_name: 'Premium Long Grain Parboiled Rice',
      share_size: '5kg share (1 share)',
      amount_paid_kobo: 982500,
      status: 'OPEN',
      collection_code: '384912',
      manager_name: 'Aisha Bello',
      manager_phone: '+2348011112222',
      collection_address: 'Shop 14, Opposite Post Office Roundabout, Maiduguri',
      sharing_date: '2026-10-30T10:00:00Z',
    },
  ];

  const steps = [
    { key: 'JOINED', label: 'Joined' },
    { key: 'FULL', label: 'Unit Full' },
    { key: 'ORDERED', label: 'Ordered' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'READY', label: 'Ready to Collect' },
  ];

  const getActiveStepIndex = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 0;
      case 'FULL':
      case 'PAYMENT_CLOSED':
        return 1;
      case 'ORDERED':
        return 2;
      case 'IN_TRANSIT':
      case 'DELIVERED_TO_MANAGER':
        return 3;
      case 'READY_FOR_COLLECTION':
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  return (
    <div className="pb-24 max-w-xl mx-auto px-3.5 pt-3">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">My Buying Units</h1>
        <p className="text-xs text-gray-500 mt-0.5">Track your group orders and collection pickup codes.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 text-xs font-semibold">
        <button
          onClick={() => setTab('active')}
          className={`pb-2.5 px-3 transition-colors relative cursor-pointer ${
            tab === 'active' ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Active Units ({sampleActiveUnits.length})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            tab === 'completed' ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Completed (1)
        </button>
        <button
          onClick={() => setTab('cancelled')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            tab === 'cancelled' ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Cancelled (0)
        </button>
      </div>

      {tab === 'active' && (
        <div className="space-y-4">
          {sampleActiveUnits.map((item) => {
            const stepIdx = getActiveStepIndex(item.status);
            const isReady = item.status === 'READY_FOR_COLLECTION';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 ${
                  isReady ? 'border-emerald-300 ring-2 ring-emerald-600/10' : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{item.product_name}</h3>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.share_size} • Paid {formatKobo(item.amount_paid_kobo)}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      isReady ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {isReady ? 'READY FOR PICKUP' : 'FILLING UP'}
                  </span>
                </div>

                {/* Status Stepper */}
                <div className="pt-2 pb-1">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 z-0" />
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-600 z-0 transition-all"
                      style={{ width: `${(stepIdx / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((st, i) => {
                      const completed = i <= stepIdx;
                      return (
                        <div key={st.key} className="relative z-10 flex flex-col items-center">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              completed ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {completed ? '✓' : i + 1}
                          </div>
                          <span className="text-[9px] text-gray-500 mt-1 font-medium hidden sm:block">
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collection Code Box if READY */}
                {isReady && (
                  <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 text-center space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                      Your Pickup Verification Code
                    </div>
                    <div className="text-2xl font-black font-mono tracking-widest text-emerald-900">
                      {item.collection_code}
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Show this 6-digit code or QR to Unit Manager <strong>{item.manager_name}</strong> upon collection.
                    </p>
                  </div>
                )}

                {/* Pickup Location Details */}
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1.5 border border-gray-100">
                  <div className="flex items-start gap-1.5">
                    <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <span>{item.collection_address}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/60">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock size={12} /> Sharing Day: <strong>{formatDate(item.sharing_date)}</strong>
                    </div>
                    <a
                      href={`tel:${item.manager_phone}`}
                      className="font-medium text-emerald-800 flex items-center gap-1 hover:underline"
                    >
                      <Phone size={11} /> Call Manager
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'completed' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-xs space-y-2 shadow-2xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">Honey Beans (Oloyin) • 5kg share</span>
            <span className="text-emerald-700 font-bold">Collected</span>
          </div>
          <p className="text-gray-500">Collected on 24 Oct 2026 • Code 492019 verified</p>
          <div className="text-emerald-800 bg-emerald-50 p-2 rounded-lg text-[11px] font-medium">
            Surplus refund of ₦1,250 automatically credited back to your wallet!
          </div>
        </div>
      )}

      {tab === 'cancelled' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-xs text-gray-500">
          No cancelled units. All orders have been completed successfully.
        </div>
      )}
    </div>
  );
};
