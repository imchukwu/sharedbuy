import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { HomePage } from './pages/member/HomePage';
import { MyUnitsPage } from './pages/member/MyUnitsPage';
import { WalletPage } from './pages/member/WalletPage';
import { ManagerDashboardPage } from './pages/manager/ManagerDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { RouteGuard } from './components/portal/RouteGuard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#f8faf8] text-gray-900 flex flex-col antialiased selection:bg-emerald-100 selection:text-emerald-900">
          <Navbar />

          <main className="flex-1">
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

              {/* 3. Admin Portal Route (Guarded) */}
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
          </main>

          <BottomNav />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
