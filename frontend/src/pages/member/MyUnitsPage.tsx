import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatKobo, formatDate } from '../../utils/formatters';
import type { MemberUnitBooking } from '../../types';
import {
  MapPin,
  Clock,
  Phone,
  Navigation,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { AuthModal } from '../../components/auth/AuthModal';

export const MyUnitsPage: React.FC = () => {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [bookings, setBookings] = useState<MemberUnitBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchMyUnits = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/member/units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: MemberUnitBooking[] = await res.json();
        const safeData = data || [];
        setBookings(safeData);
        try {
          localStorage.setItem('sb_cached_bookings', JSON.stringify(safeData));
        } catch {}
      }
    } catch (err) {
      try {
        const cached = localStorage.getItem('sb_cached_bookings');
        if (cached) {
          setBookings(JSON.parse(cached));
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyUnits();
  }, [token]);

  const activeBookings = bookings.filter(
    (b) =>
      b.payment_status === 'PAID' &&
      b.collection_status !== 'COLLECTED' &&
      !['COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDING'].includes(b.unit.status)
  );

  const completedBookings = bookings.filter(
    (b) => b.collection_status === 'COLLECTED' || b.unit.status === 'COMPLETED'
  );

  const cancelledBookings = bookings.filter(
    (b) =>
      b.payment_status === 'REFUNDED' ||
      ['CANCELLED', 'EXPIRED', 'REFUNDING'].includes(b.unit.status)
  );

  const steps = [
    { key: 'JOINED', label: 'Joined' },
    { key: 'FULL', label: 'Unit Full' },
    { key: 'ORDERED', label: 'Ordered' },
    { key: 'DELIVERED', label: 'In Transit' },
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_COLLECTION':
        return { label: 'READY FOR PICKUP', className: 'bg-emerald-100 text-emerald-800 animate-pulse' };
      case 'IN_TRANSIT':
        return { label: 'TRUCK IN TRANSIT', className: 'bg-blue-100 text-blue-800' };
      case 'ORDERED':
        return { label: 'ORDERED FROM MILLER', className: 'bg-purple-100 text-purple-800' };
      case 'FULL':
        return { label: 'UNIT FULL • LOCKED', className: 'bg-amber-100 text-amber-800' };
      default:
        return { label: 'FILLING UP', className: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="pb-24 max-w-xl mx-auto px-3.5 pt-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Buying Units</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track your group orders and 6-digit pickup verification codes.</p>
        </div>
        {user && (
          <button
            onClick={fetchMyUnits}
            className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
            title="Refresh units"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {!user ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <ShieldCheck size={26} />
          </div>
          <h3 className="font-bold text-base text-gray-900">Sign in to view your buying units</h3>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            Access your 6-digit pickup verification codes, track bulk truck dispatches, and check your sharing dates.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-md hover:bg-emerald-800 cursor-pointer"
          >
            Sign In with Phone
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4 text-xs font-semibold">
            <button
              onClick={() => setTab('active')}
              className={`pb-2.5 px-3 transition-colors relative cursor-pointer ${
                tab === 'active'
                  ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Active Units ({activeBookings.length})
            </button>
            <button
              onClick={() => setTab('completed')}
              className={`pb-2.5 px-3 transition-colors cursor-pointer ${
                tab === 'completed'
                  ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Completed ({completedBookings.length})
            </button>
            <button
              onClick={() => setTab('cancelled')}
              className={`pb-2.5 px-3 transition-colors cursor-pointer ${
                tab === 'cancelled'
                  ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Refunded / Expired ({cancelledBookings.length})
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading your units...
            </div>
          ) : (
            <>
              {/* Tab: Active */}
              {tab === 'active' && (
                <div className="space-y-4">
                  {activeBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
                      <p className="text-xs text-gray-500">You don't have any active group orders right now.</p>
                      <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-xs hover:bg-emerald-800"
                      >
                        <span>Browse Open Units</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  ) : (
                    activeBookings.map((booking) => {
                      const item = booking.unit;
                      const stepIdx = getActiveStepIndex(item.status);
                      const isReady = item.status === 'READY_FOR_COLLECTION';
                      const badge = getStatusBadge(item.status);

                      return (
                        <div
                          key={booking.member_id}
                          className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 ${
                            isReady ? 'border-emerald-300 ring-2 ring-emerald-600/10' : 'border-gray-200'
                          }`}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-gray-500 uppercase">
                                {item.area_locality || 'Piwoyi'}, {item.area_state || 'FCT'}
                              </span>
                              <h3 className="font-bold text-sm text-gray-900">{item.product_name}</h3>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {booking.shares_count} × {item.share_size} share • Paid{' '}
                                <strong>{formatKobo(booking.amount_paid_kobo)}</strong>
                              </div>
                            </div>

                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.className}`}>
                              {badge.label}
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

                          {/* 6-Digit Pickup Verification Code Box (Always accessible for joined members) */}
                          <div
                            className={`rounded-2xl p-3.5 border text-center space-y-1.5 ${
                              isReady
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-gray-50/90 border-gray-200'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                              Your 6-Digit Pickup Verification Code
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-2xl font-black font-mono tracking-widest text-emerald-950">
                                {booking.collection_code}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(booking.collection_code);
                                  setCopiedCodeId(booking.member_id);
                                  setTimeout(() => setCopiedCodeId(null), 2000);
                                }}
                                className="p-1.5 rounded-lg bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 transition-colors cursor-pointer"
                                title="Copy Code"
                              >
                                {copiedCodeId === booking.member_id ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                            <p className="text-[11px] text-gray-600">
                              Present this code to Coordinator <strong>{item.manager_name}</strong> on collection day.
                            </p>
                          </div>

                          {/* Pickup Location Details */}
                          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1.5 border border-gray-100">
                            <div className="flex items-start gap-1.5">
                              <MapPin size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                              <span>{item.collection_address}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/60">
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock size={12} /> Sharing Day: <strong>{formatDate(item.sharing_date)}</strong>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <a
                                  href={
                                    item.collection_map_url ||
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                      item.collection_address
                                    )}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-emerald-800 flex items-center gap-1 hover:underline"
                                >
                                  <Navigation size={11} /> Map
                                </a>
                                <a
                                  href={`tel:${item.manager_phone}`}
                                  className="font-medium text-emerald-800 flex items-center gap-1 hover:underline"
                                >
                                  <Phone size={11} /> Call Manager
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Tab: Completed */}
              {tab === 'completed' && (
                <div className="space-y-3">
                  {completedBookings.map((booking) => (
                    <div
                      key={booking.member_id}
                      className="bg-white rounded-2xl border border-emerald-200 p-4 text-xs space-y-2 shadow-2xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">
                          {booking.unit.product_name} • {booking.shares_count} × {booking.unit.share_size}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                          <CheckCircle size={11} /> Collected
                        </span>
                      </div>
                      <p className="text-gray-500">
                        Verified with Pickup Code <strong className="font-mono">{booking.collection_code}</strong> at{' '}
                        {booking.unit.collection_landmark}
                        {booking.collected_at ? ` on ${formatDate(booking.collected_at)}` : ''}
                      </p>
                      <div className="text-emerald-800 bg-emerald-50 p-2.5 rounded-xl text-[11px] font-medium border border-emerald-100">
                        ✓ Unused 4% safety buffer ({formatKobo(booking.unit.buffer_share_kobo * booking.shares_count)}) credited back to your wallet!
                      </div>
                    </div>
                  ))}

                  {/* Historical seed completed card if no dynamic ones yet */}
                  {completedBookings.length === 0 && (
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
                </div>
              )}

              {/* Tab: Cancelled / Refunded */}
              {tab === 'cancelled' && (
                <div className="space-y-3">
                  {cancelledBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-xs text-gray-500">
                      No expired or refunded units. All your active shares are progressing normally.
                    </div>
                  ) : (
                    cancelledBookings.map((booking) => (
                      <div
                        key={booking.member_id}
                        className="bg-white rounded-2xl border border-amber-200 p-4 text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900">
                            {booking.unit.product_name} ({booking.shares_count} × {booking.unit.share_size})
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                            100% REFUNDED TO WALLET
                          </span>
                        </div>
                        <p className="text-gray-600">
                          Deadline expired before reaching max capacity. Your full capital of{' '}
                          <strong>{formatKobo(booking.amount_paid_kobo)}</strong> was automatically returned to your wallet.
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};
