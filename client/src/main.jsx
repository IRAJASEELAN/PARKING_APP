import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { SearchProvider } from "./SearchContext.jsx";

import WelcomePage    from "./pages/WelcomePage.jsx";
import PermissionsPage from "./pages/PermissionsPage.jsx";
import SignInPage     from "./pages/SignInPage.jsx";
import SignUpPage     from "./pages/SignUpPage.jsx";
import ForgotPage     from "./pages/ForgotPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import MapPage        from "./pages/MapPage.jsx";
import DestinationPage from "./pages/DestinationPage.jsx";
import SelectDestinationPage from "./pages/SelectDestinationPage.jsx";
import FiltersPage    from "./pages/FiltersPage.jsx";
import ResultsPage    from "./pages/ResultsPage.jsx";
import FacilityPage   from "./pages/FacilityPage.jsx";
import ReservePage    from "./pages/ReservePage.jsx";
import CheckoutPage   from "./pages/CheckoutPage.jsx";
import ConfirmedPage  from "./pages/ConfirmedPage.jsx";
import NavigatePage   from "./pages/NavigatePage.jsx";
import SessionPage    from "./pages/SessionPage.jsx";
import TripsPage      from "./pages/TripsPage.jsx";
import ProfilePage    from "./pages/ProfilePage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";

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
          <Routes>
            {/* ── Public routes ───────────── */}
            <Route path="/"            element={<WelcomePage />} />
            <Route path="/permissions" element={<PermissionsPage />} />
            <Route path="/signin"      element={<SignInPage />} />
            <Route path="/signup"      element={<SignUpPage />} />
            <Route path="/forgot"      element={<ForgotPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ── Protected routes — share sidebar layout */}
            <Route element={<AppShell />}>
              <Route path="/app"                   element={<MapPage />} />
              <Route path="/app/destination"        element={<DestinationPage />} />
              <Route path="/app/destination/map"    element={<SelectDestinationPage />} />
              <Route path="/app/filters"            element={<FiltersPage />} />
              <Route path="/app/results"            element={<ResultsPage />} />
              <Route path="/app/lots/:id"           element={<FacilityPage />} />
              <Route path="/app/reserve/:id"        element={<ReservePage />} />
              <Route path="/app/checkout"           element={<CheckoutPage />} />
              <Route path="/app/reservation/:id"    element={<ConfirmedPage />} />
              <Route path="/app/navigate/:id"       element={<NavigatePage />} />
              <Route path="/app/session/:id"        element={<SessionPage />} />
              <Route path="/app/trips"              element={<TripsPage />} />
              <Route path="/app/profile"            element={<ProfilePage />} />
              <Route path="/app/admin"              element={<AdminRoute />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SearchProvider>
    </AuthProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);



