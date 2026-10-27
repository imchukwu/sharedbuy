import React, { useState, useEffect } from 'react';
import type { Unit, Area } from '../../types';
import { formatKobo, formatTimeLeft, formatDate } from '../../utils/formatters';
import {
  Users,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Share2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../../components/auth/AuthModal';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('almost_full');
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState(false);

  useEffect(() => {
    // Fetch areas
    fetch('/api/areas')
      .then((res) => res.json())
      .then((data) => setAreas(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedArea) params.append('area_id', selectedArea);
    if (selectedSort) params.append('sort', selectedSort);

    fetch(`/api/units?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setUnits(data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedArea, selectedSort]);

  const handleJoinClick = (unit: Unit) => {
    setSelectedUnit(unit);
  };

  const handleShareWhatsApp = (unit: Unit) => {
    const text = encodeURIComponent(
      `Join our group purchase for ${unit.product_name} (${unit.share_size}) in ${unit.area_city}! Price is ${formatKobo(
        unit.price_per_share_quoted_kobo
      )} instead of market price ${formatKobo(unit.estimated_market_price_kobo)}. Check it out on SharedBuy: ${window.location.origin}/`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="pb-20 max-w-xl mx-auto px-3.5 pt-3">
      {/* 1. Value Proposition Banner */}
      <section className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden mb-4">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-700/60 text-emerald-200 text-[11px] font-semibold mb-2.5 backdrop-blur-xs">
            <Sparkles size={12} /> Save 25% – 35% on food staples
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug">
            Buy bulk rice, beans & oil together with neighbors.
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1.5 leading-relaxed">
            Direct from millers to your local estate coordinator. Split upfront, collect together.
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            <a
              href="#browse-units"
              className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-bold text-xs shadow-md hover:bg-emerald-50 transition-colors inline-flex items-center gap-1.5"
            >
              Browse Open Units <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* 2. How It Works in 4 Steps */}
      <section className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs mb-5">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">How SharedBuy Works</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100/80">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs mb-1.5">
              1
            </div>
            <div className="font-bold text-xs text-gray-900">Join a Unit</div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Pick your share size (e.g. 5kg rice).</p>
          </div>

          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100/80">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs mb-1.5">
              2
            </div>
            <div className="font-bold text-xs text-gray-900">Pay Upfront</div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Held safely until unit fills up.</p>
          </div>

          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100/80">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs mb-1.5">
              3
            </div>
            <div className="font-bold text-xs text-gray-900">Bulk Delivery</div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Delivered to local estate manager.</p>
          </div>

          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100/80">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs mb-1.5">
              4
            </div>
            <div className="font-bold text-xs text-gray-900">Collect Share</div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Show 6-digit pickup code on sharing day.</p>
          </div>
        </div>
      </section>

      {/* 3. Filter Bar (Area & Sort) */}
      <section id="browse-units" className="mb-3 scroll-mt-16">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            Active Buying Units
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {units.length}
            </span>
          </h2>

          {/* Sort Selector */}
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="almost_full">Almost Full First</option>
            <option value="ending_soon">Ending Soon</option>
            <option value="newest">Newest Units</option>
          </select>
        </div>

        {/* Area Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedArea('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedArea === ''
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Locations
          </button>
          {areas.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedArea(a.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedArea === a.id
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {a.city} ({a.name.split('&')[0].trim()})
            </button>
          ))}
        </div>
      </section>

      {/* 4. Units List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl animate-pulse border border-gray-200/60" />
          ))}
        </div>
      ) : units.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
          <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
          <h3 className="font-bold text-gray-800 text-sm">No units found in this area</h3>
          <p className="text-xs text-gray-500 mt-1">Try selecting another location or check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {units.map((unit) => {
            const progressPercent = Math.min(
              100,
              Math.round((unit.current_members_count / unit.max_members) * 100)
            );

            return (
              <div
                key={unit.id}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden transition-all hover:shadow-md hover:border-emerald-300"
              >
                <div className="p-4">
                  {/* Top Row: Category + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {unit.product_category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                        <Clock size={12} /> {formatTimeLeft(unit.payment_deadline)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          unit.status === 'OPEN'
                            ? progressPercent >= 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {unit.status === 'OPEN'
                          ? progressPercent >= 80
                            ? 'Almost Full'
                            : 'Open'
                          : unit.status}
                      </span>
                    </div>
                  </div>

                  {/* Main Product Details */}
                  <div className="flex gap-3 items-start">
                    <img
                      src={unit.product_image_url}
                      alt={unit.product_name}
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-100"
                      loading="lazy"
                    />

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">
                        {unit.product_name}
                      </h3>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Bulk size: <span className="font-medium text-gray-700">{unit.product_pack_size}</span>
                      </div>

                      {/* Pricing */}
                      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-emerald-800">
                          {formatKobo(unit.price_per_share_quoted_kobo)}
                        </span>
                        <span className="text-xs font-semibold text-gray-600">
                          / {unit.share_size} share
                        </span>
                      </div>

                      {/* Savings Pill */}
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-100">
                        <Sparkles size={11} /> You save about {formatKobo(unit.estimated_savings_kobo)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar (Members joined) */}
                  <div className="mt-3.5 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-gray-700 flex items-center gap-1">
                        <Users size={13} className="text-gray-400" />
                        {unit.current_members_count} of {unit.max_members} members joined
                      </span>
                      <span className="font-bold text-emerald-700">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          progressPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Manager and Landmark Info */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1 truncate max-w-[200px]">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">{unit.collection_landmark}, {unit.area_city}</span>
                    </div>
                    <div className="font-medium text-gray-600 shrink-0">
                      Mgr: <strong className="text-gray-800">{unit.manager_name.split(' ')[0]}</strong> ({unit.manager_rating}★)
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3.5 grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleShareWhatsApp(unit)}
                      className="col-span-1 py-2 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Share to WhatsApp group"
                    >
                      <Share2 size={14} />
                      <span className="hidden sm:inline">Invite</span>
                    </button>

                    <button
                      onClick={() => handleJoinClick(unit)}
                      className={`col-span-3 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-white shadow-xs transition-colors cursor-pointer ${
                        unit.status === 'OPEN'
                          ? 'bg-emerald-700 hover:bg-emerald-800'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span>{unit.status === 'OPEN' ? 'View Details & Join Unit' : 'Unit Closed'}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Unit Details & Cost Breakdown Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {selectedUnit.product_category}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">
                  {selectedUnit.product_name} ({selectedUnit.share_size})
                </h3>
                <p className="text-xs text-gray-500">
                  Collection Hub: {selectedUnit.collection_address}
                </p>
              </div>
              <button
                onClick={() => { setSelectedUnit(null); setJoinedSuccess(false); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {joinedSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle size={36} />
                </div>
                <h4 className="text-lg font-bold text-gray-900">You're in this unit!</h4>
                <p className="text-xs text-gray-600 max-w-xs mx-auto">
                  Your payment is secured in escrow. Once the unit fills up, distributor order is dispatched.
                </p>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs font-medium text-emerald-900">
                  Sharing Day: <strong>{formatDate(selectedUnit.sharing_date)}</strong>
                </div>
                <button
                  onClick={() => { setSelectedUnit(null); setJoinedSuccess(false); }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="py-3 space-y-4">
                {/* Cost Breakdown Card (Rule 6 Exact Implementation) */}
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 space-y-2 text-xs">
                  <div className="font-bold text-gray-900 mb-2 flex items-center justify-between">
                    <span>Transparent Cost Breakdown</span>
                    <span className="text-[10px] text-gray-400 font-normal">Per {selectedUnit.share_size} share</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Goods cost (supplier wholesale)</span>
                    <span className="font-semibold text-gray-800">{formatKobo(selectedUnit.goods_cost_share_kobo)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Share of distributor delivery</span>
                    <span className="font-semibold text-gray-800">{formatKobo(selectedUnit.delivery_cost_share_kobo)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Platform fee (4%)</span>
                    <span className="font-semibold text-gray-800">{formatKobo(selectedUnit.platform_fee_share_kobo)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Manager commission (3%)</span>
                    <span className="font-semibold text-gray-800">{formatKobo(selectedUnit.manager_commission_share_kobo)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-700 bg-emerald-100/60 p-1.5 rounded-lg border border-emerald-200">
                    <div>
                      <span className="font-semibold">Safety buffer ({selectedUnit.buffer_percent}%)</span>
                      <div className="text-[10px] text-emerald-600">Refundable surplus credited back to wallet</div>
                    </div>
                    <span className="font-bold">{formatKobo(selectedUnit.buffer_share_kobo)}</span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline text-sm font-bold text-gray-900">
                    <span>Total you pay</span>
                    <span className="text-base text-emerald-800">{formatKobo(selectedUnit.price_per_share_quoted_kobo)}</span>
                  </div>
                </div>

                {/* Manager & Timeline */}
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Unit Coordinator</span>
                    <span className="font-bold text-gray-800">{selectedUnit.manager_name} ({selectedUnit.manager_rating}★)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Sharing / Collection Date</span>
                    <span className="font-bold text-emerald-800">{formatDate(selectedUnit.sharing_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Payment Deadline</span>
                    <span className="font-medium text-gray-800">{formatDate(selectedUnit.payment_deadline)}</span>
                  </div>
                </div>

                {/* Join and Pay Button */}
                <div>
                  <button
                    onClick={() => {
                      if (!user) {
                        setAuthModalOpen(true);
                      } else {
                        setJoinedSuccess(true);
                      }
                    }}
                    className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{user ? `Join & Pay ${formatKobo(selectedUnit.price_per_share_quoted_kobo)}` : 'Sign In to Join Unit'}</span>
                    <ArrowRight size={16} />
                  </button>
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    Paystack test payment • Auto-refund if unit does not fill by deadline
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};
