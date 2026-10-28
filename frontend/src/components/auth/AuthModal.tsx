import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Phone, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'member' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'member' }) => {
  const { requestOTP, loginWithOTP, loginAdmin } = useAuth();
  const [tab, setTab] = useState<'member' | 'admin'>(defaultTab);

  // Member state
  const [phone, setPhone] = useState('+2348100000001');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [areaId] = useState('area-piwoyi-abuja');
  const [referralCode, setReferralCode] = useState(() => localStorage.getItem('sb_referral_code') || '');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpHint, setOtpHint] = useState<string | null>(null);

  // Admin state
  const [email, setEmail] = useState('admin@sharedbuy.ng');
  const [password, setPassword] = useState('Admin@123456');

  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestOTP(phone);
      setStep('otp');
      setOtpHint(res.code || '123456');
      setCode(res.code || '123456');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithOTP(phone, code, fullName, areaId, referralCode);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginAdmin(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {tab === 'member' ? 'Sign In to SharedBuy' : 'Operations Admin Access'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {tab === 'member' ? 'No passwords needed. Simple phone verification.' : 'Staff credentials with 2FA protection.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl my-4 text-xs font-semibold">
          <button
            onClick={() => { setTab('member'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${tab === 'member' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Member / Manager
          </button>
          <button
            onClick={() => { setTab('admin'); setError(null); }}
            className={`py-2 rounded-lg transition-all ${tab === 'admin' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Admin Portal
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
            {error}
          </div>
        )}

        {tab === 'member' ? (
          step === 'phone' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nigerian Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2348012345678"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 font-mono"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">We will send a 6-digit code via SMS / WhatsApp.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-gray-400 font-normal">(Optional for first-time sign-up)</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Babagana Kyari"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Referral Code <span className="text-gray-400 font-normal">(Optional - get ₦200 neighbor bonus)</span>
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. REF-BABAGANA"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 uppercase"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <Sparkles size={14} /> Quick Demo Profiles:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPhone('+2348100000001')}
                    className="px-2 py-1 rounded-md bg-white border border-emerald-200 text-emerald-900 text-[11px] hover:bg-emerald-100"
                  >
                    Babagana (Member)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhone('+2348011112222')}
                    className="px-2 py-1 rounded-md bg-white border border-emerald-200 text-emerald-900 text-[11px] hover:bg-emerald-100"
                  >
                    Aisha (Unit Mgr)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Sending code...' : 'Continue with Phone'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-semibold">Code sent to:</span> {phone}
                  {otpHint && (
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      Dev test code: <span className="font-bold underline">{otpHint}</span> (or 123456)
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-emerald-700 underline font-medium hover:text-emerald-900"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Enter 6-Digit Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-300 text-center text-xl tracking-widest font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
              <span>Two-Factor Authentication (2FA) verification bypassed for test session.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm transition-colors shadow-md disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In as Operations Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
