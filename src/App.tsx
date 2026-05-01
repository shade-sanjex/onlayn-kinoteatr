import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import CreateRoom from "@/pages/CreateRoom";
import Room from "@/pages/Room";
import Friends from "@/pages/Friends";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
      <Route path="/create-room" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
      <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
    </Routes>
  );
}
