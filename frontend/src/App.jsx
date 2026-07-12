import { Routes, Route, Navigate } from 'react-router';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { isLoggedIn } from './api';
import './App.css';
import Register from './pages/Register';

function RequireAuth({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="app-shell">
      <div className="backdrop" aria-hidden="true" />
      <Routes>
        <Route path="/" element={<Navigate to={isLoggedIn() ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
}
