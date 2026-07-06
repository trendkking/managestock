import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouteSeo } from '@/components/seo/PageSeo'
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt'
import {
  AdminEntryRoute,
  AdminProtectedRoute,
  GuestRoute,
  ProtectedRoute,
} from '@/components/layout/RouteGuards'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import AccountsPage from '@/pages/AccountsPage'
import AccountDetailPage from '@/pages/AccountDetailPage'
import JournalListPage from '@/pages/JournalListPage'
import JournalChartPage from '@/pages/JournalChartPage'
import CompetitionsPage from '@/pages/CompetitionsPage'
import CompetitionDetailPage from '@/pages/CompetitionDetailPage'
import ProfilePage from '@/pages/ProfilePage'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminJournalsPage from '@/pages/admin/AdminJournalsPage'
import { DemoLayout } from '@/demo/DemoLayout'
import DemoHomePage from '@/pages/demo/DemoHomePage'
import DemoAccountsPage from '@/pages/demo/DemoAccountsPage'
import DemoAccountDetailPage from '@/pages/demo/DemoAccountDetailPage'
import DemoJournalPage from '@/pages/demo/DemoJournalPage'
import DemoJournalChartPage from '@/pages/demo/DemoJournalChartPage'
import DemoCompetitionsPage from '@/pages/demo/DemoCompetitionsPage'
import DemoCompetitionDetailPage from '@/pages/demo/DemoCompetitionDetailPage'
import AdminCompetitionsPage from '@/pages/admin/AdminCompetitionsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteSeo />
        <PwaInstallPrompt />
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/demo" element={<DemoLayout />}>
            <Route index element={<DemoHomePage />} />
            <Route path="accounts" element={<DemoAccountsPage />} />
            <Route path="accounts/:id" element={<DemoAccountDetailPage />} />
            <Route path="journal" element={<DemoJournalPage />} />
            <Route path="journal/chart/:stockCode" element={<DemoJournalChartPage />} />
            <Route path="competitions" element={<DemoCompetitionsPage />} />
            <Route path="competitions/:id" element={<DemoCompetitionDetailPage />} />
          </Route>

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Navigate to="/accounts" replace />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/:id" element={<AccountDetailPage />} />
            <Route path="/journal" element={<JournalListPage />} />
            <Route path="/journal/chart/:stockCode" element={<JournalChartPage />} />
            <Route path="/competitions" element={<CompetitionsPage />} />
            <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<AdminEntryRoute />}>
            <Route path="/admin" element={<AdminLoginPage />} />
          </Route>

          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/journals" element={<AdminJournalsPage />} />
            <Route path="/admin/competitions" element={<AdminCompetitionsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
