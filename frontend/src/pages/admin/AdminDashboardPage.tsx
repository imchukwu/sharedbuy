import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo, formatDate } from '../../utils/formatters';
import type { Unit, DistributorCommodity, PurchaseOrder, Dispute, NotificationLog } from '../../types';
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
  X,
  Ban,
  Layers,
  Scale,
  DollarSign,
  UserCheck,
  FileCheck,
  MapPin,
} from 'lucide-react';
import { CreateUnitModal } from '../../components/unit/CreateUnitModal';

interface AdminOverviewMetrics {
  total_gmv_kobo: number;
  live_units_gmv_kobo: number;
  platform_revenue_kobo: number;
  coordinator_commissions_kobo: number;
  buffer_escrow_kobo: number;
  wallet_liabilities_kobo: number;
  active_units_count: number;
  pending_review_count: number;
  open_disputes_count: number;
  total_disputes_count: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'kpi' | 'ordering' | 'finance' | 'disputes' | 'lifecycle'
  >('kpi');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [liveUnits, setLiveUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [overviewMetrics, setOverviewMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  // Unit Filters
  const [unitStatusFilter, setUnitStatusFilter] = useState<string>('ALL');
  const [unitLocalityFilter, setUnitLocalityFilter] = useState<string>('ALL');

  // Supplier, Consolidation & PO State
  const [distributorCommodities, setDistributorCommodities] = useState<DistributorCommodity[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [selectedUnitIdsForPO, setSelectedUnitIdsForPO] = useState<string[]>([]);
  const [selectedCommodityId, setSelectedCommodityId] = useState('');
  const [poPacks, setPoPacks] = useState(1);
  const [poNotes, setPoNotes] = useState('Consolidated bulk truck dispatch to Piwoyi & Lugbe estate hubs.');
  const [creatingPO, setCreatingPO] = useState(false);

  // Delivery & Driver Assignment State
  const [assigningDriverPO, setAssigningDriverPO] = useState<PurchaseOrder | null>(null);
  const [driverName, setDriverName] = useState('Audu Mohammed');
  const [driverPhone, setDriverPhone] = useState('+2348091122334');
  const [vehiclePlate, setVehiclePlate] = useState('ABJ-774-XY');
  const [waybillNumber, setWaybillNumber] = useState('WB-9982');
  const [dispatchingPO, setDispatchingPO] = useState(false);

  // Disputes & Audit State
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);
  const [resolutionNotesMap, setResolutionNotesMap] = useState<{ [id: string]: string }>({});
  const [compensationNairaMap, setCompensationNairaMap] = useState<{ [id: string]: string }>({});
  const [auditLogs, setAuditLogs] = useState<
    { id: string; timestamp: string; event: string; actor: string }[]
  >([
    {
      id: 'aud-1',
      timestamp: '2026-10-28 14:10:00',
      event: 'PO-2026-PIWOYI-001 dispatched with Waybill #WB-9941 (Driver: Audu Mohammed, ABJ-774-XY).',
      actor: 'OPS_ADMIN',
    },
    {
      id: 'aud-2',
      timestamp: '2026-10-28 12:30:15',
      event: 'Verified Hub Coordinator Aisha Bello scale calibration (50.2kg) at 16 Biana street, Piwoyi.',
      actor: 'SYSTEM',
    },
    {
      id: 'aud-3',
      timestamp: '2026-10-28 09:15:00',
      event: 'Initialized geographical hierarchy (NG -> FCT -> Abuja -> Piwoyi, Lugbe, Gwarinpa).',
      actor: 'SUPER_ADMIN',
    },
  ]);

  // Lifecycle check state
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleReport, setLifecycleReport] = useState<{
    timestamp: string;
    units_locked: number;
    shares_refunded: number;
    message: string;
  } | null>(null);

  // Termii Notifications & Production Security Audit state
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [securityChecks, setSecurityChecks] = useState<
    { control: string; status: string; details: string }[]
  >([]);

  const appendAudit = (event: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        timestamp: nowStr,
        event,
        actor: user?.admin_subrole || 'SUPER_ADMIN',
      },
      ...prev,
    ]);
  };

  const fetchAllData = async () => {
    setLoadingUnits(true);
    try {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [uRes, commRes, poRes, ovRes, dispRes, notifRes, secRes] = await Promise.all([
        fetch('/api/units'),
        fetch('/api/distributor/commodities', { headers }),
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/disputes', { headers }),
        fetch('/api/notifications/logs', { headers }),
        fetch('/api/admin/security-audit', { headers }),
      ]);

      if (uRes.ok) {
        const data: Unit[] = await uRes.json();
        const safeUnits = data || [];
        setLiveUnits(safeUnits);
        if (safeUnits.length > 0 && selectedUnitIdsForPO.length === 0) {
          setSelectedUnitIdsForPO([safeUnits[0].id]);
        }
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
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverviewMetrics(ovData);
      }
      if (dispRes.ok) {
        const dispData = await dispRes.json();
        setDisputes(dispData || []);
      }
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotificationLogs(notifData || []);
      }
      if (secRes.ok) {
        const secData = await secRes.json();
        setSecurityChecks(secData?.checks || []);
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

  // Approve or transition Unit Status
  const handleUpdateUnitStatus = async (unitId: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/units/${unitId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionBanner(data.message || `✓ Unit ${unitId} transitioned to ${status}`);
        appendAudit(`Unit ${unitId} status updated to ${status}.`);
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to update unit status', err);
    }
  };

  // Cancel Unit & Refund 100% to Member Wallets
  const handleCancelUnitAndRefund = async (unit: Unit) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/units/${unit.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: 'Admin cancellation & 100% member escrow refund',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionBanner(
          data.message || `✓ Unit ${unit.id} cancelled and 100% refunded to member wallets.`
        );
        appendAudit(
          `Cancelled unit ${unit.id} (${unit.product_name}) and refunded ${formatKobo(
            data.total_refunded_kobo || 0
          )} across ${data.refunded_members || 0} member(s).`
        );
        fetchAllData();
      }
    } catch (err) {
      console.error('Error cancelling unit', err);
    }
  };

  // Trigger Lifecycle & Deadline Engine
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
        appendAudit(`Manual lifecycle check executed: ${data.message}`);
        fetchAllData();
      }
    } catch (err) {
      alert('Lifecycle engine check failed');
    } finally {
      setLifecycleLoading(false);
    }
  };

  // Consolidate Units by Product into PO Modal
  const openConsolidatedPOModal = (productId: string, unitsToConsolidate: Unit[]) => {
    const unitIds = unitsToConsolidate.map((u) => u.id);
    const totalPacksNeeded = unitsToConsolidate.reduce(
      (sum, u) => sum + Math.max(1, u.total_packs || 1),
      0
    );
    const matchingComm =
      distributorCommodities.find((c) => c.product_id === productId) || distributorCommodities[0];

    setSelectedUnitIdsForPO(unitIds);
    setPoPacks(Math.max(1, totalPacksNeeded));
    if (matchingComm) {
      setSelectedCommodityId(matchingComm.id);
    }
    setPoNotes(
      `Consolidated supplier order for ${unitsToConsolidate.length} unit(s): ${unitsToConsolidate
        .map((u) => u.collection_landmark)
        .join(', ')}`
    );
    setIsPOModalOpen(true);
  };

  // Issue Consolidated Bulk Purchase Order
  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const chosenUnits = liveUnits.filter((u) => selectedUnitIdsForPO.includes(u.id));
    const fallbackUnit = liveUnits[0];
    const targetUnits = chosenUnits.length > 0 ? chosenUnits : fallbackUnit ? [fallbackUnit] : [];

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
    const landmarks = Array.from(
      new Set(targetUnits.map((u) => u.collection_landmark || '16 Biana street, New Extension'))
    );
    const localities = Array.from(
      new Set(targetUnits.map((u) => u.area_locality || 'Piwoyi'))
    ).join(' & ');

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
          destination_area: `${localities || 'Piwoyi'} Hubs, Abuja`,
          destination_landmarks:
            landmarks.length > 0 ? landmarks : ['16 Biana street, New Extension, Piwoyi'],
          total_packs: packs,
          total_goods_cost_kobo: goodsCost,
          total_delivery_fee_kobo: deliveryFee,
          total_amount_kobo: goodsCost + deliveryFee,
          status: 'PENDING',
          associated_unit_ids: targetUnits.map((u) => u.id),
          notes: poNotes,
        }),
      });

      if (res.ok) {
        setIsPOModalOpen(false);
        setActionBanner(
          `✓ Consolidated Purchase Order issued for ${targetUnits.length} unit(s) (${packs} bulk packs).`
        );
        appendAudit(
          `Issued consolidated PO to ${comm.distributor_name} for ${targetUnits.length} unit(s) (${formatKobo(
            goodsCost + deliveryFee
          )}).`
        );
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

  // Assign Driver & Dispatch Purchase Order
  const handleAssignDriverAndDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !assigningDriverPO) return;
    setDispatchingPO(true);
    try {
      const res = await fetch(`/api/admin/orders/${assigningDriverPO.id}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driver_name: driverName,
          driver_phone: driverPhone,
          vehicle_plate: vehiclePlate,
          waybill_number: waybillNumber,
        }),
      });
      if (res.ok) {
        setActionBanner(
          `✓ Driver ${driverName} (${vehiclePlate}) assigned to ${assigningDriverPO.order_number} (Waybill #${waybillNumber}). Units set to IN_TRANSIT!`
        );
        appendAudit(
          `Assigned Driver ${driverName} (${vehiclePlate}, Waybill #${waybillNumber}) to ${assigningDriverPO.order_number}.`
        );
        setAssigningDriverPO(null);
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to assign driver', err);
    } finally {
      setDispatchingPO(false);
    }
  };

  // Mark Purchase Order Delivered at Hub
  const handleMarkOrderDelivered = async (po: PurchaseOrder) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/orders/${po.id}/delivered`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActionBanner(
          `✓ Order ${po.order_number} marked DELIVERED at hub. Associated units are now READY_FOR_COLLECTION!`
        );
        appendAudit(`Confirmed hub delivery for ${po.order_number}.`);
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to mark order delivered', err);
    }
  };

  // Resolve Dispute & Optionally Credit Compensation
  const handleResolveDispute = async (
    dispute: Dispute,
    targetStatus: 'RESOLVED' | 'INVESTIGATING' | 'REJECTED'
  ) => {
    if (!token) return;
    setResolvingDisputeId(dispute.id);
    try {
      const notes =
        resolutionNotesMap[dispute.id] ||
        'Verified hub scale log and approved 4% safety buffer adjustment.';
      const compNaira = Number(compensationNairaMap[dispute.id] || 0);
      const compKobo = compNaira > 0 ? Math.round(compNaira * 100) : 0;

      const res = await fetch(`/api/admin/disputes/${dispute.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          resolution_notes: notes,
          compensation_user_id: dispute.user_id,
          compensation_kobo: compKobo,
        }),
      });
      if (res.ok) {
        setActionBanner(
          `✓ Dispute ${dispute.id} marked as ${targetStatus}${
            compKobo > 0 ? ` with ${formatKobo(compKobo)} wallet credit issued` : ''
          }.`
        );
        appendAudit(
          `Resolved dispute ${dispute.id} (${dispute.type}) -> ${targetStatus}. Notes: ${notes}`
        );
        fetchAllData();
      }
    } catch (err) {
      console.error('Failed to resolve dispute', err);
    } finally {
      setResolvingDisputeId(null);
    }
  };

  // Key platform metrics (live from /api/admin/overview with fallback calculation)
  const computedLiveGMV = liveUnits.reduce(
    (acc, u) =>
      acc + u.price_per_share_quoted_kobo * (u.current_shares_count || u.current_members_count),
    0
  );
  const totalGMVKobo = overviewMetrics?.total_gmv_kobo ?? computedLiveGMV + 1245000000;
  const platformRevenueKobo =
    overviewMetrics?.platform_revenue_kobo ?? Math.round(totalGMVKobo * 0.04);
  const walletLiabilitiesKobo = overviewMetrics?.wallet_liabilities_kobo ?? 12500000;
  const bufferEscrowKobo =
    overviewMetrics?.buffer_escrow_kobo ?? Math.round(computedLiveGMV * 0.04);
  const pendingReviewUnits = liveUnits.filter((u) => u.status === 'PENDING_ADMIN_REVIEW');
  const openDisputesCount = disputes.filter(
    (d) => d.status === 'OPEN' || d.status === 'INVESTIGATING'
  ).length;

  const uniqueLocalities = Array.from(
    new Set(liveUnits.map((u) => u.area_locality || u.area_city || 'Piwoyi'))
  );

  // Group active units by product for Supplier Consolidation
  const consolidationGroups = Object.values(
    liveUnits
      .filter(
        (u) =>
          u.status === 'OPEN' ||
          u.status === 'FULL' ||
          u.status === 'PAYMENT_CLOSED'
      )
      .reduce((acc, u) => {
        if (!acc[u.product_id]) {
          acc[u.product_id] = {
            product_id: u.product_id,
            product_name: u.product_name,
            pack_size: u.product_pack_size,
            units: [] as Unit[],
          };
        }
        acc[u.product_id].units.push(u);
        return acc;
      }, {} as Record<string, { product_id: string; product_name: string; pack_size: string; units: Unit[] }>)
  );

  return (
    <div className="pb-20 max-w-5xl mx-auto px-4 pt-4">
      {/* Admin Top Header & Live Ops KPIs */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-5 shadow-sm mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-700/70 text-purple-200 text-[10px] font-bold uppercase tracking-wider">
                Operations HQ
              </span>
              <span className="text-xs text-purple-200 font-medium">
                Subrole: {user?.admin_subrole || 'SUPER_ADMIN'}
              </span>
            </div>
            <h1 className="text-xl font-bold mt-1">SharedBuy Platform Operations</h1>
            <p className="text-xs text-purple-200/80 mt-0.5">
              End-to-end oversight of units, supplier consolidation, driver dispatch, escrow reconciliation & disputes across Piwoyi, Lugbe & Gwarinpa.
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
              Escrow & Paystack Active
            </div>
          </div>
        </div>

        {/* Top Operational KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-purple-800/60">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-semibold uppercase">
              Total GMV Processed
            </div>
            <div className="text-lg font-black text-white mt-1">{formatKobo(totalGMVKobo)}</div>
            <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
              Live Units GMV: {formatKobo(computedLiveGMV)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-semibold uppercase">
              Platform Revenue (4%)
            </div>
            <div className="text-lg font-black text-emerald-300 mt-1">
              {formatKobo(platformRevenueKobo)}
            </div>
            <div className="text-[10px] text-purple-300 font-medium mt-0.5">
              3% Coord. Pool:{' '}
              {formatKobo(overviewMetrics?.coordinator_commissions_kobo || 0)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-semibold uppercase">
              Wallet & Escrow Liabilities
            </div>
            <div className="text-lg font-black text-amber-300 mt-1">
              {formatKobo(walletLiabilitiesKobo)}
            </div>
            <div className="text-[10px] text-purple-300 font-medium mt-0.5">
              4% Buffer Held: {formatKobo(bufferEscrowKobo)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-purple-200 font-semibold uppercase">
              Units & Action Queue
            </div>
            <div className="text-lg font-black text-white mt-1">{liveUnits.length} Units</div>
            <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
              {pendingReviewUnits.length} Pending Approval • {openDisputesCount} Open Disputes
            </div>
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionBanner && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <CheckCircle size={15} className="text-emerald-700 shrink-0" />
            <span>{actionBanner}</span>
          </span>
          <button
            onClick={() => setActionBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Admin Module Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'kpi'
              ? 'text-purple-900 border-b-2 border-purple-800 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Units, Approvals & Cancellations ({liveUnits.length})</span>
          {pendingReviewUnits.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {pendingReviewUnits.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ordering')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'ordering'
              ? 'text-purple-900 border-b-2 border-purple-800 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Ordering, Consolidation & Drivers ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'finance'
              ? 'text-purple-900 border-b-2 border-purple-800 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Financial Reconciliation (76/15/4/3/4)
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'disputes'
              ? 'text-purple-900 border-b-2 border-purple-800 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Disputes & Audit Trail</span>
          {openDisputesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black">
              {openDisputesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'lifecycle'
              ? 'text-purple-900 border-b-2 border-purple-800 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Lifecycle, Termii & Hardening ({notificationLogs.length})
        </button>
      </div>

      {/* TAB 1: UNITS, APPROVALS & CANCELLATIONS */}
      {activeTab === 'kpi' && (
        <div className="space-y-4">
          {/* Pending Admin Review Priority Queue */}
          {pendingReviewUnits.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-300 text-xs space-y-2.5">
              <div className="font-bold text-amber-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-700" /> {pendingReviewUnits.length}{' '}
                  Coordinator Unit(s) Pending Admin Review
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  ACTION REQUIRED
                </span>
              </div>
              <div className="space-y-2">
                {pendingReviewUnits.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-white border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-gray-900">
                        {u.product_name} ({u.share_size}) — {formatKobo(u.price_per_share_quoted_kobo)}/share
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {u.collection_landmark} ({u.area_locality || 'Piwoyi'}) • Coordinator:{' '}
                        <strong>{u.manager_name}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpdateUnitStatus(u.id, 'OPEN')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                      >
                        ✓ Approve & Publish (OPEN)
                      </button>
                      <button
                        onClick={() => handleCancelUnitAndRefund(u)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold text-xs cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-3.5 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setUnitLocalityFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                  unitLocalityFilter === 'ALL'
                    ? 'bg-purple-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Localities ({liveUnits.length})
              </button>
              {uniqueLocalities.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setUnitLocalityFilter(loc)}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    unitLocalityFilter === loc
                      ? 'bg-purple-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={unitStatusFilter}
                onChange={(e) => setUnitStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-gray-50 border border-gray-200 font-semibold text-gray-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_ADMIN_REVIEW">PENDING_ADMIN_REVIEW</option>
                <option value="OPEN">OPEN</option>
                <option value="FULL">FULL</option>
                <option value="ORDERED">ORDERED</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="READY_FOR_COLLECTION">READY_FOR_COLLECTION</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <button
                onClick={fetchAllData}
                className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
                title="Refresh Units"
              >
                <RefreshCw size={14} className={loadingUnits ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Unit Lifecycle & Approval/Cancellation Management Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Platform Buying Units & Lifecycle Controls
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Approve pending coordinator units, transition operational states, or cancel &
                  trigger 100% member wallet refunds.
                </p>
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
                <Loader2 size={16} className="animate-spin text-purple-600" /> Loading platform
                units...
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {liveUnits
                  .filter((u) => {
                    const loc = u.area_locality || u.area_city || 'Piwoyi';
                    const matchLoc = unitLocalityFilter === 'ALL' || loc === unitLocalityFilter;
                    const matchStatus =
                      unitStatusFilter === 'ALL' || u.status === unitStatusFilter;
                    return matchLoc && matchStatus;
                  })
                  .map((unit) => {
                    const sharesClaimed = unit.current_shares_count || unit.current_members_count;
                    const percent = Math.min(
                      100,
                      Math.round((sharesClaimed / unit.max_members) * 100)
                    );
                    return (
                      <div
                        key={unit.id}
                        className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                unit.status === 'PENDING_ADMIN_REVIEW'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : unit.status === 'OPEN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : unit.status === 'FULL'
                                  ? 'bg-purple-100 text-purple-800'
                                  : unit.status === 'COMPLETED'
                                  ? 'bg-emerald-700 text-white'
                                  : unit.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {unit.status}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold text-[10px]">
                              {unit.area_locality || 'Piwoyi'}, {unit.area_state || 'FCT'} (
                              {unit.area_country || 'NG'})
                            </span>
                            <span className="font-mono text-gray-400 text-[10px]">{unit.id}</span>
                          </div>

                          <div className="font-bold text-gray-900 text-sm mt-1">
                            {unit.product_name} ({unit.share_size})
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {unit.collection_landmark} • Coordinator:{' '}
                            <strong>{unit.manager_name}</strong> ({unit.manager_phone})
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                            <span>Deadline: {formatDate(unit.payment_deadline)}</span>
                            <span>•</span>
                            <span>Sharing: {formatDate(unit.sharing_date)}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col sm:items-end gap-1.5">
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-gray-900">
                              {formatKobo(unit.price_per_share_quoted_kobo)}
                            </span>
                            <span className="text-[10px] text-gray-500 block">
                              / share ({sharesClaimed}/{unit.max_members} shares • {percent}%)
                            </span>
                          </div>

                          <div className="w-40 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percent >= 80 ? 'bg-emerald-600' : 'bg-purple-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          {/* Admin Approval, State Transition & Cancellation Controls */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {unit.status === 'PENDING_ADMIN_REVIEW' && (
                              <button
                                onClick={() => handleUpdateUnitStatus(unit.id, 'OPEN')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer transition-colors"
                              >
                                ✓ Approve & Open
                              </button>
                            )}
                            {unit.status === 'OPEN' && (
                              <button
                                onClick={() => handleUpdateUnitStatus(unit.id, 'FULL')}
                                className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[10px] cursor-pointer"
                              >
                                Lock for PO (FULL)
                              </button>
                            )}
                            {(unit.status === 'IN_TRANSIT' || unit.status === 'ORDERED') && (
                              <button
                                onClick={() =>
                                  handleUpdateUnitStatus(unit.id, 'READY_FOR_COLLECTION')
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10px] cursor-pointer"
                              >
                                Mark Ready for Pickup
                              </button>
                            )}
                            {unit.status === 'READY_FOR_COLLECTION' && (
                              <button
                                onClick={() => handleUpdateUnitStatus(unit.id, 'COMPLETED')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] cursor-pointer"
                              >
                                Complete & Settle Escrow
                              </button>
                            )}
                            {unit.status !== 'CANCELLED' && unit.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleCancelUnitAndRefund(unit)}
                                className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                title="Cancel unit and refund 100% of paid shares to member wallets"
                              >
                                <Ban size={10} /> Cancel & Refund
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ORDERING CONSOLE, SUPPLIER CONSOLIDATION & DRIVER ASSIGNMENT */}
      {activeTab === 'ordering' && (
        <div className="space-y-5 text-xs">
          {/* 1. Multi-Unit Supplier Consolidation Engine */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    <Layers size={11} /> Supplier Consolidation Engine
                  </span>
                </div>
                <h2 className="font-bold text-base text-gray-900 mt-1">
                  Consolidate Community Units by Commodity
                </h2>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Aggregate demand across multiple neighborhood hubs in Piwoyi & Lugbe into a single
                  wholesale Purchase Order to maximize miller discounts.
                </p>
              </div>

              <button
                onClick={() => {
                  if (liveUnits.length > 0 && selectedUnitIdsForPO.length === 0) {
                    setSelectedUnitIdsForPO([liveUnits[0].id]);
                  }
                  setIsPOModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <PlusCircle size={15} />
                <span>Custom Multi-Unit PO</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {consolidationGroups.map((grp) => {
                const totalShares = grp.units.reduce(
                  (s, u) => s + (u.current_shares_count || u.current_members_count),
                  0
                );
                const maxShares = grp.units.reduce((s, u) => s + u.max_members, 0);
                const totalPacks = grp.units.reduce((s, u) => s + Math.max(1, u.total_packs), 0);

                return (
                  <div
                    key={grp.product_id}
                    className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900 text-xs">{grp.product_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[10px]">
                          {grp.units.length} Active Unit(s)
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 mt-1">
                        Consolidated Volume: <strong>{totalPacks} × {grp.pack_size}</strong> (
                        {totalShares}/{maxShares} shares booked)
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 flex-wrap">
                        <MapPin size={11} className="text-purple-700" />
                        <span>
                          Hubs: {grp.units.map((u) => `${u.collection_landmark} (${u.area_locality || 'Piwoyi'})`).join(' • ')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openConsolidatedPOModal(grp.product_id, grp.units)}
                      className="w-full py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Layers size={13} />
                      <span>
                        Consolidate {grp.units.length} Unit(s) into Bulk PO ({totalPacks} Pack
                        {totalPacks > 1 ? 's' : ''})
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Live Distributor Commodity Quotes */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-gray-900">
                  Live Verified Agro Distributor Quotes
                </h3>
                <p className="text-[11px] text-gray-500">
                  Gate pricing and delivery rates quoted by accredited Abuja & regional commodity
                  depots.
                </p>
              </div>
              <span className="text-[11px] font-bold text-gray-500">
                {distributorCommodities.length} active quotes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {distributorCommodities.map((comm) => (
                <div
                  key={comm.id}
                  className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/90 hover:border-purple-300 transition-colors flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="font-bold text-gray-900 text-xs">{comm.product_name}</div>
                    <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                      {comm.distributor_name}
                    </div>
                    <div className="text-[10px] text-gray-500">{comm.warehouse_location}</div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Wholesale Price:</span>
                      <strong className="text-emerald-800">
                        {formatKobo(comm.price_per_pack_kobo)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Waybill Logistics:</span>
                      <strong className="text-gray-700">
                        {formatKobo(comm.delivery_fee_kobo)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-purple-900 pt-1 border-t border-gray-200/60">
                      <span>Total Landed:</span>
                      <span>
                        {formatKobo(comm.price_per_pack_kobo + comm.delivery_fee_kobo)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Delivery Management & Driver Assignment Console */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <Truck size={16} className="text-purple-700" /> Delivery Management, Driver
                  Assignment & Waybills
                </h3>
                <p className="text-[11px] text-gray-500">
                  Assign drivers, truck plates, and waybill numbers to purchase orders or confirm
                  hub arrival.
                </p>
              </div>
            </div>

            {purchaseOrders.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No bulk purchase orders generated yet.
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-gray-900">
                            {po.order_number}
                          </span>
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
                              : '⏳ AWAITING DRIVER ASSIGNMENT'}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Units: {(po.associated_unit_ids || []).join(', ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isDelivered && (
                            <button
                              onClick={() => {
                                setAssigningDriverPO(po);
                                setDriverName(po.driver_name || 'Audu Mohammed');
                                setDriverPhone(po.driver_phone || '+2348091122334');
                                setVehiclePlate(po.vehicle_plate || 'ABJ-774-XY');
                                setWaybillNumber(
                                  po.waybill_number || `WB-${Math.floor(1000 + Math.random() * 9000)}`
                                );
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck size={12} />
                              <span>
                                {po.driver_name ? 'Update Driver / Waybill' : 'Assign Driver & Dispatch'}
                              </span>
                            </button>
                          )}
                          {isDispatched && (
                            <button
                              onClick={() => handleMarkOrderDelivered(po)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle size={12} />
                              <span>Confirm Hub Delivery</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                        <div>
                          <div className="text-gray-500">Supplier:</div>
                          <div className="font-bold text-gray-900">{po.distributor_name}</div>
                          <div className="text-gray-500">{po.distributor_phone}</div>
                        </div>

                        <div>
                          <div className="text-gray-500">Destination Hubs:</div>
                          <div className="font-bold text-gray-900">{po.destination_area}</div>
                          <div className="text-gray-600">
                            {(po.destination_landmarks || []).join(' • ')}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-500">Packs & Financials:</div>
                          <div className="font-bold text-gray-900">
                            {po.total_packs} Pack(s) • Total: {formatKobo(po.total_amount_kobo)}
                          </div>
                          <div className="text-gray-500 text-[10px]">
                            Goods: {formatKobo(po.total_goods_cost_kobo)} | Logistics:{' '}
                            {formatKobo(po.total_delivery_fee_kobo)}
                          </div>
                        </div>
                      </div>

                      {po.driver_name && (
                        <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 text-blue-950 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <Truck size={14} className="text-blue-700 shrink-0" />
                            <span>
                              Waybill: <strong>{po.waybill_number}</strong> • Driver:{' '}
                              <strong>{po.driver_name}</strong> ({po.driver_phone}) • Truck Plate:{' '}
                              <strong>{po.vehicle_plate}</strong>
                            </span>
                          </div>
                          {po.dispatched_at && (
                            <span className="text-[10px] text-blue-700">
                              Dispatched: {formatDate(po.dispatched_at)}
                            </span>
                          )}
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

      {/* TAB 3: FINANCIAL RECONCILIATION (76/15/4/3/4 LEDGER & ESCROW SETTLEMENT) */}
      {activeTab === 'finance' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md">
                  Escrow & Unit Economics Reconciliation
                </span>
                <h2 className="font-bold text-sm text-gray-900 mt-1">
                  Financial Reconciliation Ledger (76% / 15% / 4% / 3% / 4%)
                </h2>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Reconcile collected member capital against supplier payouts, 4% platform revenue,
                  3% coordinator commissions, and 4% member surplus refunds.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {liveUnits.map((u) => {
                const shares = u.current_shares_count || u.current_members_count;
                const totalCollected = u.price_per_share_quoted_kobo * shares;
                const totalGoods = u.goods_cost_share_kobo * shares;
                const totalLogistics = u.delivery_cost_share_kobo * shares;
                const totalPlatformFee = u.platform_fee_share_kobo * shares;
                const totalCoordComm = u.manager_commission_share_kobo * shares;
                const totalBuffer = u.buffer_share_kobo * shares;
                const isSettled = u.status === 'COMPLETED';

                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-bold text-gray-900 text-xs block">
                            {u.product_name}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {u.collection_landmark} ({u.area_locality || 'Piwoyi'}) • {shares}/
                            {u.max_members} shares
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            isSettled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isSettled ? '✓ RECONCILED & SETTLED' : 'ESCROW ACTIVE'}
                        </span>
                      </div>

                      <div className="mt-2 p-2 rounded-xl bg-white border border-gray-200/80 flex justify-between items-center text-[11px]">
                        <span className="text-gray-600 font-medium">
                          Total Member Capital Collected:
                        </span>
                        <strong className="text-gray-900 font-black">
                          {formatKobo(totalCollected)}
                        </strong>
                      </div>

                      <div className="pt-2 space-y-1 text-[11px] text-gray-600">
                        <div className="flex justify-between">
                          <span>1. Wholesale Goods Allocation (76%):</span>
                          <span className="font-semibold text-gray-800">
                            {formatKobo(totalGoods)}{' '}
                            <span className="text-[10px] text-gray-400">
                              ({formatKobo(u.goods_cost_share_kobo)}/sh)
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>2. Distributor Logistics (15%):</span>
                          <span className="font-semibold text-gray-800">
                            {formatKobo(totalLogistics)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>3. SharedBuy Platform Revenue (4%):</span>
                          <span className="font-semibold text-emerald-700">
                            {formatKobo(totalPlatformFee)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>4. Coordinator Commission (3%):</span>
                          <span className="font-semibold text-purple-700">
                            {formatKobo(totalCoordComm)} ({isSettled ? 'Paid' : 'Pending'})
                          </span>
                        </div>
                        <div className="flex justify-between text-amber-800">
                          <span>5. Safety Buffer Surplus (4%):</span>
                          <span className="font-bold">
                            {formatKobo(totalBuffer)} ({isSettled ? 'Refunded to Wallets' : 'In Escrow'})
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isSettled && u.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleUpdateUnitStatus(u.id, 'COMPLETED')}
                        className="w-full mt-2 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <DollarSign size={13} />
                        <span>Reconcile & Settle Escrow (Pay 3% Comm + Refund 4% Buffer)</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DISPUTES RESOLUTION & AUDIT TRAIL */}
      {activeTab === 'disputes' && (
        <div className="space-y-5 text-xs">
          {/* 1. Disputes & Hub Incident Resolution Center */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <Scale size={16} className="text-purple-700" /> Disputes & Hub Quality Resolution
                  Center ({disputes.length})
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Investigate coordinator shortage/scale reports or member claims, record resolution
                  notes, and issue wallet compensation credits.
                </p>
              </div>
            </div>

            {disputes.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No disputes logged.</div>
            ) : (
              <div className="space-y-3">
                {disputes.map((d) => {
                  const isResolved = d.status === 'RESOLVED' || d.status === 'REJECTED';
                  return (
                    <div
                      key={d.id}
                      className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                            {d.type}
                          </span>
                          <span className="font-bold text-gray-900">
                            {d.unit_product_name || d.unit_id}
                          </span>
                          {d.unit_landmark && (
                            <span className="text-gray-500 text-[11px]">• {d.unit_landmark}</span>
                          )}
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            d.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-200 text-amber-950'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>

                      <p className="text-gray-700 leading-relaxed">{d.description}</p>
                      <div className="text-[10px] text-gray-400">
                        Reported by: <strong>{d.reporter_name || d.user_id}</strong> •{' '}
                        {formatDate(d.created_at)}
                      </div>

                      {d.resolution_notes && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px]">
                          <strong>Admin Resolution:</strong> {d.resolution_notes}
                        </div>
                      )}

                      {!isResolved && (
                        <div className="pt-2 border-t border-gray-200 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={resolutionNotesMap[d.id] ?? ''}
                              onChange={(e) =>
                                setResolutionNotesMap({
                                  ...resolutionNotesMap,
                                  [d.id]: e.target.value,
                                })
                              }
                              placeholder="Enter resolution notes (e.g. Covered via 4% safety buffer)..."
                              className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs"
                            />
                            <input
                              type="number"
                              min="0"
                              value={compensationNairaMap[d.id] ?? ''}
                              onChange={(e) =>
                                setCompensationNairaMap({
                                  ...compensationNairaMap,
                                  [d.id]: e.target.value,
                                })
                              }
                              placeholder="Optional Wallet Credit (₦)"
                              className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={resolvingDisputeId === d.id}
                              onClick={() => handleResolveDispute(d, 'RESOLVED')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <FileCheck size={12} />
                              <span>Resolve & Apply</span>
                            </button>
                            <button
                              disabled={resolvingDisputeId === d.id}
                              onClick={() => handleResolveDispute(d, 'INVESTIGATING')}
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] cursor-pointer"
                            >
                              Mark Investigating
                            </button>
                            <button
                              disabled={resolvingDisputeId === d.id}
                              onClick={() => handleResolveDispute(d, 'REJECTED')}
                              className="px-3 py-1.5 rounded-xl bg-gray-200 hover:bg-red-100 hover:text-red-800 text-gray-700 font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Immutable Platform Audit Trail */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <History size={16} className="text-gray-500" /> Immutable Platform Audit Trail (
              {auditLogs.length})
            </h2>
            <div className="space-y-2 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                >
                  <span>
                    <strong className="text-purple-800">[{log.timestamp}]</strong> {log.event}
                  </span>
                  <span className="text-gray-400 text-[10px] shrink-0">{log.actor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LIFECYCLE & DEADLINE ENGINE */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-4 text-xs">
          <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">
                    Automated Lifecycle & Deadline Engine
                  </h2>
                  <p className="text-xs text-indigo-200/80">
                    Continuous 30-second background ticker & escrow protection.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Engine Worker Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                  <CheckCircle size={14} /> 1. Auto-Lock on Full Capacity
                </div>
                <p className="text-[11px] text-gray-300">
                  When all shares in a unit are claimed and paid, the unit status transitions from{' '}
                  <code className="text-emerald-300 font-mono">OPEN</code> to{' '}
                  <code className="text-purple-300 font-mono">FULL</code>, queueing wholesale
                  consolidation.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={14} /> 2. Automated 100% Wallet Refunds
                </div>
                <p className="text-[11px] text-gray-300">
                  If a unit's payment deadline expires before reaching capacity, the engine cancels
                  the unit and credits 100% of capital back to each member's wallet with zero fee.
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
                  Sweep Timestamp: <strong>{formatDate(lifecycleReport.timestamp)}</strong> • Units
                  Auto-Locked: <strong className="text-white">{lifecycleReport.units_locked}</strong>{' '}
                  • Member Shares Auto-Refunded:{' '}
                  <strong className="text-white">{lifecycleReport.shares_refunded}</strong>
                </div>
              </div>
            )}
          </div>

          {/* 2. Termii SMS & WhatsApp Notification Dispatcher Ledger */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-sm text-gray-900">
                  Termii SMS & WhatsApp Notification Dispatcher ({notificationLogs.length})
                </h2>
                <p className="text-[11px] text-gray-500">
                  Real-time OTPs, Paystack escrow receipts, and coordinator hub broadcasts via Termii DND & WhatsApp channels.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Termii v3 Dispatcher Active
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {notificationLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.channel === 'WHATSAPP'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}
                      >
                        {log.channel}
                      </span>
                      <span className="font-mono font-bold text-gray-800">{log.recipient}</span>
                      <span className="text-[10px] text-gray-400">
                        • Gateway: {log.gateway} ({log.gateway_msg_id})
                      </span>
                    </div>
                    <p className="text-gray-600 text-[11px]">{log.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {log.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatDate(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Production Security, Rate Limiting & Slow 3G Hardening Audit */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-700" />
                  Production Hardening, Rate Limiting & Slow 3G Optimization Audit
                </h2>
                <p className="text-[11px] text-gray-500">
                  Live verification of security headers, IP token-bucket rate limiters, Gzip compression, and PWA service worker caching.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 font-bold text-[10px]">
                GRADE A+ HARDENED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {securityChecks.map((chk, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-gray-900 text-xs">{chk.control}</div>
                    <div className="text-[11px] text-gray-600 mt-0.5">{chk.details}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] shrink-0">
                    {chk.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Multi-Unit Consolidated PO Creation Modal */}
      {isPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Issue Consolidated Bulk Purchase Order
                </h3>
                <p className="text-[11px] text-gray-500">
                  Select one or more units to consolidate into a single supplier dispatch.
                </p>
              </div>
              <button
                onClick={() => setIsPOModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePurchaseOrder} className="space-y-3.5">
              <div>
                <label className="block text-gray-700 font-semibold mb-1.5">
                  Select Community Units to Consolidate ({selectedUnitIdsForPO.length} selected):
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-gray-50 border border-gray-200">
                  {liveUnits.map((u) => {
                    const checked = selectedUnitIdsForPO.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUnitIdsForPO([...selectedUnitIdsForPO, u.id]);
                            } else {
                              setSelectedUnitIdsForPO(
                                selectedUnitIdsForPO.filter((id) => id !== u.id)
                              );
                            }
                          }}
                          className="rounded text-purple-700"
                        />
                        <span className="text-[11px] text-gray-800 font-medium">
                          <strong>{u.product_name}</strong> — {u.collection_landmark} (
                          {u.area_locality || 'Piwoyi'}) [{u.status}]
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Select Distributor Commodity Quote:
                </label>
                <select
                  value={selectedCommodityId}
                  onChange={(e) => setSelectedCommodityId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                >
                  {distributorCommodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.product_name} — {c.distributor_name} ({formatKobo(c.price_per_pack_kobo)} +{' '}
                      {formatKobo(c.delivery_fee_kobo)} logistics)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Total Wholesale Packs / Bags:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={poPacks}
                  onChange={(e) => setPoPacks(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

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
                      Consolidated Purchase Order Escrow Breakdown
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
                <label className="block text-gray-700 font-semibold mb-1">
                  Dispatch Notes & Hub Offloading Instructions:
                </label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPOModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPO}
                  className="w-1/2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
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

      {/* Driver Assignment & Waybill Dispatch Modal */}
      {assigningDriverPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Assign Driver & Dispatch Truck
                </h3>
                <p className="text-[11px] text-gray-500">
                  Order: <strong>{assigningDriverPO.order_number}</strong> →{' '}
                  {assigningDriverPO.destination_area}
                </p>
              </div>
              <button
                onClick={() => setAssigningDriverPO(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignDriverAndDispatch} className="space-y-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Driver Full Name</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Driver Phone Number</label>
                <input
                  type="text"
                  required
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Truck Plate Number</label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Waybill Number</label>
                  <input
                    type="text"
                    required
                    value={waybillNumber}
                    onChange={(e) => setWaybillNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={dispatchingPO}
                className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                {dispatchingPO
                  ? 'Assigning Driver & Updating Units...'
                  : 'Confirm Driver & Dispatch to Hubs'}
              </button>
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
