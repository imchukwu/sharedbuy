import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo, formatDate } from '../../utils/formatters';
import type { Unit, UnitMember } from '../../types';
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
  Smartphone
} from 'lucide-react';
import { CreateUnitModal } from '../../components/unit/CreateUnitModal';

export const ManagerDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'collections' | 'lifecycle'>('overview');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [filterCollectionStatus, setFilterCollectionStatus] = useState<'ALL' | 'PENDING' | 'COLLECTED'>('ALL');
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    message: string;
    member?: UnitMember;
    unit?: Unit;
  } | null>(null);

  const [managedUnits, setManagedUnits] = useState<Unit[]>([]);
  const [unitMembers, setUnitMembers] = useState<{ [unitId: string]: UnitMember[] }>({});
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

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
  });

  const fetchManagedUnits = async () => {
    if (!token) return;
    setLoadingUnits(true);
    try {
      const res = await fetch('/api/manager/units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const units: Unit[] = await res.json();
        setManagedUnits(units || []);

        // Fetch members for each unit
        for (const u of units) {
          fetch(`/api/units/${u.id}/members`)
            .then((r) => r.json())
            .then((members) => {
              setUnitMembers((prev) => ({ ...prev, [u.id]: members || [] }));
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to load managed units', err);
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    fetchManagedUnits();
  }, [token]);

  // Execute verification for a specific code
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
        fetchManagedUnits();
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

  // Handle Verify 6-digit collection code from form
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCodeVerification(verifyCode);
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
        fetchManagedUnits();
      }
    } catch (err) {
      alert('Lifecycle check failed');
    } finally {
      setLifecycleLoading(false);
    }
  };

  // Flatten all members for collections desk
  const allMembers: { member: UnitMember; unitName: string }[] = [];
  managedUnits.forEach((u) => {
    const mems = unitMembers[u.id] || [];
    mems.forEach((m) => {
      allMembers.push({ member: m, unitName: u.product_name });
    });
  });

  return (
    <div className="pb-24 max-w-3xl mx-auto px-3.5 pt-4">
      {/* Header Profile & Badge */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-2xs mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-emerald-900 text-lg">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-base text-gray-900">{user?.full_name || 'Aisha Bello'}</h1>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <ShieldCheck size={11} /> Verified Hub Coordinator
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {user?.area_name || 'Piwoyi District Hub, Abuja'} • Rating: <strong>{user?.rating || 4.95}★</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Launch Unit</span>
            </button>
          </div>
        </div>

        {/* Manager KPI Stats */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-gray-100 text-center">
          <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-black text-gray-900">{managedUnits.length}</div>
            <div className="text-[11px] text-gray-500 font-medium">Active Units</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-black text-emerald-700">{allMembers.length}</div>
            <div className="text-[11px] text-gray-500 font-medium">Members Joined</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-black text-amber-700">3%</div>
            <div className="text-[11px] text-gray-500 font-medium">Earned Margin</div>
          </div>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Pickup Verifier & Hub
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'units'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          My Managed Units ({managedUnits.length})
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'collections'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Collection Desk ({allMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`pb-2.5 px-3 transition-colors cursor-pointer ${
            activeTab === 'lifecycle'
              ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Lifecycle & Refunds
        </button>
      </div>

      {/* Tab: Overview (Pickup Verification Desk) */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* 1. Quick Collection Code Verifier */}
          <div className="bg-emerald-900 text-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-emerald-300" />
                <h2 className="font-bold text-sm">Collection Day Code Verifier</h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200">
                Piwoyi Hub
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 mb-3.5 leading-relaxed">
              When members arrive at your estate pickup point, enter their 6-digit code or scan the QR code from their phone receipt to verify payment and release goods.
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
                    <span className="w-5 h-5 rounded-full bg-red-800 text-white flex items-center justify-center font-bold text-xs shrink-0">✕</span>
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
                      Share Size: <strong className="text-white">{verifyResult.unit?.share_size}</strong>
                    </div>
                    <div className="col-span-2 text-emerald-200 text-[10px]">
                      Collection Status: <span className="font-bold uppercase tracking-wider text-white">COLLECTED</span> (Recorded in Ledger)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Starter Equipment Readiness Checklist */}
          <div className="bg-white rounded-3xl p-4.5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" /> Hub Equipment Readiness Checklist
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Verified Piwoyi Hub
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-gray-100">
                <input
                  type="checkbox"
                  checked={checklist.scale}
                  onChange={(e) => setChecklist({ ...checklist, scale: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-600"
                />
                <Scale size={16} className="text-gray-500" />
                <span className="text-gray-800 font-medium">Calibrated Weighing Scale ready (50kg+ capacity)</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-gray-100">
                <input
                  type="checkbox"
                  checked={checklist.containers}
                  onChange={(e) => setChecklist({ ...checklist, containers: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-600"
                />
                <Box size={16} className="text-gray-500" />
                <span className="text-gray-800 font-medium">Clean containers & 5kg/10kg bags for splitting bulk</span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-gray-100">
                <input
                  type="checkbox"
                  checked={checklist.storage}
                  onChange={(e) => setChecklist({ ...checklist, storage: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-600"
                />
                <MapPin size={16} className="text-gray-500" />
                <span className="text-gray-800 font-medium">Secure, dry, rain-protected estate storage in Piwoyi</span>
              </label>
            </div>
          </div>

          {/* 3. Quick Broadcast Widget */}
          <div className="bg-white rounded-3xl p-4.5 border border-gray-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Send size={14} className="text-emerald-600" /> 1-Tap Member WhatsApp Broadcast
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setBroadcastSent(true)}
                className="p-3 text-left rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-colors cursor-pointer"
              >
                <div className="font-bold">📢 "Goods arrived safely!"</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Notify members that bulk truck has delivered to Piwoyi.</div>
              </button>

              <button
                onClick={() => setBroadcastSent(true)}
                className="p-3 text-left rounded-xl bg-amber-50/70 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
              >
                <div className="font-bold">⏰ "Collection starts at 10 AM"</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Reminder with hub address & landmark.</div>
              </button>
            </div>

            {broadcastSent && (
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
                <Check size={14} /> Broadcast queued: Sent to members via WhatsApp API.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Units */}
      {activeTab === 'units' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Units Assigned to You ({managedUnits.length})
            </h2>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs hover:bg-emerald-800 cursor-pointer"
            >
              <PlusCircle size={14} /> Launch New Unit
            </button>
          </div>

          {loadingUnits ? (
            <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading units...
            </div>
          ) : managedUnits.length === 0 ? (
            <div className="py-8 bg-white rounded-3xl border border-gray-200 text-center text-xs text-gray-500">
              No units managed yet. Click "Launch New Unit" above to start one!
            </div>
          ) : (
            managedUnits.map((unit) => {
              const members = unitMembers[unit.id] || [];
              const percentFilled = Math.min(100, Math.round((unit.current_members_count / unit.max_members) * 100));

              return (
                <div key={unit.id} className="bg-white rounded-3xl border border-gray-200 p-4 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          {unit.status}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{unit.id}</span>
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 mt-1">
                        {unit.product_name} ({unit.share_size})
                      </h3>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={12} className="text-emerald-700" />
                        <span>{unit.collection_landmark}</span>
                        <a
                          href={unit.collection_map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-800 underline ml-1 inline-flex items-center gap-0.5"
                        >
                          Map <ExternalLink size={9} />
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        window.open(
                          `https://api.whatsapp.com/send?text=${encodeURIComponent(
                            `Neighbors in Piwoyi, our group purchase for ${unit.product_name} has only ${
                              unit.max_members - unit.current_members_count
                            } shares left! Join here: ${window.location.origin}/?unit=${unit.id}`
                          )}`,
                          '_blank'
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                    >
                      <Share2 size={13} /> Invite
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-gray-600 mb-1">
                      <span>Capacity: {unit.current_members_count} / {unit.max_members} shares</span>
                      <span>{percentFilled}% Filled</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Pricing and Coordinator Commission */}
                  <div className="bg-gray-50 rounded-2xl p-3 text-xs space-y-1.5 border border-gray-100">
                    <div className="flex justify-between text-gray-600">
                      <span>Price Per Member Share:</span>
                      <span className="font-bold text-gray-900">{formatKobo(unit.price_per_share_quoted_kobo)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Your Coordinator Commission (3%):</span>
                      <span className="font-bold text-emerald-800 font-mono">
                        {formatKobo(unit.manager_commission_share_kobo * unit.current_members_count)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Sharing Date:</span>
                      <span className="font-semibold text-gray-800">{formatDate(unit.sharing_date)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Joined Members Count:</span>
                      <span className="font-bold text-emerald-700">{members.length} members</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Collections Desk */}
      {activeTab === 'collections' && (() => {
        const query = searchMemberQuery.toLowerCase().trim();
        const filteredMembers = allMembers.filter(({ member, unitName }) => {
          const matchesQuery =
            !query ||
            member.user_name.toLowerCase().includes(query) ||
            member.user_phone.includes(query) ||
            member.collection_code.includes(query) ||
            unitName.toLowerCase().includes(query);

          const matchesStatus =
            filterCollectionStatus === 'ALL' ||
            (filterCollectionStatus === 'PENDING' && member.collection_status !== 'COLLECTED') ||
            (filterCollectionStatus === 'COLLECTED' && member.collection_status === 'COLLECTED');

          return matchesQuery && matchesStatus;
        });

        const pendingCount = allMembers.filter((m) => m.member.collection_status !== 'COLLECTED').length;
        const collectedCount = allMembers.filter((m) => m.member.collection_status === 'COLLECTED').length;

        return (
          <div className="bg-white rounded-3xl border border-gray-200 p-4.5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-700" /> Member Pickup Verification Desk
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Confirm physical pickup and release shares to estate neighbors.
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
                  onClick={fetchManagedUnits}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
                  title="Refresh collections"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
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

              <div className="flex items-center gap-1.5 text-[11px]">
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
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                {allMembers.length === 0
                  ? 'No members have joined your units yet.'
                  : 'No members match your search criteria.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 text-xs">
                {filteredMembers.map(({ member, unitName }) => (
                  <div key={member.id} className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 p-2 rounded-xl transition-colors">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate flex items-center gap-2">
                        <span>{member.user_name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {member.shares_count} share
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">
                        {unitName} • {member.user_phone}
                      </div>
                      <div className="text-[11px] text-emerald-800 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="text-gray-400">Pickup Code:</span>
                        <strong className="font-black bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200">
                          {member.collection_code}
                        </strong>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
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
                      ) : (
                        <button
                          onClick={() => executeCodeVerification(member.collection_code)}
                          disabled={verifyLoading}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs disabled:opacity-50"
                        >
                          <Check size={12} />
                          <span>Verify Pickup</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tab: Lifecycle & Refunds Engine */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-4">
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
                  Units Locked: <strong>{lifecycleReport.units_locked}</strong> • Shares Auto-Refunded: <strong>{lifecycleReport.shares_refunded}</strong>
                </div>
              </div>
            )}
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

            {/* Viewfinder simulation */}
            <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/50 flex flex-col items-center justify-center p-4">
              {/* Corner framing brackets */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />

              {/* Laser scanning bar */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />

              <Smartphone size={40} className="text-emerald-500/40 mb-2" />
              <p className="text-xs text-gray-300 text-center font-medium">
                Point camera at member's phone receipt QR code
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Piwoyi Hub Dispatch Station</p>
            </div>

            {/* Quick simulated scan buttons */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">
                Simulate Detecting Neighbor Receipt:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => executeCodeVerification('192847')}
                  className="p-2.5 rounded-xl bg-gray-800 hover:bg-emerald-950 hover:border-emerald-500 border border-gray-700 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-emerald-300">Musa Usman</div>
                  <div className="text-[10px] text-gray-400 font-mono">Code: 192847</div>
                </button>
                <button
                  onClick={() => executeCodeVerification('384912')}
                  className="p-2.5 rounded-xl bg-gray-800 hover:bg-emerald-950 hover:border-emerald-500 border border-gray-700 text-left transition-colors cursor-pointer"
                >
                  <div className="font-bold text-amber-300">Babagana Kyari</div>
                  <div className="text-[10px] text-gray-400 font-mono">Code: 384912</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateUnitModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onUnitCreated={fetchManagedUnits}
      />
    </div>
  );
};
