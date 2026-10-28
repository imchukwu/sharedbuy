import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowRight, UserCheck, Shield } from 'lucide-react';
import { AuthModal } from '../auth/AuthModal';

interface RouteGuardProps {
  requiredRole: 'UNIT_MANAGER' | 'ADMIN' | 'DISTRIBUTOR';
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ requiredRole, children }) => {
  const { user, loginAsDemoRole } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // Check authorization
  const isAuthorized =
    (requiredRole === 'UNIT_MANAGER' && (user?.role === 'UNIT_MANAGER' || user?.role === 'ADMIN')) ||
    (requiredRole === 'ADMIN' && user?.role === 'ADMIN') ||
    (requiredRole === 'DISTRIBUTOR' && (user?.role === 'DISTRIBUTOR' || user?.role === 'ADMIN'));

  if (isAuthorized) {
    return <>{children}</>;
  }

  const roleTitle =
    requiredRole === 'ADMIN'
      ? 'Admin Portal Restricted'
      : requiredRole === 'DISTRIBUTOR'
      ? 'Distributor Portal Restricted'
      : 'Unit Manager Portal Restricted';

  const roleDesc =
    requiredRole === 'ADMIN'
      ? 'This operations console is restricted to SharedBuy administrative and operations staff.'
      : requiredRole === 'DISTRIBUTOR'
      ? 'This portal is restricted to accredited Agro Suppliers & Millers managing wholesale grain/commodity dispatches.'
      : 'This portal is restricted to accredited Unit Managers coordinating local estate bulk buying.';

  const demoButtonColor =
    requiredRole === 'ADMIN'
      ? 'bg-purple-700 hover:bg-purple-800'
      : requiredRole === 'DISTRIBUTOR'
      ? 'bg-amber-600 hover:bg-amber-700'
      : 'bg-emerald-700 hover:bg-emerald-800';

  const demoButtonText =
    requiredRole === 'ADMIN'
      ? 'Switch to Admin (SharedBuy Ops)'
      : requiredRole === 'DISTRIBUTOR'
      ? 'Switch to Distributor (Alhaji Dahiru)'
      : 'Switch to Unit Manager (Aisha Bello)';

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 text-center border border-gray-200 shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-4">
          <ShieldAlert size={28} />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {roleTitle}
        </h2>

        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
          {roleDesc}
        </p>

        {/* Portal Sign-In & Dev-Only Quick Switcher */}
        <div className="space-y-3">
          {import.meta.env.DEV && (
            <button
              onClick={() => loginAsDemoRole(requiredRole)}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 text-white shadow-md transition-all cursor-pointer ${demoButtonColor}`}
            >
              {requiredRole === 'ADMIN' ? (
                <Shield size={16} />
              ) : requiredRole === 'DISTRIBUTOR' ? (
                <UserCheck size={16} />
              ) : (
                <UserCheck size={16} />
              )}
              <span>{demoButtonText}</span>
              <ArrowRight size={14} />
            </button>
          )}

          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
          >
            Sign In with authorized credentials
          </button>
        </div>
      </div>

      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={requiredRole === 'ADMIN' ? 'admin' : 'member'}
      />
    </div>
  );
};
