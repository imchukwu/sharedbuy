import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo } from '../../utils/formatters';
import {
  CheckCircle,
  ShieldCheck,
  Scale,
  Box,
  MapPin,
  Send,
  QrCode,
  Check,
  Share2
} from 'lucide-react';

export const ManagerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'collections' | 'commissions'>('overview');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Starter Checklist state
  const [checklist, setChecklist] = useState({
    scale: true,
    containers: true,
    storage: true,
  });

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.trim() === '840192' || verifyCode.trim() === '384912') {
      setVerifySuccess(`✓ Code Verified! 5kg Parboiled Rice released to Babagana Kyari.`);
      setVerifyCode('');
    } else {
      setVerifySuccess(`✕ Invalid collection code. Please check member phone receipt.`);
    }
  };

  return (
    <div className="pb-20 max-w-3xl mx-auto px-3.5 pt-4">
      {/* Header Profile & Badge */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-2xs mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-900 text-lg">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-base text-gray-900">{user?.full_name || 'Aisha Bello'}</h1>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <ShieldCheck size={11} /> Trusted Coordinator
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {user?.area_name || 'Customs & Post Office Hub, Maiduguri'} • Rating: <strong>{user?.rating || 4.95}★</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pending Commission</div>
            <div className="text-lg font-black text-emerald-800">{formatKobo(4500000)}</div>
          </div>
        </div>

        {/* Manager KPI Stats */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-gray-100 text-center">
          <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-extrabold text-gray-900">2</div>
            <div className="text-[11px] text-gray-500 font-medium">Active Units</div>
          </div>
          <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-extrabold text-emerald-700">16</div>
            <div className="text-[11px] text-gray-500 font-medium">Joined Today</div>
          </div>
          <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-lg font-extrabold text-amber-600">100%</div>
            <div className="text-[11px] text-gray-500 font-medium">Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3 transition-colors ${
            activeTab === 'overview' ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Overview & Hub
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`pb-2.5 px-3 transition-colors ${
            activeTab === 'units' ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          My Managed Units (2)
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`pb-2.5 px-3 transition-colors ${
            activeTab === 'collections' ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Collection Desk
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`pb-2.5 px-3 transition-colors ${
            activeTab === 'commissions' ? 'text-emerald-800 border-b-2 border-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Commissions (3%)
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick Collection Code Verifier */}
          <div className="bg-emerald-900 text-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <QrCode size={18} className="text-emerald-300" />
              <h2 className="font-bold text-sm">Collection Day Code Verifier</h2>
            </div>
            <p className="text-xs text-emerald-100/90 mb-3">
              When members arrive at your hub, input their 6-digit code to confirm collection and release shares.
            </p>

            <form onSubmit={handleVerifyCode} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="e.g. 840192"
                className="flex-1 px-3 py-2 rounded-xl bg-white text-gray-900 font-mono font-bold text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs transition-colors shrink-0"
              >
                Verify & Release
              </button>
            </form>

            {verifySuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-white/10 text-xs font-medium text-emerald-100 border border-white/20">
                {verifySuccess}
              </div>
            )}
          </div>

          {/* Starter Checklist Card (Requirement 8.9) */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" /> Hub Equipment Readiness Checklist
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                All Verified
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
                <span className="text-gray-800 font-medium">Secure, dry, rain-protected estate storage space</span>
              </label>
            </div>
          </div>

          {/* Quick Broadcast Widget */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Send size={14} className="text-emerald-600" /> 1-Tap Member Broadcast (SMS / WhatsApp)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setBroadcastSent(true)}
                className="p-3 text-left rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-colors"
              >
                <div className="font-bold">📢 "Goods arrived safely!"</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Notify members that bulk truck has delivered.</div>
              </button>

              <button
                onClick={() => setBroadcastSent(true)}
                className="p-3 text-left rounded-xl bg-amber-50/70 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
              >
                <div className="font-bold">⏰ "Collection starts at 10 AM"</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Reminder with hub address & landmark.</div>
              </button>
            </div>

            {broadcastSent && (
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center gap-1.5">
                <Check size={14} /> Broadcast queued: Sent to 16 members via Termii SMS & WhatsApp API.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Units */}
      {activeTab === 'units' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  OPEN (ALMOST FULL)
                </span>
                <h3 className="font-bold text-sm text-gray-900 mt-1">Premium Parboiled Rice (50kg bag)</h3>
                <div className="text-xs text-gray-500">16 / 20 shares joined • 2 packs (100kg total)</div>
              </div>
              <button
                onClick={() => {
                  window.open(
                    `https://api.whatsapp.com/send?text=${encodeURIComponent(
                      'Neighbors, only 4 shares left for our 50kg rice group purchase in Maiduguri! Join here: ' + window.location.origin
                    )}`,
                    '_blank'
                  );
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1"
              >
                <Share2 size={13} /> Invite
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Your Coordinator Commission:</span>
                <span className="font-bold text-emerald-800">₦4,500 (3% of goods)</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Target Sharing Date:</span>
                <span className="font-semibold text-gray-800">30 Oct 2026</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Collections */}
      {activeTab === 'collections' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Member Pickup Checklist</h3>
          <div className="divide-y divide-gray-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">Babagana Kyari (5kg)</div>
                <div className="text-[11px] text-gray-400">+2348100000001 • Code: 840192</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                PENDING PICKUP
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">Zainab Bukar (5kg)</div>
                <div className="text-[11px] text-gray-400">+2348100000002 • Code: 492019</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                COLLECTED ✓
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Commissions */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs space-y-3 text-xs">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Manager Commission History</h3>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
            <div>
              <div className="font-bold text-emerald-900">Rice Unit #01 (Maiduguri)</div>
              <div className="text-[11px] text-emerald-700">3% Coordinator Fee</div>
            </div>
            <div className="text-right">
              <div className="font-black text-emerald-900 text-sm">₦4,500</div>
              <span className="text-[10px] font-bold text-amber-700">PENDING DELIVERY</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
