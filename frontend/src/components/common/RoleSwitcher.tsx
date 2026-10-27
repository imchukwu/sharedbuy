import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Users, ChevronDown, Check } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { user, loginAsDemoRole, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleRoleSelect = async (role: 'MEMBER' | 'UNIT_MANAGER' | 'ADMIN', targetPath: string) => {
    await loginAsDemoRole(role);
    setIsOpen(false);
    navigate(targetPath);
  };

  const getActiveRoleLabel = () => {
    if (!user) return 'Guest';
    if (user.role === 'ADMIN') return 'Admin (Ops)';
    if (user.role === 'UNIT_MANAGER') return 'Unit Manager';
    return 'Member';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
        title="Switch portal role"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
        <span className="max-w-[90px] truncate">{getActiveRoleLabel()}</span>
        <ChevronDown size={13} className="text-emerald-700" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Portal & Test Role</p>
              {user && (
                <p className="text-xs text-gray-700 mt-0.5 truncate">
                  Logged in as <strong className="text-emerald-700">{user.full_name}</strong>
                </p>
              )}
            </div>

            <div className="py-1">
              {/* Member Option */}
              <button
                onClick={() => handleRoleSelect('MEMBER', '/')}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                  user?.role === 'MEMBER' ? 'bg-emerald-50/70 font-semibold text-emerald-900' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                    <Users size={14} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Member Portal</div>
                    <div className="text-[11px] text-gray-500">Babagana Kyari (+2348100000001)</div>
                  </div>
                </div>
                {user?.role === 'MEMBER' && <Check size={14} className="text-emerald-600" />}
              </button>

              {/* Manager Option */}
              <button
                onClick={() => handleRoleSelect('UNIT_MANAGER', '/manager')}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                  user?.role === 'UNIT_MANAGER' ? 'bg-emerald-50/70 font-semibold text-emerald-900' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                    <UserCheck size={14} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Unit Manager Portal</div>
                    <div className="text-[11px] text-gray-500">Aisha Bello (+2348011112222)</div>
                  </div>
                </div>
                {user?.role === 'UNIT_MANAGER' && <Check size={14} className="text-emerald-600" />}
              </button>

              {/* Admin Option */}
              <button
                onClick={() => handleRoleSelect('ADMIN', '/admin')}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                  user?.role === 'ADMIN' ? 'bg-emerald-50/70 font-semibold text-emerald-900' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-800">
                    <ShieldCheck size={14} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Admin Operations Portal</div>
                    <div className="text-[11px] text-gray-500">SharedBuy Ops (admin@sharedbuy.ng)</div>
                  </div>
                </div>
                {user?.role === 'ADMIN' && <Check size={14} className="text-emerald-600" />}
              </button>
            </div>

            {user && (
              <div className="border-t border-gray-100 pt-1 px-3">
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                    navigate('/');
                  }}
                  className="w-full py-1.5 text-center text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Log out session
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
