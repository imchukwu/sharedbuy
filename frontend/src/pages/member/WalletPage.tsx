import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatKobo } from '../../utils/formatters';
import { ArrowDownRight, ArrowUpRight, ShieldCheck, Check } from 'lucide-react';

export const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [balanceKobo] = useState(125000); // ₦1,250
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [bankName, setBankName] = useState('GTBank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawnSuccess, setWithdrawnSuccess] = useState(false);

  const transactions = [
    {
      id: 'tx-01',
      type: 'CREDIT',
      amount_kobo: 125000,
      reason: 'Surplus Refund (Honey Beans Unit #04)',
      date: '24 Oct 2026',
    },
    {
      id: 'tx-02',
      type: 'DEBIT',
      amount_kobo: 982500,
      reason: 'Joined Parboiled Rice Unit #01',
      date: '22 Oct 2026',
    },
  ];

  return (
    <div className="pb-24 max-w-xl mx-auto px-3.5 pt-3">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Member Wallet</h1>
        <p className="text-xs text-gray-500 mt-0.5">Surplus savings refunds and platform credits.</p>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-5 shadow-sm mb-5 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-emerald-200 mb-1">
          <span className="font-medium">Available Balance</span>
          <span className="flex items-center gap-1 font-semibold text-emerald-300">
            <ShieldCheck size={14} /> Verified Escrow
          </span>
        </div>

        <div className="text-3xl font-black tracking-tight">{formatKobo(balanceKobo)}</div>
        <p className="text-[11px] text-emerald-100/80 mt-1 leading-relaxed">
          Surplus from wholesale price fluctuations is automatically returned here.
        </p>

        <div className="mt-4 pt-3 border-t border-emerald-700/60 flex items-center gap-2">
          <button
            onClick={() => setWithdrawModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-bold text-xs shadow-md hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            Withdraw to Bank
          </button>
        </div>
      </div>

      {/* Ledger History */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Transaction Ledger</h2>

        <div className="divide-y divide-gray-100">
          {transactions.map((tx) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    tx.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {tx.type === 'CREDIT' ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                </div>
                <div>
                  <div className="font-semibold text-xs text-gray-900">{tx.reason}</div>
                  <div className="text-[10px] text-gray-400">{tx.date}</div>
                </div>
              </div>

              <div
                className={`font-bold text-xs ${
                  tx.type === 'CREDIT' ? 'text-emerald-700' : 'text-gray-900'
                }`}
              >
                {tx.type === 'CREDIT' ? '+' : '-'}
                {formatKobo(tx.amount_kobo)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Withdraw to Bank</h3>
              <button onClick={() => setWithdrawModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                ✕
              </button>
            </div>

            {withdrawnSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Check size={24} />
                </div>
                <h4 className="font-bold text-sm text-gray-900">Withdrawal Request Queued</h4>
                <p className="text-xs text-gray-500">
                  ₦1,250 will be transferred to your {bankName} account via Paystack Transfer within 2 hours.
                </p>
                <button
                  onClick={() => { setWithdrawModalOpen(false); setWithdrawnSuccess(false); }}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="py-4 space-y-3 text-xs">
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
                    <option value="Kuda Bank">Kuda Microfinance Bank</option>
                    <option value="OPay">OPay</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Account Number (10 digits)</label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="0123456789"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      if (e.target.value.length === 10) {
                        setAccountName(user?.full_name || 'Babagana Kyari');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-sm"
                  />
                  {accountName && (
                    <div className="text-[11px] text-emerald-700 font-medium mt-1">
                      Account Name: <strong>{accountName}</strong>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex justify-between items-center">
                  <span className="text-gray-600">Amount to withdraw:</span>
                  <span className="font-bold text-emerald-800 text-sm">{formatKobo(balanceKobo)}</span>
                </div>

                <button
                  onClick={() => setWithdrawnSuccess(true)}
                  disabled={accountNumber.length !== 10}
                  className="w-full py-3 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Confirm Withdrawal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
