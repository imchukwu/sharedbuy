import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { HomePage } from './pages/member/HomePage';
import { RouteGuard } from './components/portal/RouteGuard';
import { Loader2 } from 'lucide-react';

// Slow 3G Optimization: Route-based code splitting for secondary pages & portals
const MyUnitsPage = lazy(() =>
  import('./pages/member/MyUnitsPage').then((m) => ({ default: m.MyUnitsPage }))
);
const WalletPage = lazy(() =>
  import('./pages/member/WalletPage').then((m) => ({ default: m.WalletPage }))
);
const ManagerDashboardPage = lazy(() =>
  import('./pages/manager/ManagerDashboardPage').then((m) => ({
    default: m.ManagerDashboardPage,
  }))
);
const DistributorDashboardPage = lazy(() =>
  import('./pages/distributor/DistributorDashboardPage').then((m) => ({
    default: m.DistributorDashboardPage,
  }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  }))
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#f8faf8] text-gray-900 flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
          <Navbar />

          <main className="flex-1">
            <Suspense
              fallback={
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
                  <Loader2 size={20} className="animate-spin text-emerald-700" />
                  <span>Loading module (3G optimized)...</span>
                </div>
              }
            >
              <Routes>
                {/* 1. Member Portal Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/my-units" element={<MyUnitsPage />} />
                <Route path="/wallet" element={<WalletPage />} />

                {/* 2. Unit Manager Portal Route (Guarded) */}
                <Route
                  path="/manager/*"
                  element={
                    <RouteGuard requiredRole="UNIT_MANAGER">
                      <ManagerDashboardPage />
                    </RouteGuard>
                  }
                />

                {/* 3. Distributor Portal Route (Guarded) */}
                <Route
                  path="/distributor/*"
                  element={
                    <RouteGuard requiredRole="DISTRIBUTOR">
                      <DistributorDashboardPage />
                    </RouteGuard>
                  }
                />

                {/* 4. Admin Portal Route (Guarded) */}
                <Route
                  path="/admin/*"
                  element={
                    <RouteGuard requiredRole="ADMIN">
                      <AdminDashboardPage />
                    </RouteGuard>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          <BottomNav />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
