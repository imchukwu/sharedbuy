import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingBag, PackageCheck, Wallet, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // If in manager or admin portal, render specific bottom navigation or let them stay uncluttered
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 h-14">
        {/* Explore Units */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? 'text-emerald-700 font-semibold' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          <ShoppingBag size={19} />
          <span className="text-[10px]">Browse</span>
        </NavLink>

        {/* My Units */}
        <NavLink
          to="/my-units"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors relative ${
              isActive ? 'text-emerald-700 font-semibold' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          <PackageCheck size={19} />
          <span className="text-[10px]">My Units</span>
          {user && (
            <span className="absolute top-2 right-6 w-1.5 h-1.5 rounded-full bg-emerald-600" />
          )}
        </NavLink>

        {/* Wallet */}
        <NavLink
          to="/wallet"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? 'text-emerald-700 font-semibold' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          <Wallet size={19} />
          <span className="text-[10px]">Wallet</span>
        </NavLink>

        {/* Manager or Admin shortcut */}
        <NavLink
          to={user?.role === 'ADMIN' ? '/admin' : '/manager'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? 'text-emerald-700 font-semibold' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          {user?.role === 'ADMIN' ? <Shield size={19} /> : <UserCheck size={19} />}
          <span className="text-[10px]">{user?.role === 'ADMIN' ? 'Admin' : 'Manager'}</span>
        </NavLink>
      </div>
    </nav>
  );
};
