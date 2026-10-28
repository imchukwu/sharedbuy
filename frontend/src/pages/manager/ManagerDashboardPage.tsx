import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo, formatDate } from '../../utils/formatters';
import type {
  Unit,
  UnitMember,
  PurchaseOrder,
  ManagerCommissionSummary,
  Dispute,
  WalletSummary,
} from '../../types';
import {
  CheckCircle,
  ShieldCheck,
  Scale,
  Box,
  MapPin,
  Send,
  QrCode,
  Check,
  Share2,
  PlusCircle,
  Loader2,
  RefreshCw,
  Clock,
  ExternalLink,
  Users,
  Camera,
  Search,
  X,
  ScanLine,
  Smartphone,
  Truck,
  Wallet,
  AlertTriangle,
  Phone,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FileText,
  UserX,
  Award,
} from 'lucide-react';
import { CreateUnitModal } from '../../components/unit/CreateUnitModal';

export const ManagerDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'units' | 'deliveries' | 'collections' | 'earnings'
  >('overview');

  // Verification state
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    message: string;
    member?: UnitMember;
    unit?: Unit;
  } | null>(null);

  // Managed units & members state
  const [managedUnits, setManagedUnits] = useState<Unit[]>([]);
  const [unitMembers, setUnitMembers] = useState<{ [unitId: string]: UnitMember[] }>({});
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [unitLocalityFilter, setUnitLocalityFilter] = useState<string>('ALL');
  const [unitStatusFilter, setUnitStatusFilter] = useState<string>('ALL');
  const [updatingUnitId, setUpdatingUnitId] = useState<string | null>(null);

  // Collections desk filter state
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [selectedCollectionUnitId, setSelectedCollectionUnitId] = useState<string>('ALL');
  const [filterCollectionStatus, setFilterCollectionStatus] = useState<
    'ALL' | 'PENDING' | 'COLLECTED' | 'NO_SHOW'
  >('ALL');

  // Incoming deliveries & disputes state
  const [incomingOrders, setIncomingOrders] = useState<PurchaseOrder[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [verifiedWeights, setVerifiedWeights] = useState<{ [poId: string]: string }>({});
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [disputeUnitId, setDisputeUnitId] = useState<string>('');
  const [disputeType, setDisputeType] = useState<'QUALITY' | 'SHORTAGE' | 'NO_SHOW' | 'OTHER'>('QUALITY');
  const [disputeDescription, setDisputeDescription] = useState<string>('');
  const [disputePhotoUrls, setDisputePhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Commissions & Wallet state
  const [commissionSummary, setCommissionSummary] = useState<ManagerCommissionSummary | null>(null);
  const [walletSummary, setWalletSummary] = useState<WalletSummary | null>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmountNaira, setWithdrawAmountNaira] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('Moniepoint MFB');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('8011112222');
  const [withdrawAccountName, setWithdrawAccountName] = useState(user?.full_name || 'Aisha Bello');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawFeedback, setWithdrawFeedback] = useState<string | null>(null);

  // Broadcast state
  const [selectedBroadcastUnitId, setSelectedBroadcastUnitId] = useState<string>('');
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  // Lifecycle check state
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleReport, setLifecycleReport] = useState<{
    timestamp: string;
    units_locked: number;
    shares_refunded: number;
    message: string;
  } | null>(null);

  // Equipment checklist state
  const [checklist, setChecklist] = useState({
    scale: true,
    containers: true,
    storage: true,
    scaleTestReading: '50.0 kg calibrated',
  });

  const fetchManagerPortalData = async () => {
    if (!token) return;
    setLoadingUnits(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [unitsRes, ordersRes, commRes, dispRes, walletRes] = await Promise.all([
        fetch('/api/manager/units', { headers }),
        fetch('/api/manager/orders', { headers }),
        fetch('/api/manager/commissions', { headers }),
        fetch('/api/manager/disputes', { headers }),
        fetch('/api/wallet', { headers }),
      ]);

      if (unitsRes.ok) {
        const units: Unit[] = await unitsRes.json();
        const safeUnits = units || [];
        setManagedUnits(safeUnits);
        if (safeUnits.length > 0 && !selectedBroadcastUnitId) {
          setSelectedBroadcastUnitId(safeUnits[0].id);
        }
        if (safeUnits.length > 0 && !disputeUnitId) {
          setDisputeUnitId(safeUnits[0].id);
        }

        // Fetch members for each unit (include Bearer token so Coordinator receives unmasked pickup codes)
        for (const u of safeUnits) {
          fetch(`/api/units/${u.id}/members`, { headers })
            .then((r) => r.json())
            .then((members) => {
              setUnitMembers((prev) => ({ ...prev, [u.id]: members || [] }));
            })
            .catch(() => {});
        }
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setIncomingOrders(ordersData || []);
      }

      if (commRes.ok) {
        const commData = await commRes.json();
        setCommissionSummary(commData);
      }

      if (dispRes.ok) {
        const dispData = await dispRes.json();
        setDisputes(dispData || []);
      }

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWalletSummary(walletData);
      }
    } catch (err) {
      console.error('Failed to load manager portal data', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    fetchManagerPortalData();
  }, [token]);

  // Execute verification for a specific 6-digit code
  const executeCodeVerification = async (codeToVerify: string) => {
    const cleanCode = codeToVerify.trim();
    if (cleanCode.length !== 6 || !token) return;

    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/manager/units/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: cleanCode }),
      });

      const data = await res.json();
      if (res.ok) {
        setVerifyResult({
          success: true,
          message: data.message,
          member: data.member,
          unit: data.unit,
        });
        setVerifyCode('');
        setIsScannerOpen(false);
        fetchManagerPortalData();
      } else {
        setVerifyResult({
          success: false,
          message: data.error || 'Verification failed. Please check member phone receipt.',
        });
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        message: err.message || 'Verification network error',
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCodeVerification(verifyCode);
  };

  // Update Unit Operational Status
  const handleUpdateUnitStatus = async (unitId: string, newStatus: string) => {
    if (!token) return;
    setUpdatingUnitId(unitId);
    try {
      const res = await fetch(`/api/manager/units/${unitId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchManagerPortalData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update unit status');
      }
    } catch (err) {
      alert('Network error updating unit status');
    } finally {
      setUpdatingUnitId(null);
    }
  };

  // Mark Member Collection Status (e.g. NO_SHOW or PENDING)
  const handleUpdateMemberStatus = async (
    unitId: string,
    memberId: string,
    collectionStatus: 'COLLECTED' | 'NO_SHOW' | 'PENDING'
  ) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/manager/units/${unitId}/members/${memberId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collection_status: collectionStatus }),
      });
      if (res.ok) {
        await fetchManagerPortalData();
      }
    } catch (err) {
      console.error('Failed to update member status', err);
    }
  };

  // Confirm Incoming Purchase Order / Waybill Receipt at Hub
  const handleConfirmOrderReceipt = async (poId: string) => {
    if (!token) return;
    setConfirmingOrderId(poId);
    try {
      const weight = verifiedWeights[poId] || '50.2kg per bag (Scale Verified)';
      const res = await fetch(`/api/manager/orders/${poId}/confirm-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verified_weight_kg: weight,
          inspection_notes: 'Confirmed intact bags and calibrated scale weight at Hub.',
        }),
      });
      if (res.ok) {
        await fetchManagerPortalData();
      }
    } catch (err) {
      console.error('Error confirming order receipt', err);
    } finally {
      setConfirmingOrderId(null);
    }
  };

  // Submit Hub Quality / Shortage / Incident Log
  const handleUploadEvidencePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setDisputePhotoUrls((prev) => [...prev, data.url]);
      } else {
        alert(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      alert('Network error uploading photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !disputeUnitId || !disputeDescription.trim()) return;
    setSubmittingDispute(true);
    try {
      const res = await fetch('/api/manager/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          unit_id: disputeUnitId,
          type: disputeType,
          description: disputeDescription.trim(),
          photo_urls: disputePhotoUrls,
        }),
      });
      if (res.ok) {
        setDisputeDescription('');
        setDisputePhotoUrls([]);
        await fetchManagerPortalData();
      }
    } catch (err) {
      console.error('Failed to log hub report', err);
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Withdraw Coordinator Earnings to Bank
  const handleWithdrawEarnings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const amountKobo = Math.round(Number(withdrawAmountNaira) * 100);
    if (!amountKobo || amountKobo < 50000) {
      setWithdrawFeedback('Minimum withdrawal is ₦500');
      return;
    }

    setWithdrawLoading(true);
    setWithdrawFeedback(null);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount_kobo: amountKobo,
          bank_name: withdrawBank,
          account_number: withdrawAccountNumber,
          account_name: withdrawAccountName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawFeedback(data.message || '✓ Payout transferred to your bank account!');
        setWithdrawAmountNaira('');
        await fetchManagerPortalData();
      } else {
        setWithdrawFeedback(data.error || 'Withdrawal failed');
      }
    } catch (err) {
      setWithdrawFeedback('Network error processing withdrawal');
    } finally {
      setWithdrawLoading(false);
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
        fetchManagerPortalData();
      }
    } catch (err) {
      alert('Lifecycle check failed');
    } finally {
      setLifecycleLoading(false);
    }
  };

  // Flatten all members for collections desk
  const allMembers: { member: UnitMember; unit: Unit }[] = [];
  managedUnits.forEach((u) => {
    const mems = unitMembers[u.id] || [];
    mems.forEach((m) => {
      allMembers.push({ member: m, unit: u });
    });
  });

  const pendingPickupMembers = allMembers.filter((m) => m.member.collection_status === 'PENDING');
  const activeBroadcastUnit =
    managedUnits.find((u) => u.id === selectedBroadcastUnitId) || managedUnits[0];

  const sendWhatsAppBroadcast = async (templateType: 'ARRIVED' | 'REMINDER' | 'INVITE') => {
    const unitName = activeBroadcastUnit?.product_name || 'Bulk Staple Unit';
    const landmark = activeBroadcastUnit?.collection_landmark || '16 Biana street, New Extension';
    const locality = activeBroadcastUnit?.area_locality || 'Piwoyi';
    const unitLink = `${window.location.origin}/?unit=${activeBroadcastUnit?.id || ''}`;

    let text = '';
    if (templateType === 'ARRIVED') {
      text = `📢 *SharedBuy ${locality} Hub Update*\n\nHello Neighbors! Our bulk delivery for *${unitName}* has arrived safely at *${landmark}* and passed scale weight verification.\n\nPlease bring your 6-digit pickup code to collect your share. Thank you!`;
    } else if (templateType === 'REMINDER') {
      text = `⏰ *Collection Reminder — ${locality} Hub*\n\nSharing for *${unitName}* starts at 10:00 AM today at *${landmark} (${locality})*.\n\nRemember to have your 6-digit receipt code ready on your phone!`;
    } else {
      const rem = activeBroadcastUnit
        ? Math.max(0, activeBroadcastUnit.max_members - (activeBroadcastUnit.current_shares_count || activeBroadcastUnit.current_members_count))
        : 3;
      text = `🛒 *Neighbors in ${locality}!* Only *${rem} share(s)* left in our wholesale group buy for *${unitName}* at *${landmark}*.\n\nLock in your share before the deadline: ${unitLink}`;
    }

    // Also dispatch via Termii SMS & WhatsApp API in the background
    if (token) {
      fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          unit_id: activeBroadcastUnit?.id || 'unit-1',
          channel: 'BOTH',
          template_type: templateType,
          message: text.replace(/\*/g, ''),
        }),
      }).catch(() => {});
    }

    setBroadcastFeedback(`✓ Termii SMS + WhatsApp Broadcast dispatched for ${unitName} (${landmark})`);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const pendingCommissionKobo =
    commissionSummary?.pending_commission_kobo ??
    managedUnits.reduce(
      (sum, u) =>
        u.status !== 'COMPLETED'
          ? sum + u.manager_commission_share_kobo * (u.current_shares_count || u.current_members_count)
          : sum,
      0
    );

  const walletBalanceKobo =
    walletSummary?.balance_kobo ??
    commissionSummary?.wallet_balance_kobo ??
    user?.wallet_balance_kobo ??
    0;

  const uniqueLocalities = Array.from(
    new Set(managedUnits.map((u) => u.area_locality || u.area_city || 'Piwoyi'))
  );

  return (
    <div className="pb-24 max-w-4xl mx-auto px-3.5 pt-4">
      {/* Header Profile & Coordinator KPIs */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-2xs mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-emerald-900 text-lg shrink-0">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="font-bold text-base text-gray-900">
                  {user?.full_name || 'Aisha Bello'}
                </h1>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <ShieldCheck size={11} /> Accredited Hub Coordinator
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {user?.area_name || 'Piwoyi District Hub, Abuja'} • Rating:{' '}
                <strong className="text-emerald-800">{user?.rating || 4.95}★</strong> • Commission
                Tier: <strong>3%</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('earnings')}
              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet size={14} className="text-amber-700" />
              <span>Payouts</span>
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Launch Unit</span>
            </button>
          </div>
        </div>

        {/* 4 Live Coordinator KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-gray-100 text-center">
          <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-black text-gray-900">{managedUnits.length}</div>
            <div className="text-[11px] text-gray-500 font-medium">Managed Units</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-black text-emerald-700">
              {pendingPickupMembers.length}{' '}
              <span className="text-xs font-normal text-gray-400">/ {allMembers.length}</span>
            </div>
            <div className="text-[11px] text-gray-500 font-medium">Awaiting Pickup</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100">
            <div className="text-base font-black text-amber-800">
              {formatKobo(pendingCommissionKobo)}
            </div>
            <div className="text-[11px] text-amber-700 font-medium">Pending 3% Comm.</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <div className="text-base font-black text-emerald-900">
              {formatKobo(walletBalanceKobo)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">Available Wallet</div>
          </div>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Pickup Verifier & Hub
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'units'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          My Managed Units ({managedUnits.length})
        </button>
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
            activeTab === 'deliveries'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Incoming Trucks & Log</span>
          {incomingOrders.filter((o) => o.status === 'DISPATCHED').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
              {incomingOrders.filter((o) => o.status === 'DISPATCHED').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'collections'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Collection Desk ({allMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`pb-2.5 px-3 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'earnings'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          3% Commissions & Payouts
        </button>
      </div>

      {/* TAB 1: OVERVIEW (Pickup Verification Desk, Hub Readiness, WhatsApp Broadcast) */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* 1. Quick Collection Code Verifier */}
          <div className="bg-emerald-900 text-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-emerald-300" />
                <h2 className="font-bold text-sm">Collection Day Code Verifier</h2>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200">
                Piwoyi & Abuja Hubs
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 mb-3.5 leading-relaxed">
              When neighbors arrive at your pickup landmark, enter their 6-digit receipt code or scan their QR code to verify payment and release their weighed share. When the final member collects, your 3% Coordinator Commission settles automatically!
            </p>

            <form onSubmit={handleVerifyCode} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="Enter 6-digit code (e.g. 192847)"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white text-gray-900 font-mono font-bold text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 border border-emerald-600/80 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
                  title="Open Camera QR Scanner"
                >
                  <Camera size={15} />
                  <span className="hidden sm:inline">Scan QR</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={verifyLoading || verifyCode.trim().length !== 6}
                className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                {verifyLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <span>Verify & Release</span>
                )}
              </button>
            </form>

            {/* Quick pending codes pill bar for fast demo testing */}
            {pendingPickupMembers.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-emerald-800/80 flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-emerald-300 font-medium">Awaiting Pickup Codes:</span>
                {pendingPickupMembers.slice(0, 4).map(({ member }) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setVerifyCode(member.collection_code)}
                    className="px-2 py-0.5 rounded-md bg-emerald-800/90 hover:bg-emerald-700 text-emerald-100 font-mono text-[10px] border border-emerald-700 cursor-pointer transition-colors"
                  >
                    {member.user_name.split(' ')[0]}: <strong>{member.collection_code}</strong>
                  </button>
                ))}
              </div>
            )}

            {verifyResult && (
              <div
                className={`mt-3.5 p-3.5 rounded-2xl text-xs font-medium border ${
                  verifyResult.success
                    ? 'bg-emerald-800/90 border-emerald-400 text-white shadow-md'
                    : 'bg-red-900/90 border-red-400 text-red-100 shadow-md'
                }`}
              >
                <div className="font-bold flex items-center gap-2 text-sm">
                  {verifyResult.success ? (
                    <CheckCircle size={18} className="text-emerald-300 shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-red-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      ✕
                    </span>
                  )}
                  <span>{verifyResult.message}</span>
                </div>
                {verifyResult.member && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/20 text-[11px] grid grid-cols-2 gap-2">
                    <div>
                      Member: <strong className="text-white">{verifyResult.member.user_name}</strong>
                    </div>
                    <div>
                      Phone: <strong className="text-white">{verifyResult.member.user_phone}</strong>
                    </div>
                    <div>
                      Product: <strong className="text-white">{verifyResult.unit?.product_name}</strong>
                    </div>
                    <div>
                      Shares Released:{' '}
                      <strong className="text-white">
                        {verifyResult.member.shares_count} × {verifyResult.unit?.share_size}
                      </strong>
                    </div>
                    <div className="col-span-2 text-emerald-200 text-[10px]">
                      Collection Status:{' '}
                      <span className="font-bold uppercase tracking-wider text-white">
                        COLLECTED
                      </span>{' '}
                      (Timestamped in Ledger)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Incoming Truck Alert Banner (if any order is DISPATCHED) */}
          {incomingOrders.filter((o) => o.status === 'DISPATCHED').map((po) => (
            <div
              key={po.id}
              className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Truck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                      TRUCK EN ROUTE
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-900">
                      Waybill: {po.waybill_number || 'WB-9941'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 mt-1">
                    {po.total_packs} Bulk Packs from {po.distributor_name} → {po.destination_area}
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Driver: <strong>{po.driver_name}</strong> ({po.driver_phone}) • Plate:{' '}
                    <strong>{po.vehicle_plate}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('deliveries')}
                className="px-3.5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
              >
                Inspect & Confirm Receipt →
              </button>
            </div>
          ))}

          {/* 3. Hub Equipment Readiness & Scale Calibration Log */}
          <div className="bg-white rounded-3xl p-4.5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" /> Hub Equipment & Scale Readiness
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                {checklist.scale && checklist.containers && checklist.storage
                  ? '✓ 100% Sharing Ready'
                  : 'Action Required'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checklist.scale}
                    onChange={(e) => setChecklist({ ...checklist, scale: e.target.checked })}
                    className="rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <Scale size={16} className="text-emerald-700" />
                  <span className="text-gray-800 font-medium">
                    Calibrated Digital Weighing Scale ready (50kg+ capacity)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                  {checklist.scaleTestReading}
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.containers}
                  onChange={(e) => setChecklist({ ...checklist, containers: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-600"
                />
                <Box size={16} className="text-emerald-700" />
                <span className="text-gray-800 font-medium">
                  Food-grade bags, funnels & 5kg/2.5kg containers for hygienic splitting
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.storage}
                  onChange={(e) => setChecklist({ ...checklist, storage: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-600"
                />
                <MapPin size={16} className="text-emerald-700" />
                <span className="text-gray-800 font-medium">
                  Dry, rain-protected pallet space at Piwoyi & Lugbe collection hubs
                </span>
              </label>
            </div>
          </div>

          {/* 4. Dynamic 1-Tap WhatsApp Broadcast Composer */}
          <div className="bg-white rounded-3xl p-4.5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Send size={14} className="text-emerald-600" /> 1-Tap Member WhatsApp Broadcast
              </h3>

              {managedUnits.length > 0 && (
                <select
                  value={selectedBroadcastUnitId}
                  onChange={(e) => setSelectedBroadcastUnitId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {managedUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.product_name} — {u.collection_landmark} ({u.area_locality || 'Piwoyi'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => sendWhatsAppBroadcast('ARRIVED')}
                className="p-3 text-left rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-colors cursor-pointer"
              >
                <div className="font-bold">📢 "Goods arrived safely!"</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Notify members that bulk bags arrived & passed scale checks.
                </div>
              </button>

              <button
                onClick={() => sendWhatsAppBroadcast('REMINDER')}
                className="p-3 text-left rounded-xl bg-amber-50/70 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
              >
                <div className="font-bold">⏰ "Collection at 10 AM"</div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  Send pickup reminder with landmark & 6-digit code prompt.
                </div>
              </button>

              <button
                onClick={() => sendWhatsAppBroadcast('INVITE')}
                className="p-3 text-left rounded-xl bg-blue-50/70 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-colors cursor-pointer"
              >
                <div className="font-bold">🛒 "Fill remaining slots"</div>
                <div className="text-[11px] text-blue-700 mt-0.5">
                  Share unit invite link to estate WhatsApp group.
                </div>
              </button>
            </div>

            {broadcastFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Check size={14} /> {broadcastFeedback}
                </span>
                <button
                  onClick={() => setBroadcastFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-950"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY MANAGED UNITS */}
      {activeTab === 'units' && (
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-3.5 rounded-2xl border border-gray-200/80">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setUnitLocalityFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  unitLocalityFilter === 'ALL'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Localities ({managedUnits.length})
              </button>
              {uniqueLocalities.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setUnitLocalityFilter(loc)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    unitLocalityFilter === loc
                      ? 'bg-emerald-700 text-white'
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
                className="px-2.5 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_ADMIN_REVIEW">PENDING_ADMIN_REVIEW</option>
                <option value="OPEN">OPEN</option>
                <option value="FULL">FULL</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="READY_FOR_COLLECTION">READY_FOR_COLLECTION</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs hover:bg-emerald-800 cursor-pointer shrink-0"
              >
                <PlusCircle size={14} /> Launch Unit
              </button>
            </div>
          </div>

          {loadingUnits ? (
            <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading managed units...
            </div>
          ) : (
            managedUnits
              .filter((u) => {
                const loc = u.area_locality || u.area_city || 'Piwoyi';
                const matchLoc = unitLocalityFilter === 'ALL' || loc === unitLocalityFilter;
                const matchStatus = unitStatusFilter === 'ALL' || u.status === unitStatusFilter;
                return matchLoc && matchStatus;
              })
              .map((unit) => {
                const members = unitMembers[unit.id] || [];
                const sharesFilled = unit.current_shares_count || unit.current_members_count;
                const percentFilled = Math.min(
                  100,
                  Math.round((sharesFilled / unit.max_members) * 100)
                );
                const isExpanded = expandedUnitId === unit.id;

                return (
                  <div
                    key={unit.id}
                    className="bg-white rounded-3xl border border-gray-200 p-4.5 shadow-2xs space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              unit.status === 'PENDING_ADMIN_REVIEW'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : unit.status === 'READY_FOR_COLLECTION'
                                ? 'bg-emerald-600 text-white'
                                : unit.status === 'COMPLETED'
                                ? 'bg-gray-800 text-white'
                                : unit.status === 'IN_TRANSIT'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {unit.status}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800">
                            {unit.area_locality || 'Piwoyi'}, {unit.area_state || 'FCT'}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{unit.id}</span>
                        </div>
                        <h3 className="font-bold text-sm text-gray-900 mt-1.5">
                          {unit.product_name} ({unit.share_size})
                        </h3>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                          <MapPin size={12} className="text-emerald-700 shrink-0" />
                          <span className="font-medium text-gray-700">
                            {unit.collection_landmark}
                          </span>
                          <span>• {unit.collection_address}</span>
                          {unit.collection_map_url && (
                            <a
                              href={unit.collection_map_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-emerald-800 underline ml-1 inline-flex items-center gap-0.5"
                            >
                              Map <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            const rem = Math.max(0, unit.max_members - sharesFilled);
                            window.open(
                              `https://api.whatsapp.com/send?text=${encodeURIComponent(
                                `Neighbors in ${
                                  unit.area_locality || 'Piwoyi'
                                }, our group purchase for ${
                                  unit.product_name
                                } at ${unit.collection_landmark} has ${rem} share(s) left! Join here: ${
                                  window.location.origin
                                }/?unit=${unit.id}`
                              )}`,
                              '_blank'
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <Share2 size={13} /> Invite
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                        <span>
                          Shares Booked: {sharesFilled} / {unit.max_members} shares (
                          {members.length} neighbors)
                        </span>
                        <span>{percentFilled}% Filled</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${percentFilled}%` }}
                        />
                      </div>
                    </div>

                    {/* Pricing and Coordinator 3% Commission Breakdown */}
                    <div className="bg-gray-50 rounded-2xl p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 border border-gray-100">
                      <div>
                        <div className="text-[10px] text-gray-400">Member Share Price</div>
                        <div className="font-bold text-gray-900">
                          {formatKobo(unit.price_per_share_quoted_kobo)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">3% Comm. / Share</div>
                        <div className="font-bold text-emerald-800 font-mono">
                          {formatKobo(unit.manager_commission_share_kobo)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">Earned So Far (3%)</div>
                        <div className="font-black text-emerald-700 font-mono">
                          {formatKobo(unit.manager_commission_share_kobo * sharesFilled)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">Sharing Date</div>
                        <div className="font-semibold text-gray-800">
                          {formatDate(unit.sharing_date)}
                        </div>
                      </div>
                    </div>

                    {/* Coordinator Operational Controls & Roster Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                      >
                        <Users size={13} />
                        <span>
                          {isExpanded ? 'Hide' : 'View'} Member Roster ({members.length})
                        </span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {unit.status === 'PENDING_ADMIN_REVIEW' && (
                          <button
                            disabled={updatingUnitId === unit.id}
                            onClick={() => handleUpdateUnitStatus(unit.id, 'OPEN')}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer transition-colors disabled:opacity-50"
                            title="Approve unit to make it OPEN for neighbors"
                          >
                            ✓ Approve & Publish Unit (OPEN)
                          </button>
                        )}
                        {(unit.status === 'IN_TRANSIT' ||
                          unit.status === 'ORDERED' ||
                          unit.status === 'DELIVERED_TO_MANAGER' ||
                          unit.status === 'FULL') && (
                          <button
                            disabled={updatingUnitId === unit.id}
                            onClick={() =>
                              handleUpdateUnitStatus(unit.id, 'READY_FOR_COLLECTION')
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] cursor-pointer transition-colors disabled:opacity-50"
                          >
                            ✓ Confirm Goods Arrived & Open Pickup
                          </button>
                        )}
                        {unit.status === 'READY_FOR_COLLECTION' && (
                          <button
                            disabled={updatingUnitId === unit.id}
                            onClick={() => handleUpdateUnitStatus(unit.id, 'COMPLETED')}
                            className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-[11px] cursor-pointer transition-colors disabled:opacity-50"
                          >
                            Complete Unit & Settle 3% Commission
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Member Roster */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        {members.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">
                            No members have joined this unit yet.
                          </p>
                        ) : (
                          members.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                            >
                              <div>
                                <div className="font-bold text-gray-900">
                                  {m.user_name}{' '}
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white border border-gray-200 ml-1">
                                    {m.shares_count} share(s)
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  {m.user_phone} • Paid: {formatKobo(m.amount_paid_kobo)} • Code:{' '}
                                  <strong className="font-mono text-emerald-800">
                                    {m.collection_code}
                                  </strong>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {m.collection_status === 'COLLECTED' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    ✓ COLLECTED
                                  </span>
                                ) : m.collection_status === 'NO_SHOW' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                                    NO-SHOW
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => executeCodeVerification(m.collection_code)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                                    >
                                      Release Share
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleUpdateMemberStatus(unit.id, m.id, 'NO_SHOW')
                                      }
                                      className="px-2 py-1 rounded-lg bg-gray-200 hover:bg-red-100 hover:text-red-800 text-gray-600 font-semibold text-[10px] cursor-pointer"
                                      title="Mark Neighbor as No-Show"
                                    >
                                      No-Show
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* TAB 3: INCOMING TRUCKS, WAYBILLS & HUB QUALITY LOG */}
      {activeTab === 'deliveries' && (
        <div className="space-y-5">
          {/* 1. Incoming Purchase Orders / Waybills */}
          <div className="bg-white rounded-3xl border border-gray-200 p-4.5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck size={15} className="text-emerald-700" /> Incoming Bulk Deliveries &
                  Waybills ({incomingOrders.length})
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Weigh bulk bags on your calibrated scale upon arrival before opening member pickup.
                </p>
              </div>
              <button
                onClick={fetchManagerPortalData}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {incomingOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                No supplier purchase orders assigned to your hub yet.
              </div>
            ) : (
              <div className="space-y-3">
                {incomingOrders.map((po) => (
                  <div
                    key={po.id}
                    className="p-4 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              po.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : po.status === 'DISPATCHED'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {po.status}
                          </span>
                          <span className="font-mono font-bold text-xs text-gray-900">
                            {po.order_number}
                          </span>
                          {po.waybill_number && (
                            <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Waybill #{po.waybill_number}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 mt-1">
                          Supplier: {po.distributor_name} ({po.total_packs} Bulk Packs)
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Destination: {po.destination_area} • Landmarks:{' '}
                          {(po.destination_landmarks || []).join(', ')}
                        </p>
                      </div>

                      {po.driver_phone && (
                        <a
                          href={`tel:${po.driver_phone}`}
                          className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-100 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Phone size={12} className="text-emerald-700" />
                          <span>Call Driver ({po.driver_name})</span>
                        </a>
                      )}
                    </div>

                    {po.driver_name && (
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white border border-gray-100 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Driver</span>
                          <strong className="text-gray-800">{po.driver_name}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">Truck Plate</span>
                          <strong className="font-mono text-gray-800">
                            {po.vehicle_plate || 'ABJ-774-XY'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block">Total Packs</span>
                          <strong className="text-emerald-800">{po.total_packs} Bags/Packs</strong>
                        </div>
                      </div>
                    )}

                    {po.status !== 'DELIVERED' ? (
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <input
                          type="text"
                          value={verifiedWeights[po.id] ?? '50.2 kg per bag (Scale Verified)'}
                          onChange={(e) =>
                            setVerifiedWeights({ ...verifiedWeights, [po.id]: e.target.value })
                          }
                          placeholder="Enter scale weight reading (e.g. 50.2kg)"
                          className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          disabled={confirmingOrderId === po.id}
                          onClick={() => handleConfirmOrderReceipt(po.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          {confirmingOrderId === po.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          <span>Confirm Hub Receipt & Open Pickup</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                        <CheckCircle size={14} />
                        <span>
                          Goods received and verified at Hub on{' '}
                          {po.delivered_at ? formatDate(po.delivered_at) : 'today'}. Associated
                          units are open for collection!
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Hub Quality, Shortage & Incident Log */}
          <div className="bg-white rounded-3xl border border-gray-200 p-4.5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-600" /> Hub Quality, Scale &
                Incident Log
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Record bag weight inspections, transit shortages, or member no-show notes for Admin
                review.
              </p>
            </div>

            <form onSubmit={handleCreateDispute} className="space-y-2.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Select Unit
                  </label>
                  <select
                    value={disputeUnitId}
                    onChange={(e) => setDisputeUnitId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold"
                  >
                    {managedUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.product_name} ({u.collection_landmark})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Report Category
                  </label>
                  <select
                    value={disputeType}
                    onChange={(e) => setDisputeType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold"
                  >
                    <option value="QUALITY">Scale Weight / Quality Verification</option>
                    <option value="SHORTAGE">Bag Weight Shortage</option>
                    <option value="NO_SHOW">Member No-Show / Unclaimed Share</option>
                    <option value="OTHER">Other Hub Operational Note</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Describe scale weight reading, bag condition, or incident details..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <label className="px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-semibold text-xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={handleUploadEvidencePhoto}
                    className="hidden"
                  />
                  <span>
                    {uploadingPhoto
                      ? 'Uploading...'
                      : disputePhotoUrls.length > 0
                      ? `📷 ${disputePhotoUrls.length} Photo(s)`
                      : '📷 Attach Scale Photo'}
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={submittingDispute || uploadingPhoto}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                >
                  <FileText size={13} />
                  <span>{submittingDispute ? 'Logging...' : 'Log Hub Report'}</span>
                </button>
              </div>
            </form>

            {/* Logged Reports List */}
            <div className="space-y-2">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-2xl border border-gray-100 bg-gray-50/70 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                        {d.type}
                      </span>
                      <span className="font-bold text-gray-900">
                        {d.unit_product_name || d.unit_id}
                      </span>
                      {d.unit_landmark && (
                        <span className="text-gray-400 text-[11px]">• {d.unit_landmark}</span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        d.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{d.description}</p>
                  {d.photo_urls && d.photo_urls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {d.photo_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-emerald-700 underline bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                        >
                          📷 View Evidence Photo #{idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {d.resolution_notes && (
                    <p className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-lg">
                      Note: {d.resolution_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COLLECTIONS DESK */}
      {activeTab === 'collections' &&
        (() => {
          const query = searchMemberQuery.toLowerCase().trim();
          const filteredMembers = allMembers.filter(({ member, unit }) => {
            const matchesUnit =
              selectedCollectionUnitId === 'ALL' || unit.id === selectedCollectionUnitId;
            const matchesQuery =
              !query ||
              member.user_name.toLowerCase().includes(query) ||
              member.user_phone.includes(query) ||
              member.collection_code.includes(query) ||
              unit.product_name.toLowerCase().includes(query);

            const matchesStatus =
              filterCollectionStatus === 'ALL' ||
              member.collection_status === filterCollectionStatus;

            return matchesUnit && matchesQuery && matchesStatus;
          });

          const pendingCount = allMembers.filter(
            (m) => m.member.collection_status === 'PENDING'
          ).length;
          const collectedCount = allMembers.filter(
            (m) => m.member.collection_status === 'COLLECTED'
          ).length;
          const noShowCount = allMembers.filter(
            (m) => m.member.collection_status === 'NO_SHOW'
          ).length;

          return (
            <div className="bg-white rounded-3xl border border-gray-200 p-4.5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div>
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={14} className="text-emerald-700" /> Member Pickup Verification Desk
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Verify 6-digit codes, release weighed shares, or flag uncollected shares.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Camera size={13} />
                    <span>Scan QR</span>
                  </button>
                  <button
                    onClick={fetchManagerPortalData}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
                    title="Refresh collections"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Search, Unit Selector, and Status Filters */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={searchMemberQuery}
                      onChange={(e) => setSearchMemberQuery(e.target.value)}
                      placeholder="Search by neighbor name, phone or 6-digit code..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {searchMemberQuery && (
                      <button
                        onClick={() => setSearchMemberQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedCollectionUnitId}
                    onChange={(e) => setSelectedCollectionUnitId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700"
                  >
                    <option value="ALL">All Units ({managedUnits.length})</option>
                    {managedUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.product_name} ({u.collection_landmark})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                  <button
                    onClick={() => setFilterCollectionStatus('ALL')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      filterCollectionStatus === 'ALL'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All ({allMembers.length})
                  </button>
                  <button
                    onClick={() => setFilterCollectionStatus('PENDING')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      filterCollectionStatus === 'PENDING'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setFilterCollectionStatus('COLLECTED')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      filterCollectionStatus === 'COLLECTED'
                        ? 'bg-emerald-800 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Collected ({collectedCount})
                  </button>
                  <button
                    onClick={() => setFilterCollectionStatus('NO_SHOW')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      filterCollectionStatus === 'NO_SHOW'
                        ? 'bg-red-700 text-white'
                        : 'bg-red-50 text-red-800 hover:bg-red-100'
                    }`}
                  >
                    No-Show ({noShowCount})
                  </button>
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  {allMembers.length === 0
                    ? 'No members have joined your units yet.'
                    : 'No members match your filter criteria.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {filteredMembers.map(({ member, unit }) => (
                    <div
                      key={member.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 p-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate flex items-center gap-2">
                          <span>{member.user_name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
                            {member.shares_count} × {unit.share_size}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                          {unit.product_name} • {unit.collection_landmark} ({member.user_phone})
                        </div>
                        <div className="text-[11px] text-emerald-800 font-mono mt-0.5 flex items-center gap-1.5">
                          <span className="text-gray-400">Pickup Code:</span>
                          <strong className="font-black bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200">
                            {member.collection_code}
                          </strong>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {member.collection_status === 'COLLECTED' ? (
                          <div className="text-right">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                              <Check size={12} /> COLLECTED
                            </span>
                            {member.collected_at && (
                              <div className="text-[9px] text-gray-400 mt-0.5">
                                {formatDate(member.collected_at)}
                              </div>
                            )}
                          </div>
                        ) : member.collection_status === 'NO_SHOW' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                              NO-SHOW
                            </span>
                            <button
                              onClick={() => executeCodeVerification(member.collection_code)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Verify Late Pickup
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => executeCodeVerification(member.collection_code)}
                              disabled={verifyLoading}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                            >
                              <Check size={12} />
                              <span>Verify Pickup</span>
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateMemberStatus(unit.id, member.id, 'NO_SHOW')
                              }
                              className="p-1.5 rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-700 text-gray-400 cursor-pointer"
                              title="Mark as No-Show"
                            >
                              <UserX size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

      {/* TAB 5: 3% COMMISSIONS, PAYOUT WALLET & LIFECYCLE ENGINE */}
      {activeTab === 'earnings' && (
        <div className="space-y-4">
          {/* 1. Coordinator Earnings & Bank Payout Banner */}
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Award size={15} />
                  <span>Coordinator 3% Commission Wallet</span>
                </div>
                <div className="text-2xl font-black mt-1">{formatKobo(walletBalanceKobo)}</div>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  Pending from active units: <strong>{formatKobo(pendingCommissionKobo)}</strong> •
                  Settled from completed units:{' '}
                  <strong>{formatKobo(commissionSummary?.settled_commission_kobo || 0)}</strong>
                </p>
              </div>

              <button
                onClick={() => {
                  setWithdrawFeedback(null);
                  setWithdrawModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
              >
                <ArrowUpRight size={15} />
                <span>Withdraw Earnings to Bank</span>
              </button>
            </div>
          </div>

          {/* 2. Coordinator Performance Stats */}
          <div className="bg-white rounded-3xl border border-gray-200 p-4.5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-700" /> Coordinator Performance & Hub
              Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div className="text-base font-black text-emerald-900">
                  {commissionSummary?.on_time_fulfillment_rate ?? 100}%
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                  On-Time Sharing Rate
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="text-base font-black text-gray-900">
                  {commissionSummary?.total_shares_collected ?? 0} /{' '}
                  {commissionSummary?.total_shares_managed ?? allMembers.length}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  Shares Redeemed ({Math.round(commissionSummary?.pickup_completion_rate ?? 100)}%)
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="text-base font-black text-emerald-800">99.8%</div>
                <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  Scale Weight Accuracy
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
                <div className="text-base font-black text-amber-900">
                  {commissionSummary?.average_rating ?? user?.rating ?? 4.95}★
                </div>
                <div className="text-[10px] text-amber-800 font-semibold mt-0.5">
                  Neighbor Trust Rating
                </div>
              </div>
            </div>
          </div>

          {/* 3. Per-Unit 3% Commission Breakdown Table */}
          <div className="bg-white rounded-3xl border border-gray-200 p-4.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Per-Unit 3% Commission Ledger
              </h3>
              <span className="text-[11px] text-gray-500">
                Max Projected:{' '}
                <strong>{formatKobo(commissionSummary?.total_projected_kobo || 0)}</strong>
              </span>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              {(commissionSummary?.items || []).map((item) => (
                <div
                  key={item.unit_id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      <span>{item.product_name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {item.area_locality || 'Piwoyi'} • {item.collection_landmark}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      3% Rate: <strong>{formatKobo(item.commission_per_share_kobo)}/share</strong> •
                      Shares Filled: <strong>{item.current_shares_count}/{item.max_members}</strong> •
                      Full Capacity Reward:{' '}
                      <strong>{formatKobo(item.projected_commission_kobo)}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-black text-emerald-800 font-mono text-sm">
                        {formatKobo(item.earned_commission_kobo)}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          item.payout_status === 'SETTLED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.payout_status === 'SETTLED' ? '✓ SETTLED TO WALLET' : 'PENDING COMPLETION'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Automated Lifecycle & Deadline Engine */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Clock size={18} className="text-indigo-300" />
                <span>Automated Lifecycle & Deadline Engine</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-800 text-indigo-200 font-bold text-[10px]">
                Worker Active (30s ticker)
              </span>
            </div>

            <p className="text-xs text-indigo-100/90 leading-relaxed">
              SharedBuy's background engine continuously monitors all active units. When a unit reaches max capacity, it auto-locks for dispatch. If a deadline expires without filling up, it automatically refunds all members 100% of their capital into their wallets.
            </p>

            <button
              disabled={lifecycleLoading}
              onClick={handleTriggerLifecycle}
              className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-indigo-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {lifecycleLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Checking Units & Escrow...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Run Deadline & Capacity Check Now</span>
                </>
              )}
            </button>

            {lifecycleReport && (
              <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-xs text-indigo-100 space-y-1">
                <div className="font-bold text-white">{lifecycleReport.message}</div>
                <div className="text-[11px] text-indigo-200">
                  Units Locked: <strong>{lifecycleReport.units_locked}</strong> • Shares
                  Auto-Refunded: <strong>{lifecycleReport.shares_refunded}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdraw Coordinator Earnings Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-emerald-700" />
                <h3 className="font-bold text-sm text-gray-900">
                  Withdraw Coordinator Earnings
                </h3>
              </div>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-medium">Available Wallet Balance:</span>
              <strong className="text-base font-black text-emerald-950">
                {formatKobo(walletBalanceKobo)}
              </strong>
            </div>

            <form onSubmit={handleWithdrawEarnings} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Amount to Withdraw (₦)</label>
                <input
                  type="number"
                  min={500}
                  required
                  value={withdrawAmountNaira}
                  onChange={(e) => setWithdrawAmountNaira(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-bold text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={withdrawBank}
                    onChange={(e) => setWithdrawBank(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={withdrawAccountNumber}
                    onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  value={withdrawAccountName}
                  onChange={(e) => setWithdrawAccountName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200"
                />
              </div>

              {withdrawFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-950 font-semibold text-xs">
                  {withdrawFeedback}
                </div>
              )}

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                {withdrawLoading ? 'Processing Instant Payout...' : 'Confirm Bank Transfer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Camera / QR Scanner Simulation Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-5 text-white shadow-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <ScanLine size={18} className="text-emerald-400 animate-pulse" />
                <h3 className="font-bold text-sm">Pickup QR Scanner</h3>
              </div>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/50 flex flex-col items-center justify-center p-4">
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />

              <Smartphone size={40} className="text-emerald-500/40 mb-2" />
              <p className="text-xs text-gray-300 text-center font-medium">
                Point camera at member's phone receipt QR code
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Piwoyi Hub Dispatch Station</p>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                Simulate Scanning Neighbor Receipt:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(pendingPickupMembers.length > 0
                  ? pendingPickupMembers.slice(0, 4).map((m) => ({
                      name: m.member.user_name,
                      code: m.member.collection_code,
                    }))
                  : [
                      { name: 'Musa Usman', code: '192847' },
                      { name: 'Babagana Kyari', code: '384912' },
                    ]
                ).map((item) => (
                  <button
                    key={item.code}
                    onClick={() => executeCodeVerification(item.code)}
                    className="p-2.5 rounded-xl bg-gray-800 hover:bg-emerald-950 hover:border-emerald-500 border border-gray-700 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-emerald-300 truncate">{item.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">Code: {item.code}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateUnitModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onUnitCreated={fetchManagerPortalData}
      />
    </div>
  );
};
