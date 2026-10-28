import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo, formatDate } from '../../utils/formatters';
import type { Unit, DistributorCommodity, PurchaseOrder } from '../../types';
import {
  AlertTriangle,
  History,
  PlusCircle,
  Clock,
  Loader2,
  RefreshCw,
  CheckCircle,
  ShieldCheck,
  Truck,
  X
} from 'lucide-react';
import { CreateUnitModal } from '../../components/unit/CreateUnitModal';

export const AdminDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'kpi' | 'ordering' | 'finance' | 'lifecycle' | 'audit'>('kpi');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [liveUnits, setLiveUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Supplier & PO State
  const [distributorCommodities, setDistributorCommodities] = useState<DistributorCommodity[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [selectedUnitIdForPO, setSelectedUnitIdForPO] = useState('');
  const [selectedCommodityId, setSelectedCommodityId] = useState('');
  const [poPacks, setPoPacks] = useState(1);
  const [poNotes, setPoNotes] = useState('Bulk truck dispatch to Piwoyi estate hub.');
  const [creatingPO, setCreatingPO] = useState(false);

  // Lifecycle check state
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleReport, setLifecycleReport] = useState<{
    timestamp: string;
    units_locked: number;
    shares_refunded: number;
    message: string;
  } | null>(null);

  const fetchAllData = async () => {
    setLoadingUnits(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [uRes, commRes, poRes] = await Promise.all([
        fetch('/api/units'),
        fetch('/api/distributor/commodities', { headers }),
        fetch('/api/admin/orders', { headers }),
      ]);

      if (uRes.ok) {
        const data = await uRes.json();
        setLiveUnits(data || []);
      }
      if (commRes.ok) {
        const commData = await commRes.json();
        setDistributorCommodities(commData || []);
        if (commData && commData.length > 0 && !selectedCommodityId) {
          setSelectedCommodityId(commData[0].id);
        }
      }
      if (poRes.ok) {
        const poData = await poRes.json();
        setPurchaseOrders(poData || []);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const handleTriggerLifecycle = async () => {
    if (!token) return;
    setLifecycleLoading(true);
    try {
      const res = await fetch('/api/units/lifecycle/check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLifecycleReport(data);
        fetchAllData();
      }
    } catch (err) {
      alert('Lifecycle engine check failed');
    } finally {
      setLifecycleLoading(false);
    }
  };

  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const unit = liveUnits.find((u) => u.id === selectedUnitIdForPO) || liveUnits[0];
    const comm =
      distributorCommodities.find((c) => c.id === selectedCommodityId) ||
      distributorCommodities[0] || {
        id: 'comm-rice-50kg',
        distributor_id: 'user-dist-dahiru',
        distributor_name: 'Alhaji Dahiru (Northern Agro Millers & Grain Depot)',
        distributor_phone: '+2348055556666',
        price_per_pack_kobo: 6650000,
        delivery_fee_kobo: 1312500,
      };

    const packs = Math.max(1, poPacks);
    const goodsCost = comm.price_per_pack_kobo * packs;
    const deliveryFee = comm.delivery_fee_kobo * packs;

    setCreatingPO(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          distributor_id: comm.distributor_id,
          distributor_name: comm.distributor_name,
          distributor_phone: comm.distributor_phone,
          destination_area: 'Piwoyi District Hub, Abuja',
          destination_landmarks: [unit ? unit.collection_landmark : '16 Biana street, New Extension, Piwoyi'],
          total_packs: packs,
          total_goods_cost_kobo: goodsCost,
          total_delivery_fee_kobo: deliveryFee,
          total_amount_kobo: goodsCost + deliveryFee,
          status: 'PENDING',
          associated_unit_ids: unit ? [unit.id] : ['unit-piwoyi-rice-01'],
          notes: poNotes,
        }),
      });

      if (res.ok) {
        setIsPOModalOpen(false);
        alert('✓ Purchase Order issued to Distributor! They can now accept and dispatch from their portal.');
        fetchAllData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create purchase order');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setCreatingPO(false);
    }
  };

  // Key platform metrics
  const totalGMVKobo = liveUnits.reduce((acc, u) => acc + (u.price_per_share_quoted_kobo * u.current_members_count), 0) + 1245000000;
  const platformRevenueKobo = Math.round(totalGMVKobo * 0.04);
  const kpis = {
    gmvKobo: totalGMVKobo,
    platformRevenueKobo: platformRevenueKobo,
    walletLiabilitiesKobo: 12500000, // ₦125,000
    activeUnitsCount: liveUnits.length || 8,
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
              Live monitoring of Nigerian grain & staple group purchases in Piwoyi, Abuja.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Launch Unit</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-purple-800/60 border border-purple-700 text-xs font-semibold hidden sm:flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse" />
              Paystack Bridge Active
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
            <div className="text-[11px] text-purple-200 font-semibold uppercase">Units Active</div>
            <div className="text-lg font-black text-white mt-1">{kpis.activeUnitsCount} Units</div>
            <div className="text-[10px] text-purple-300 font-medium mt-0.5">Piwoyi Hub, Abuja</div>
          </div>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'kpi' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Active Platform Units ({liveUnits.length})
        </button>
        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'lifecycle' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Lifecycle & Deadline Engine
        </button>
        <button
          onClick={() => setActiveTab('ordering')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'ordering' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Ordering Console & Suppliers
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'finance' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Cost Breakdown Ledger (76/15/4/3/4)
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'audit' ? 'text-purple-900 border-b-2 border-purple-800 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Audit Trail Log
        </button>
      </div>

      {/* Tab: Units / Operations Overview */}
      {activeTab === 'kpi' && (
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs space-y-2">
            <div className="font-bold text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-700" /> Platform Operational Summary (Piwoyi, Abuja Hubs)
              </span>
              <button
                onClick={fetchAllData}
                className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <RefreshCw size={12} className={loadingUnits ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            <p className="text-amber-800">
              Coordinators in Piwoyi manage local group purchasing units. Units auto-lock upon reaching full capacity for wholesale dispatch, or trigger automated 100% member wallet refunds if the deadline expires.
            </p>
          </div>

          {/* Unit Lifecycle Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">All Active Units in Piwoyi ({liveUnits.length})</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Live monitoring of quotas, capacity, and coordinator assignment.</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <PlusCircle size={13} /> Launch Unit
              </button>
            </div>

            {loadingUnits ? (
              <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-purple-600" /> Loading platform units...
              </div>
            ) : liveUnits.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-500">
                No active units found. Click "Launch Unit" to initialize one.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {liveUnits.map((unit) => {
                  const percent = Math.min(100, Math.round((unit.current_members_count / unit.max_members) * 100));
                  return (
                    <div key={unit.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            unit.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' :
                            unit.status === 'FULL' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {unit.status}
                          </span>
                          <span className="font-mono text-gray-400 text-[10px]">{unit.id}</span>
                        </div>

                        <div className="font-bold text-gray-900 text-sm mt-1">
                          {unit.product_name} ({unit.share_size})
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {unit.collection_landmark} • Coordinator: <strong>{unit.manager_name}</strong> ({unit.manager_phone})
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>Deadline: {formatDate(unit.payment_deadline)}</span>
                          <span>•</span>
                          <span>Sharing: {formatDate(unit.sharing_date)}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col sm:items-end gap-1.5">
                        <div className="text-right">
                          <span className="font-extrabold text-sm text-gray-900">{formatKobo(unit.price_per_share_quoted_kobo)}</span>
                          <span className="text-[10px] text-gray-500 block">/ member share</span>
                        </div>

                        <div className="w-36 bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${percent >= 80 ? 'bg-emerald-600' : 'bg-purple-600'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 font-semibold">
                          {unit.current_members_count} / {unit.max_members} shares ({percent}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Lifecycle & Deadline Engine */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-4 text-xs">
          <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">Automated Lifecycle & Deadline Engine</h2>
                  <p className="text-xs text-indigo-200/80">Continuous 30-second background ticker & escrow protection.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Engine Worker Active
                </span>
              </div>
            </div>

            <p className="text-xs text-indigo-100/90 leading-relaxed max-w-3xl">
              SharedBuy's background ticker runs every 30 seconds to enforce platform commitments without manual intervention:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                  <CheckCircle size={14} /> 1. Auto-Lock on Full Capacity
                </div>
                <p className="text-[11px] text-gray-300">
                  When all shares in a unit are claimed and paid (e.g. 10/10 members), the unit status is automatically transitioned from <code className="text-emerald-300 font-mono">OPEN</code> to <code className="text-purple-300 font-mono">FULL</code>, locking against new joins and queueing wholesale dispatch.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={14} /> 2. Automated 100% Wallet Refunds
                </div>
                <p className="text-[11px] text-gray-300">
                  If a unit's payment deadline arrives and the unit has not reached max capacity, the engine automatically cancels the unit and credits 100% of capital back to each participant's in-app wallet instantly with zero cancellation fee.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={lifecycleLoading}
                onClick={handleTriggerLifecycle}
                className="w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-indigo-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {lifecycleLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Executing Escrow & Deadline Sweep...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={15} />
                    <span>Trigger Manual Lifecycle & Deadline Check Now</span>
                  </>
                )}
              </button>
            </div>

            {lifecycleReport && (
              <div className="p-4 bg-white/10 rounded-2xl border border-white/20 space-y-1 text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-emerald-400" />
                  <span>{lifecycleReport.message}</span>
                </div>
                <div className="text-indigo-200 text-[11px] pt-1">
                  Sweep Timestamp: <strong>{formatDate(lifecycleReport.timestamp)}</strong> • Units Auto-Locked: <strong className="text-white">{lifecycleReport.units_locked}</strong> • Member Shares Auto-Refunded: <strong className="text-white">{lifecycleReport.shares_refunded}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Ordering Console */}
      {activeTab === 'ordering' && (
        <div className="space-y-5 text-xs">
          {/* Header & Action */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md">
                  Wholesale Procurement & Dispatch
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                  {purchaseOrders.length} Purchase Orders
                </span>
              </div>
              <h2 className="font-bold text-base text-gray-900 mt-1">Supplier Ordering & Dispatch Console</h2>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Consolidate filled community units across Piwoyi into bulk purchase orders sent directly to verified agro millers and distributors.
              </p>
            </div>

            <button
              onClick={() => {
                if (liveUnits.length > 0 && !selectedUnitIdForPO) {
                  setSelectedUnitIdForPO(liveUnits[0].id);
                }
                if (distributorCommodities.length > 0 && !selectedCommodityId) {
                  setSelectedCommodityId(distributorCommodities[0].id);
                }
                setIsPOModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <PlusCircle size={15} />
              <span>Issue Bulk Purchase Order</span>
            </button>
          </div>

          {/* Operational Workflow Card */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-4 shadow-md text-xs space-y-2">
            <div className="font-bold flex items-center gap-2 text-purple-200">
              <Truck size={16} className="text-amber-400" />
              <span>Piwoyi Hub Direct-from-Source Logistics Pipeline</span>
            </div>
            <p className="text-purple-100/90 text-[11px] leading-relaxed">
              When a Purchase Order is issued, associated Piwoyi units lock into <strong>ORDERED</strong> status. The supplier portal receives the order, allocates truck space, and enters the driver contact, plate number, and official waybill number. Upon offloading at Piwoyi, units transition to <strong>READY FOR COLLECTION</strong> for immediate member pickup.
            </p>
          </div>

          {/* Section: Live Distributor Commodity Quotes */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Live Verified Agro Distributor Quotes</h3>
                <p className="text-[11px] text-gray-500">Real-time gate pricing and delivery rates quoted by accredited commodity depot suppliers.</p>
              </div>
              <span className="text-[11px] font-bold text-gray-500">
                {distributorCommodities.length} active listings
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {distributorCommodities.map((comm) => (
                <div key={comm.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/90 hover:border-purple-300 transition-colors flex flex-col justify-between space-y-2">
                  <div>
                    <div className="font-bold text-gray-900 text-xs">{comm.product_name}</div>
                    <div className="text-[10px] text-purple-700 font-semibold mt-0.5">{comm.distributor_name}</div>
                    <div className="text-[10px] text-gray-500">{comm.distributor_phone}</div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Wholesale Price:</span>
                      <strong className="text-emerald-800">{formatKobo(comm.price_per_pack_kobo)}</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Waybill Logistics:</span>
                      <strong className="text-gray-700">{formatKobo(comm.delivery_fee_kobo)}</strong>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-purple-900 pt-1 border-t border-gray-200/60">
                      <span>Total Landed:</span>
                      <span>{formatKobo(comm.price_per_pack_kobo + comm.delivery_fee_kobo)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCommodityId(comm.id);
                      setIsPOModalOpen(true);
                    }}
                    className="w-full mt-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Select for PO
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Purchase Orders Log */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-gray-900">Purchase Orders & Waybill Tracking</h3>

            {purchaseOrders.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No bulk purchase orders generated yet. Use the "Issue Bulk Purchase Order" button above to order from distributors.
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map((po) => {
                  const isDelivered = po.status === 'DELIVERED';
                  const isDispatched = po.status === 'DISPATCHED';

                  return (
                    <div
                      key={po.id}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-gray-900">{po.order_number}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              isDelivered
                                ? 'bg-emerald-100 text-emerald-800'
                                : isDispatched
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isDelivered
                              ? '✓ DELIVERED AT HUB'
                              : isDispatched
                              ? '🚚 TRUCK IN TRANSIT'
                              : '⏳ PENDING DISPATCH'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Issued: <strong>{formatDate(po.ordered_at)}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                        <div>
                          <div className="text-gray-500">Supplier:</div>
                          <div className="font-bold text-gray-900">{po.distributor_name}</div>
                          <div className="text-gray-500">{po.distributor_phone}</div>
                        </div>

                        <div>
                          <div className="text-gray-500">Destination Hub:</div>
                          <div className="font-bold text-gray-900">{po.destination_area}</div>
                          <div className="text-gray-600 truncate">{po.destination_landmarks.join(', ')}</div>
                        </div>

                        <div>
                          <div className="text-gray-500">Packs & Financials:</div>
                          <div className="font-bold text-gray-900">
                            {po.total_packs} Pack(s) • Total: {formatKobo(po.total_amount_kobo)}
                          </div>
                          <div className="text-gray-500 text-[10px]">
                            Wholesale: {formatKobo(po.total_goods_cost_kobo)} | Logistics: {formatKobo(po.total_delivery_fee_kobo)}
                          </div>
                        </div>
                      </div>

                      {/* Driver & Waybill Details if Dispatched */}
                      {po.waybill_number && (
                        <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-950 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-blue-700 shrink-0" />
                            <span>
                              Waybill: <strong>{po.waybill_number}</strong> • Driver: <strong>{po.driver_name}</strong> ({po.driver_phone}) • Truck: <strong>{po.vehicle_plate}</strong>
                            </span>
                          </div>
                          {po.dispatched_at && (
                            <span className="text-[10px] text-blue-700">
                              Dispatched: {formatDate(po.dispatched_at)}
                            </span>
                          )}
                        </div>
                      )}

                      {po.notes && (
                        <div className="text-[11px] text-gray-500 italic bg-white p-2 rounded-lg border border-gray-100">
                          Notes: {po.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Finance (76/15/4/3/4 Economic Cost Ledger) */}
      {activeTab === 'finance' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-5 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md">
              Internal Admin & Coordinator Model
            </span>
            <h2 className="font-bold text-sm text-gray-900 mt-1">Unit Internal Economics & Cost Breakdown Ledger</h2>
            <p className="text-gray-500 text-[11px] mt-0.5">
              Automated breakdown: 76% wholesale goods, 15% logistics, 4% platform escrow fee, 3% coordinator reward, and 4% safety buffer.
            </p>
          </div>

          {/* Dynamic Unit Cost Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {liveUnits.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="font-bold text-gray-900 text-xs flex justify-between items-center">
                  <span>{u.product_name}</span>
                  <span className="text-[11px] text-emerald-700 font-bold">{u.collection_landmark}</span>
                </div>
                <div className="text-[10px] text-gray-400">
                  {u.max_members} shares of {u.share_size} • Quoted Member Price: <strong>{formatKobo(u.price_per_share_quoted_kobo)}</strong>
                </div>

                <div className="pt-2 border-t border-gray-200 space-y-1 text-[11px] text-gray-600">
                  <div className="flex justify-between">
                    <span>1. Wholesale Farm/Mill Cost (76%):</span>
                    <span className="font-semibold text-gray-800">{formatKobo(u.goods_cost_share_kobo)} / share</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2. Distributor Logistics Share (15%):</span>
                    <span className="font-semibold text-gray-800">{formatKobo(u.delivery_cost_share_kobo)} / share</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3. SharedBuy Platform Escrow (4%):</span>
                    <span className="font-semibold text-emerald-700">{formatKobo(u.platform_fee_share_kobo)} / share</span>
                  </div>
                  <div className="flex justify-between">
                    <span>4. Coordinator Commission (3%):</span>
                    <span className="font-semibold text-purple-700">{formatKobo(u.manager_commission_share_kobo)} / share</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>5. Safety Buffer Reserve (4%):</span>
                    <span className="font-bold">{formatKobo(u.buffer_share_kobo)} / share</span>
                  </div>
                </div>
              </div>
            ))}
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

      {/* PO Creation Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">Issue Bulk Purchase Order</h3>
                <p className="text-[11px] text-gray-500">Order from verified agro distributor for Piwoyi hub dispatch.</p>
              </div>
              <button
                onClick={() => setIsPOModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePurchaseOrder} className="space-y-3.5">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Select Piwoyi Unit to Fulfill:</label>
                <select
                  value={selectedUnitIdForPO}
                  onChange={(e) => setSelectedUnitIdForPO(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                >
                  {liveUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.product_name} ({u.current_members_count}/{u.max_members} shares) — {u.collection_landmark}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Select Distributor Commodity Quote:</label>
                <select
                  value={selectedCommodityId}
                  onChange={(e) => setSelectedCommodityId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                >
                  {distributorCommodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.product_name} — {c.distributor_name} ({formatKobo(c.price_per_pack_kobo)} + {formatKobo(c.delivery_fee_kobo)} logistics)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Total Wholesale Packs / Bags:</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={poPacks}
                  onChange={(e) => setPoPacks(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Live Cost Calculation Card */}
              {(() => {
                const comm =
                  distributorCommodities.find((c) => c.id === selectedCommodityId) ||
                  distributorCommodities[0];
                if (!comm) return null;
                const packs = Math.max(1, poPacks);
                const goodsCost = comm.price_per_pack_kobo * packs;
                const deliveryCost = comm.delivery_fee_kobo * packs;
                const totalCost = goodsCost + deliveryCost;

                return (
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                    <div className="font-bold text-purple-900 text-[11px] uppercase tracking-wide">
                      Purchase Order Escrow Breakdown
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Wholesale Goods ({packs} pack):</span>
                      <strong>{formatKobo(goodsCost)}</strong>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Logistics & Waybill Fee:</span>
                      <strong>{formatKobo(deliveryCost)}</strong>
                    </div>
                    <div className="flex justify-between font-bold text-purple-950 pt-1.5 border-t border-purple-200 text-xs">
                      <span>Total Amount Escrowed to Supplier:</span>
                      <span>{formatKobo(totalCost)}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Dispatch Notes & Gate Instructions:</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                  placeholder="e.g. Call Coordinator Aisha upon truck arrival in Piwoyi"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPOModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPO}
                  className="w-1/2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  {creatingPO ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Issuing PO...</span>
                    </>
                  ) : (
                    <span>Confirm & Issue PO</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CreateUnitModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onUnitCreated={fetchAllData}
      />
    </div>
  );
};
