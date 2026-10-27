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
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">All Active Platform Units</h2>
              <span className="text-xs text-gray-400">8 Units tracked</span>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-bold text-gray-900">Premium Parboiled Rice (50kg) • Maiduguri Hub</div>
                  <div className="text-[11px] text-gray-500">Mgr: Aisha Bello • 16/20 members joined (80%)</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  OPEN
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-bold text-gray-900">King’s Pure Cooking Oil (25L) • Ikeja Hub</div>
                  <div className="text-[11px] text-gray-500">Mgr: Chidinma Eze • 10/10 members joined (100%)</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                  FULL (PAYMENT CLOSED)
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-bold text-gray-900">Honey Beans (50kg) • Kano Sabon Gari</div>
                  <div className="text-[11px] text-gray-500">Mgr: Ibrahim Danladi • 4/10 members joined (40%)</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                  OPEN (ENDING SOON)
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-bold text-gray-900">Parboiled Rice (50kg) • Bulumkutu Maiduguri</div>
                  <div className="text-[11px] text-gray-500">Mgr: Fatima Mohammed • Goods Weighed & Delivered</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">
                  READY FOR COLLECTION
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
              <div className="text-[11px] text-gray-500">Maiduguri • Rating: 4.90★</div>
              <div className="mt-2 text-emerald-800 font-bold">Rice: ₦75,000 / bag</div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="font-bold text-gray-900">Dawanau Grain Merchants</div>
              <div className="text-[11px] text-gray-500">Kano Hub • Rating: 4.85★</div>
              <div className="mt-2 text-emerald-800 font-bold">Beans: ₦68,000 / bag</div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="font-bold text-gray-900">Eko Commodities Depot</div>
              <div className="text-[11px] text-gray-500">Lagos • Rating: 4.75★</div>
              <div className="mt-2 text-emerald-800 font-bold">Oil: ₦45,000 / 25L</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Finance */}
      {activeTab === 'finance' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-4 text-xs">
          <h2 className="font-bold text-sm text-gray-900">Unit Financial Reconciliation (Exact Ledger Rule 6)</h2>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-emerald-950">
            <div className="font-bold">Reconciled Unit: Honey Beans Lagos #04</div>
            <div className="flex justify-between">
              <span>Total Member Capital Collected:</span>
              <span className="font-bold">₦89,500</span>
            </div>
            <div className="flex justify-between">
              <span>Actual Wholesale Supplier Cost Paid:</span>
              <span className="font-bold">₦68,000</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Escrow Fee (4%):</span>
              <span className="font-bold">₦2,720</span>
            </div>
            <div className="flex justify-between">
              <span>Manager Commission (3%):</span>
              <span className="font-bold">₦2,040</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-black pt-1 border-t border-emerald-200">
              <span>Surplus Credited to Members:</span>
              <span>₦1,250 returned to wallets</span>
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
