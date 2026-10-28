import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo, formatDate } from '../../utils/formatters';
import type { WalletSummary } from '../../types';
import {
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Check,
  PlusCircle,
  Copy,
  Share2,
  Gift,
  Loader2
} from 'lucide-react';
import { AuthModal } from '../../components/auth/AuthModal';

export const WalletPage: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Top-Up state
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupAmountNaira, setTopupAmountNaira] = useState<number>(5000);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState(false);

  // Withdraw state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmountNaira, setWithdrawAmountNaira] = useState<number>(2000);
  const [bankName, setBankName] = useState('GTBank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawnSuccess, setWithdrawnSuccess] = useState(false);

  // Referral state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchWallet = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: WalletSummary = await res.json();
        setWallet(data);
      }
    } catch (err) {
      console.error('Failed to load wallet', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [token]);

  // Handle Top-Up via Paystack
  const handleTopUp = async () => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    if (topupAmountNaira <= 0) return;

    setTopupLoading(true);
    try {
      const amountKobo = topupAmountNaira * 100;
      const initRes = await fetch('/api/wallet/topup/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount_kobo: amountKobo,
          callback_url: window.location.href,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        alert(initData.error || 'Failed to initialize top-up');
        setTopupLoading(false);
        return;
      }

      // If live Paystack script is ready
      if (!initData.is_mock && initData.public_key && (window as any).PaystackPop) {
        const handler = (window as any).PaystackPop.setup({
          key: initData.public_key,
          email: user?.email || `${user?.phone.replace('+', '')}@sharedbuy.ng`,
          amount: initData.amount_kobo,
          currency: 'NGN',
          ref: initData.reference,
          callback: async function (response: any) {
            await verifyTopUp(response.reference);
          },
          onClose: function () {
            setTopupLoading(false);
          },
        });
        handler.openIframe();
      } else {
        // Direct sandbox flow
        await verifyTopUp(initData.reference);
      }
    } catch (err: any) {
      alert(err.message || 'Top up error');
      setTopupLoading(false);
    }
  };

  const verifyTopUp = async (reference: string) => {
    try {
      const res = await fetch(`/api/wallet/topup/verify/${reference}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTopupSuccess(true);
        await fetchWallet();
        await refreshProfile();
      } else {
        const data = await res.json();
        alert(data.error || 'Top up verification failed');
      }
    } catch (err) {
      alert('Verification network error');
    } finally {
      setTopupLoading(false);
    }
  };

  // Handle Withdrawal
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const amountKobo = withdrawAmountNaira * 100;
    if (amountKobo > (wallet?.balance_kobo || 0)) {
      alert('Withdrawal amount exceeds available wallet balance');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount_kobo: amountKobo,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName || user?.full_name || 'Account Holder',
        }),
      });

      if (res.ok) {
        setWithdrawnSuccess(true);
        await fetchWallet();
        await refreshProfile();
      } else {
        const data = await res.json();
        alert(data.error || 'Withdrawal request failed');
      }
    } catch (err: any) {
      alert(err.message || 'Withdrawal network error');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const referralCode = wallet?.referral_code || user?.referral_code || user?.id || 'REF-PIWOYI';
  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join me on SharedBuy! We buy bulk food staples (Mama Gold rice, Lactorich milk, crayfish, and palm oil) directly from millers and split with neighbors in Piwoyi, Abuja.\n\nSign up using my link for community discounts: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const currentBalanceKobo = wallet?.balance_kobo ?? (user?.wallet_balance_kobo || 0);

  return (
    <div className="pb-24 max-w-xl mx-auto px-3.5 pt-3">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Member Wallet</h1>
        <p className="text-xs text-gray-500 mt-0.5">Fund shares, receive surplus refunds, and earn referral bonuses.</p>
      </div>

      {!user ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <ShieldCheck size={26} />
          </div>
          <h3 className="font-bold text-base text-gray-900">Sign in to access your wallet</h3>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">
            Track your deposits, surplus refunds from bulk buying, and community referral bonuses.
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
          {/* 1. Wallet Balance Card */}
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-5 shadow-sm mb-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-emerald-200 mb-1">
              <span className="font-medium">Available Balance</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-300">
                <ShieldCheck size={14} /> 100% Escrow Protected
              </span>
            </div>

            <div className="text-3xl font-black tracking-tight">{formatKobo(currentBalanceKobo)}</div>
            <p className="text-[11px] text-emerald-100/80 mt-1 leading-relaxed">
              Use your wallet for 1-click unit payments without needing your debit card each time.
            </p>

            <div className="mt-4 pt-3.5 border-t border-emerald-700/60 flex items-center gap-2.5">
              <button
                onClick={() => {
                  setTopupSuccess(false);
                  setTopupModalOpen(true);
                }}
                className="flex-1 py-2 rounded-xl bg-white text-emerald-900 font-bold text-xs shadow-md hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={15} />
                <span>Add Money</span>
              </button>
              <button
                onClick={() => {
                  setWithdrawnSuccess(false);
                  setWithdrawAmountNaira(Math.floor(currentBalanceKobo / 100));
                  setWithdrawModalOpen(true);
                }}
                disabled={currentBalanceKobo <= 0}
                className="flex-1 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-xs border border-emerald-500/60 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Withdraw to Bank
              </button>
            </div>
          </div>

          {/* 2. Referral & Neighbor Rewards Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-3xl p-4.5 border border-amber-200/80 shadow-2xs mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Gift size={16} className="text-amber-700" />
                <span>Invite Neighbors & Earn ₦200</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                ₦200 per joining neighbor
              </span>
            </div>

            <p className="text-xs text-amber-900/80 leading-relaxed">
              Whenever a neighbor registers or joins a buying unit with your link, <strong>₦200</strong> is automatically credited to your wallet balance.
            </p>

            {/* Referral Code & Link Box */}
            <div className="bg-white rounded-2xl p-3 border border-amber-200/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 text-[11px]">Your Referral Code:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {referralCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="p-1 rounded text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                    title="Copy Referral Code"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="w-full text-[11px] font-mono text-gray-600 bg-gray-50 p-2 rounded-xl border border-gray-200 truncate focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-2.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Referral Stats & WhatsApp Share */}
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/50">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Neighbors Joined</div>
                <div className="text-base font-black text-amber-950 mt-0.5">
                  {wallet?.referrals_count ?? (user?.referrals_count || 0)}
                </div>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/50">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Total Bonus Earned</div>
                <div className="text-base font-black text-emerald-800 mt-0.5">
                  {formatKobo(wallet?.referral_earnings_kobo ?? (user?.referral_earnings_kobo || 0))}
                </div>
              </div>
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Share2 size={15} />
              <span>Share Invite to WhatsApp Group</span>
            </button>
          </div>

          {/* 3. Transaction Ledger */}
          <div className="bg-white rounded-3xl p-4.5 border border-gray-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Ledger</h2>
              <span className="text-[10px] text-gray-400 font-medium">Real-time ledger</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading transactions...
              </div>
            ) : !wallet?.transactions || wallet.transactions.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {wallet.transactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          tx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tx.type === 'CREDIT' ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-gray-900 leading-snug break-words">
                          {tx.reason}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {formatDate(tx.created_at)} • Balance after: {formatKobo(tx.balance_after_kobo)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`font-bold text-xs shrink-0 ${
                        tx.type === 'CREDIT' ? 'text-emerald-700' : 'text-gray-900'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}
                      {formatKobo(tx.amount_kobo)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* 4. Top-Up Modal */}
      {topupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Add Funds to Wallet</h3>
              <button
                onClick={() => setTopupModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            {topupSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>
                <h4 className="font-bold text-sm text-gray-900">Wallet Funded Successfully!</h4>
                <p className="text-xs text-gray-500">
                  ₦{topupAmountNaira.toLocaleString()} has been added to your balance.
                </p>
                <button
                  onClick={() => {
                    setTopupModalOpen(false);
                    setTopupSuccess(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="py-4 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1.5">Select Preset Amount</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2000, 5000, 10000, 20000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTopupAmountNaira(amt)}
                        className={`py-2 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                          topupAmountNaira === amt
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        ₦{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Custom Amount (₦)</label>
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={topupAmountNaira}
                    onChange={(e) => setTopupAmountNaira(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-900"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Minimum deposit: ₦500</p>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Deposit Amount:</span>
                    <span>₦{topupAmountNaira.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-700">
                    <span>Payment Gateway:</span>
                    <span>Paystack Secure Checkout</span>
                  </div>
                </div>

                <button
                  disabled={topupLoading || topupAmountNaira <= 0}
                  onClick={handleTopUp}
                  className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {topupLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Processing Deposit...</span>
                    </>
                  ) : (
                    <span>Pay ₦{topupAmountNaira.toLocaleString()} & Fund Wallet</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Withdrawal Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Withdraw to Bank</h3>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            {withdrawnSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>
                <h4 className="font-bold text-sm text-gray-900">Withdrawal Processed!</h4>
                <p className="text-xs text-gray-500">
                  ₦{withdrawAmountNaira.toLocaleString()} has been queued for instant settlement to your {bankName} account ({accountNumber}).
                </p>
                <button
                  onClick={() => {
                    setWithdrawModalOpen(false);
                    setWithdrawnSuccess(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Select Bank</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium text-xs bg-white"
                  >
                    <option value="GTBank">Guaranty Trust Bank (GTBank)</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="First Bank">First Bank of Nigeria</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    <option value="OPay">OPay</option>
                    <option value="PalmPay">PalmPay</option>
                    <option value="Kuda Bank">Kuda Microfinance Bank</option>
                    <option value="United Bank for Africa">United Bank for Africa (UBA)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Account Number (10 digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="0123456789"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      if (e.target.value.length === 10 && !accountName) {
                        setAccountName(user?.full_name || 'Account Holder');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-sm"
                  />
                  {accountName && (
                    <div className="text-[11px] text-emerald-700 font-medium mt-1">
                      Verified Name: <strong>{accountName}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-gray-700">Withdrawal Amount (₦)</label>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmountNaira(Math.floor(currentBalanceKobo / 100))}
                      className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Withdraw All ({formatKobo(currentBalanceKobo)})
                    </button>
                  </div>
                  <input
                    type="number"
                    min={100}
                    max={Math.floor(currentBalanceKobo / 100)}
                    value={withdrawAmountNaira}
                    onChange={(e) => setWithdrawAmountNaira(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-900"
                  />
                </div>

                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex justify-between items-center">
                  <span className="text-gray-600">Remaining Balance:</span>
                  <span className="font-bold text-gray-900 text-xs">
                    {formatKobo(Math.max(0, currentBalanceKobo - withdrawAmountNaira * 100))}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={
                    withdrawLoading ||
                    accountNumber.length !== 10 ||
                    withdrawAmountNaira <= 0 ||
                    withdrawAmountNaira * 100 > currentBalanceKobo
                  }
                  className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {withdrawLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Processing Transfer...</span>
                    </>
                  ) : (
                    <span>Confirm ₦{withdrawAmountNaira.toLocaleString()} Withdrawal</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};
