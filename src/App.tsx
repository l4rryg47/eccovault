import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupportProvider } from "@/components/SupportContactModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Public
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import PublicInfoPage from "./pages/PublicInfoPage.tsx";
import { publicPages } from "./lib/publicPages.ts";

// User dashboard
import DashboardLayout from "./layouts/DashboardLayout.tsx";
import DashboardOverview from "./pages/dashboard/DashboardOverview.tsx";
import AccountsPage from "./pages/dashboard/AccountsPage.tsx";
import TransactionsPage from "./pages/dashboard/TransactionsPage.tsx";
import CardsPage from "./pages/dashboard/CardsPage.tsx";
import SavingsPage from "./pages/dashboard/SavingsPage.tsx";
import InvestmentsPage from "./pages/dashboard/InvestmentsPage.tsx";
import SettingsPage from "./pages/dashboard/SettingsPage.tsx";
import ProfilePage from "./pages/dashboard/ProfilePage.tsx";
import TransferPage from "./pages/dashboard/TransferPage.tsx";
import CardDepositPage from "./pages/dashboard/CardDepositPage.tsx";

// Admin dashboard
import AdminLayout from "./layouts/AdminLayout.tsx";
import AdminOverview from "./pages/admin/AdminOverview.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminTransactions from "./pages/admin/AdminTransactions.tsx";
import AdminPendingTransfers from "./pages/admin/AdminPendingTransfers.tsx";
import AdminCardPayments from "./pages/admin/AdminCardPayments.tsx";
import AdminAccounts from "./pages/admin/AdminAccounts.tsx";
import AdminSupport from "./pages/admin/AdminSupport.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";

import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
        <AuthProvider>
          <SupportProvider>
            <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage initialMode="signup" />} />
            {publicPages.map((page) => (
              <Route
                key={page.path}
                path={page.path}
                element={<PublicInfoPage page={page} />}
              />
            ))}

            {/* User dashboard */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="cards" element={<CardsPage />} />
              <Route path="savings" element={<SavingsPage />} />
              <Route path="investments" element={<InvestmentsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="transfer" element={<TransferPage />} />
              <Route path="deposit" element={<CardDepositPage />} />
            </Route>

            {/* Admin dashboard — completely separate layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="transfer-reviews" element={<AdminPendingTransfers />} />
              <Route path="payments" element={<AdminCardPayments />} />
              <Route path="accounts" element={<AdminAccounts />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
            </Routes>
          </SupportProvider>
        </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
