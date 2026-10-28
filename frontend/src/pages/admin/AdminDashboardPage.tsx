import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo } from '../../utils/formatters';
import {
  AlertTriangle,
  History
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'kpi' | 'ordering' | 'finance' | 'audit'>('kpi');

  // Key platform metrics
  const kpis = {
    gmvKobo: 1245000000, // ₦12,450,000
    platformRevenueKobo: 49800000, // ₦498,000 (4%)
    walletLiabilitiesKobo: 12500000, // ₦125,000
    activeUnitsCount: 8,
    activeManagersCount: 5,
    totalMembersCount: 30,
    openDisputesCount: 0,
  };

  return (
    <div className="pb-20 max-w-5xl mx-auto px-4 pt-4">
      {/* Admin Top Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-5 shadow-sm mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-700/70 text-purple-200 text-[10px] font-bold uppercase tracking-wider">
                Operations HQ
              </span>
              <span className="text-xs text-purple-200 font-medium">Subrole: {user?.admin_subrole || 'SUPER_ADMIN'}</span>
            </div>
            <h1 className="text-xl font-bold mt-1">SharedBuy Platform Operations</h1>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Live monitoring of Nigerian grain & staple group purchases.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-purple-800/60 border border-purple-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse" />
              Paystack Live Bridge Active
            </div>
          </div>
        </div>

        {/* Top Operational KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-purple-800/60">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-semibold uppercase">Total GMV Processed</div>
            <div className="text-lg font-black text-white mt-1">{formatKobo(kpis.gmvKobo)}</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-0.5">+18% this week</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-semibold uppercase">Platform Revenue (4%)</div>
            <div className="text-lg font-black text-emerald-300 mt-1">{formatKobo(kpis.platformRevenueKobo)}</div>
            <div className="text-[10px] text-purple-300 font-medium mt-0.5">Escrow fee earned</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-semibold uppercase">Wallet Liabilities</div>
            <div className="text-lg font-black text-amber-300 mt-1">{formatKobo(kpis.walletLiabilitiesKobo)}</div>
            <div className="text-[10px] text-purple-300 font-medium mt-0.5">Member surplus balances</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-semibold uppercase">Coordinators / Members</div>
            <div className="text-lg font-black text-white mt-1">5 / 30</div>
            <div className="text-[10px] text-purple-300 font-medium mt-0.5">3 active hubs</div>
          </div>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`pb-2.5 px-3 transition-colors ${
            activeTab === 'kpi' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Units Needing Action (3)
        </button>
        <button
          onClick={() => setActiveTab('ordering')}
          className={`pb-2.5 px-3 transition-colors ${
            activeTab === 'ordering' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Ordering Console & Suppliers
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`pb-2.5 px-3 transition-colors ${
            activeTab === 'finance' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Financial Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-3 transition-colors ${
            activeTab === 'audit' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Audit Trail Log
        </button>
      </div>

      {/* Tab: Units Needing Action */}
      {activeTab === 'kpi' && (
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs space-y-2">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-amber-700" /> Action Required: 1 Unit Filled & Ready to Order
            </div>
            <p className="text-amber-800">
              Unit <strong>Garri in Lagos (#02)</strong> reached full payment and is closed. Consolidate with Northern Agro Millers or Eko Commodities Depot to place bulk dispatch.
            </p>
          </div>

          {/* Unit Lifecycle Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">All Active Platform Units (Piwoyi, Abuja)</h2>
              <span className="text-xs text-gray-400">4 Units Active</span>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-bold text-gray-900">Mama Gold Premium Rice (50kg Bag)</div>
                  <div className="text-[11px] text-gray-500">16 Biana street, New Extension • Mgr: Aisha Bello • 8/10 members (80%)</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  OPEN (ALMOST FULL)
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-bold text-gray-900">Lactorich Full Cream Powdered Milk (25kg Bag)</div>
                  <div className="text-[11px] text-gray-500">Behind Salam Salam • Mgr: Fatima Mohammed • 5/10 members (50%)</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                  OPEN
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-bold text-gray-900">Oron Premium Dried Crayfish (Large Bag)</div>
                  <div className="text-[11px] text-gray-500">Behind Sarah Dominion School • Mgr: Ibrahim Danladi • 7/8 members (88%)</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                  OPEN (ALMOST FULL)
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-bold text-gray-900">Direct Mill Pure Red Palm Oil (25L Gallon)</div>
                  <div className="text-[11px] text-gray-500">By Bakery, Piwoyi Main Road • Mgr: Chidinma Eze • 4/5 members (80%)</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                  OPEN (ALMOST FULL)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Ordering Console */}
      {activeTab === 'ordering' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-4 text-xs">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-sm text-gray-900">Supplier Ordering & Consolidation Console</h2>
            <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 font-bold text-[11px]">
              3 Verified Distributors
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="font-bold text-gray-900">Northern Agro Millers</div>
              <div className="text-[11px] text-gray-500">Direct Mill Dispatch • Rating: 4.90★</div>
              <div className="mt-2 text-emerald-800 font-bold">Rice: ₦75,000 / bag</div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="font-bold text-gray-900">Dawanau & Coastal Merchants</div>
              <div className="text-[11px] text-gray-500">National Grain & Seafood Depot • Rating: 4.85★</div>
              <div className="mt-2 text-emerald-800 font-bold">Crayfish: ₦48,000 / bag</div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="font-bold text-gray-900">Eko & Eastern Oil Palm Depot</div>
              <div className="text-[11px] text-gray-500">Oils & Dairy Wholesalers • Rating: 4.75★</div>
              <div className="mt-2 text-emerald-800 font-bold">Palm Oil: ₦35,000 / 25L</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Finance */}
      {activeTab === 'finance' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-5 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md">
              Internal Admin Only
            </span>
            <h2 className="font-bold text-sm text-gray-900 mt-1">Unit Internal Economics & Cost Breakdown Ledger</h2>
            <p className="text-gray-500 text-[11px] mt-0.5">
              Wholesale distributor splits, platform escrow fees (4%), manager commissions (3%), and safety buffers.
            </p>
          </div>

          {/* Unit Cost Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Unit 1 Economics */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="font-bold text-gray-900 text-xs flex justify-between items-center">
                <span>Mama Gold Rice (50kg Bag)</span>
                <span className="text-[11px] text-emerald-700 font-bold">16 Biana St, Piwoyi</span>
              </div>
              <div className="text-[10px] text-gray-400">10 shares of 5kg • Quoted Member Price: ₦8,750 / share</div>

              <div className="pt-2 border-t border-gray-200 space-y-1 text-[11px] text-gray-600">
                <div className="flex justify-between">
                  <span>Wholesale Supplier Cost (76%):</span>
                  <span className="font-semibold text-gray-800">₦6,650 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Distributor Logistics Share (15%):</span>
                  <span className="font-semibold text-gray-800">₦1,312 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (4%):</span>
                  <span className="font-semibold text-emerald-700">₦266 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Manager Commission (3%):</span>
                  <span className="font-semibold text-purple-700">₦200 / share</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Safety Buffer Reserve (4%):</span>
                  <span className="font-bold">₦322 / share</span>
                </div>
              </div>
            </div>

            {/* Unit 2 Economics */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="font-bold text-gray-900 text-xs flex justify-between items-center">
                <span>Lactorich Powdered Milk (25kg Bag)</span>
                <span className="text-[11px] text-emerald-700 font-bold">Behind Salam Salam, Piwoyi</span>
              </div>
              <div className="text-[10px] text-gray-400">10 shares of 2.5kg • Quoted Member Price: ₦9,200 / share</div>

              <div className="pt-2 border-t border-gray-200 space-y-1 text-[11px] text-gray-600">
                <div className="flex justify-between">
                  <span>Wholesale Supplier Cost (76%):</span>
                  <span className="font-semibold text-gray-800">₦6,992 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Distributor Logistics Share (15%):</span>
                  <span className="font-semibold text-gray-800">₦1,380 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (4%):</span>
                  <span className="font-semibold text-emerald-700">₦280 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Manager Commission (3%):</span>
                  <span className="font-semibold text-purple-700">₦210 / share</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Safety Buffer Reserve (4%):</span>
                  <span className="font-bold">₦338 / share</span>
                </div>
              </div>
            </div>

            {/* Unit 3 Economics */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="font-bold text-gray-900 text-xs flex justify-between items-center">
                <span>Oron Dried Crayfish (Large Bag)</span>
                <span className="text-[11px] text-emerald-700 font-bold">Behind Sarah Dominion School</span>
              </div>
              <div className="text-[10px] text-gray-400">8 shares of Paint Bucket (~2kg) • Quoted Member Price: ₦7,500 / share</div>

              <div className="pt-2 border-t border-gray-200 space-y-1 text-[11px] text-gray-600">
                <div className="flex justify-between">
                  <span>Wholesale Supplier Cost (76%):</span>
                  <span className="font-semibold text-gray-800">₦5,700 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Distributor Logistics Share (15%):</span>
                  <span className="font-semibold text-gray-800">₦1,125 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (4%):</span>
                  <span className="font-semibold text-emerald-700">₦228 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Manager Commission (3%):</span>
                  <span className="font-semibold text-purple-700">₦171 / share</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Safety Buffer Reserve (4%):</span>
                  <span className="font-bold">₦276 / share</span>
                </div>
              </div>
            </div>

            {/* Unit 4 Economics */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="font-bold text-gray-900 text-xs flex justify-between items-center">
                <span>Direct Mill Pure Red Palm Oil (25L Gallon)</span>
                <span className="text-[11px] text-emerald-700 font-bold">By Bakery, Piwoyi</span>
              </div>
              <div className="text-[10px] text-gray-400">5 shares of 5L • Quoted Member Price: ₦8,400 / share</div>

              <div className="pt-2 border-t border-gray-200 space-y-1 text-[11px] text-gray-600">
                <div className="flex justify-between">
                  <span>Wholesale Supplier Cost (76%):</span>
                  <span className="font-semibold text-gray-800">₦6,384 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Distributor Logistics Share (15%):</span>
                  <span className="font-semibold text-gray-800">₦1,260 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (4%):</span>
                  <span className="font-semibold text-emerald-700">₦255 / share</span>
                </div>
                <div className="flex justify-between">
                  <span>Manager Commission (3%):</span>
                  <span className="font-semibold text-purple-700">₦191 / share</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Safety Buffer Reserve (4%):</span>
                  <span className="font-bold">₦310 / share</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Audit */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3 text-xs">
          <h2 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
            <History size={16} className="text-gray-500" /> Immutable Platform Audit Trail
          </h2>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex justify-between">
              <span>[2026-10-26 13:37:30] SYSTEM: Initialized schema and loaded 36 seed users and 8 units.</span>
              <span className="text-gray-400">127.0.0.1</span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex justify-between">
              <span>[2026-10-26 13:41:40] AUTH: OTP requested for user +2348100000001 (Babagana Kyari).</span>
              <span className="text-gray-400">127.0.0.1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
