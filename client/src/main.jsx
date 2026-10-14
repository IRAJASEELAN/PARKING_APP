import React from "react";
import { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { SearchProvider } from "./SearchContext.jsx";

const WelcomePage = lazy(() => import("./pages/WelcomePage.jsx"));
const PermissionsPage = lazy(() => import("./pages/PermissionsPage.jsx"));
const SignInPage = lazy(() => import("./pages/SignInPage.jsx"));
const SignUpPage = lazy(() => import("./pages/SignUpPage.jsx"));
const ForgotPage = lazy(() => import("./pages/ForgotPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const MapPage = lazy(() => import("./pages/MapPage.jsx"));
const DestinationPage = lazy(() => import("./pages/DestinationPage.jsx"));
const SelectDestinationPage = lazy(() => import("./pages/SelectDestinationPage.jsx"));
const FiltersPage = lazy(() => import("./pages/FiltersPage.jsx"));
const ResultsPage = lazy(() => import("./pages/ResultsPage.jsx"));
const FacilityPage = lazy(() => import("./pages/FacilityPage.jsx"));
const ReservePage = lazy(() => import("./pages/ReservePage.jsx"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage.jsx"));
const ConfirmedPage = lazy(() => import("./pages/ConfirmedPage.jsx"));
const PaymentPage = lazy(() => import("./pages/PaymentPage.jsx"));
const NavigatePage = lazy(() => import("./pages/NavigatePage.jsx"));
const DirectionsPage = lazy(() => import("./pages/DirectionsPage.jsx"));
const SessionPage = lazy(() => import("./pages/SessionPage.jsx"));
const TripsPage = lazy(() => import("./pages/TripsPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage.jsx"));
const OwnerDashboardPage = lazy(() => import("./pages/OwnerDashboardPage.jsx"));

import Toast          from "./components/Toast.jsx";
import AppLayout      from "./components/AppLayout.jsx";
import "./index.css";

/* ── Auth guard ── renders Outlet (nested) or children (direct) */
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="splash-loading"><div className="spin" /></div>;
  if (!token) return <Navigate to="/signin" replace />;
  return children ?? <Outlet />;
}

/* ── Layout wrapper — ProtectedRoute + AppLayout + Outlet */
function AdminRoute() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminDashboardPage /> : <Navigate to="/app" replace />;
}
function HomeRoute() {
  const { user } = useAuth();
  return user?.role === "owner" ? <OwnerDashboardPage /> : <MapPage />;
}
function OwnerRoute() {
  const { user } = useAuth();
  return user?.role === "owner" ? <OwnerDashboardPage /> : <Navigate to="/app" replace />;
}
function AppShell() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <BrowserRouter>
          <Toast />
          <Suspense fallback={<div className="splash-loading"><div className="spin" /></div>}>
          <Routes>
            {/* ── Public routes ───────────── */}
            <Route path="/"            element={<WelcomePage />} />
            <Route path="/permissions" element={<PermissionsPage />} />
            <Route path="/signin"      element={<SignInPage portal="user" />} />
            <Route path="/owner/signin" element={<SignInPage portal="owner" />} />
            <Route path="/signup"      element={<SignUpPage />} />
            <Route path="/forgot"      element={<ForgotPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ── Protected routes — share sidebar layout */}
            <Route element={<AppShell />}>
              <Route path="/app"                   element={<HomeRoute />} />
              <Route path="/app/owner"             element={<OwnerRoute />} />
              <Route path="/app/destination"        element={<DestinationPage />} />
              <Route path="/app/destination/map"    element={<SelectDestinationPage />} />
              <Route path="/app/filters"            element={<FiltersPage />} />
              <Route path="/app/results"            element={<ResultsPage />} />
              <Route path="/app/lots/:id"           element={<FacilityPage />} />
              <Route path="/app/reserve/:id"        element={<ReservePage />} />
              <Route path="/app/checkout"           element={<CheckoutPage />} />
              <Route path="/app/payment/:id"         element={<PaymentPage />} />
              <Route path="/app/reservation/:id"    element={<ConfirmedPage />} />
              <Route path="/app/navigate/:id"       element={<NavigatePage />} />
              <Route path="/app/directions"        element={<DirectionsPage />} />
              <Route path="/app/session/:id"        element={<SessionPage />} />
              <Route path="/app/trips"              element={<TripsPage />} />
              <Route path="/app/profile"            element={<ProfilePage />} />
              <Route path="/app/admin"              element={<AdminRoute />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </SearchProvider>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);



