import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/layout/Navbar';
import DashboardLayout from './pages/DashboardLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import MarketplacePage from './pages/MarketplacePage';
import DesignerPortalPage from './pages/DesignerPortalPage';
import AiStudioPage from './pages/AiStudioPage';
import StarredPage from './pages/StarredPage';
import SharedPage from './pages/SharedPage';
import MyAssetsPage from './pages/MyAssetsPage';
import EditorPage from './pages/EditorPage';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import SettingsPage from './pages/SettingsPage';
import FloorPlannerPage from './pages/FloorPlannerPage';
import CookieConsent from './components/common/CookieConsent';
import GlobalToast from './components/common/GlobalToast';

export default function App() {
    return (
        <Router>
            <div className="app-container">
                <Navbar />
                <Routes>
                    <Route path="/" element={<LandingPage />} />

                    <Route element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/starred" element={<StarredPage />} />
                        <Route path="/shared" element={<SharedPage />} />
                        <Route path="/templates" element={<MarketplacePage />} />
                        <Route path="/designer" element={<DesignerPortalPage />} />
                        <Route path="/ai-studio" element={<AiStudioPage />} />
                        <Route path="/assets" element={<MyAssetsPage />} />
                        <Route path="/floor-planner" element={<FloorPlannerPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/security" element={<Navigate to="/settings?tab=security" replace />} />
                    </Route>

                    <Route path="/editor/:projectId?" element={
                        <ProtectedRoute>
                            <EditorPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />

                    <Route path="*" element={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px', fontFamily: 'Poppins, sans-serif' }}>
                            <h1 style={{ fontSize: '64px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>404</h1>
                            <p style={{ fontSize: '16px', color: 'var(--silver)' }}>Page not found</p>
                            <a href="/dashboard" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Back to Dashboard</a>
                        </div>
                    } />
                </Routes>
                <CookieConsent />
                <GlobalToast />
            </div>
        </Router>
    );
}
