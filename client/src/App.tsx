// 应用入口 - 路由配置
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthProvider, useAuth } from './services/AuthContext';
import MainLayout from './layouts/MainLayout';

// 懒加载页面
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AuditUpload = React.lazy(() => import('./pages/AuditUpload'));
const AuditHistory = React.lazy(() => import('./pages/AuditHistory'));
const PointsCenter = React.lazy(() => import('./pages/PointsCenter'));
const EnterpriseManage = React.lazy(() => import('./pages/EnterpriseManage'));
const TaskManage = React.lazy(() => import('./pages/TaskManage'));
const SubscriptionPage = React.lazy(() => import('./pages/SubscriptionPage'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminAds = React.lazy(() => import('./pages/AdminAds'));

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <Spin size="large" tip="加载中..." />
    </div>
  );
}

// 受保护路由
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 管理员路由
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user || !['enterprise_admin', 'super_admin'].includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* 公开页面 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 主布局内的路由 */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/audit" element={<AuditUpload />} />
          <Route path="/history" element={<AuditHistory />} />
          <Route path="/points" element={<PointsCenter />} />

          {/* 企业管理员 */}
          <Route path="/enterprise" element={<AdminRoute><EnterpriseManage /></AdminRoute>} />
          <Route path="/tasks" element={<AdminRoute><TaskManage /></AdminRoute>} />
          <Route path="/subscription" element={<AdminRoute><SubscriptionPage /></AdminRoute>} />

          {/* 超级管理员 */}
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/ads" element={<ProtectedRoute><AdminAds /></ProtectedRoute>} />
        </Route>

        {/* 兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
