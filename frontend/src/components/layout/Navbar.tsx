import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { AuthModal } from '../auth/AuthModal';
import { ShoppingBag, LogIn } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const location = useLocation();

  const isManagerRoute = location.pathname.startsWith('/manager');
  const isDistributorRoute = location.pathname.startsWith('/distributor');
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3.5 py-2.5 flex items-center justify-between gap-2">
          {/* Logo & Portal Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-800 transition-colors">
              <ShoppingBag size={18} />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-gray-900 block leading-tight">
                Shared<span className="text-emerald-700">Buy</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium -mt-0.5 block">
                {isAdminRoute ? 'Admin Portal' : isDistributorRoute ? 'Distributor Portal' : isManagerRoute ? 'Manager Portal' : 'Bulk Staples Nigeria'}
              </span>
            </div>
          </Link>

          {/* Center Navigation Shortcuts for Portals (hidden on tiny screens, clear on wider) */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-full text-xs font-medium">
            <Link
              to="/"
              className={`px-3 py-1 rounded-full transition-colors ${
                !isManagerRoute && !isDistributorRoute && !isAdminRoute ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Member
            </Link>
            <Link
              to="/manager"
              className={`px-3 py-1 rounded-full transition-colors ${
                isManagerRoute ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Manager
            </Link>
            <Link
              to="/distributor"
              className={`px-3 py-1 rounded-full transition-colors ${
                isDistributorRoute ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Distributor
            </Link>
            <Link
              to="/admin"
              className={`px-3 py-1 rounded-full transition-colors ${
                isAdminRoute ? 'bg-white text-emerald-800 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Admin
            </Link>
          </div>

          {/* Right Section: Role Switcher & Sign In */}
          <div className="flex items-center gap-1.5">
            <RoleSwitcher />

            {!user ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs transition-colors cursor-pointer"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 pl-1">
                <div
                  className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700"
                  title={user.full_name}
                >
                  {user.full_name.charAt(0)}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};
