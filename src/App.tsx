import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/common/ToastProvider';
import { SessionPanel } from './components/multiplayer/SessionPanel';

// DM Pages
const DashboardPage = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const CharactersPage = lazy(() => import('./pages/Characters').then((m) => ({ default: m.Characters })));
const CombatPage = lazy(() => import('./pages/Combat').then((m) => ({ default: m.Combat })));
const CampPage = lazy(() => import('./pages/Camp').then((m) => ({ default: m.Camp })));
const CampaignsPage = lazy(() => import('./pages/Campaigns').then((m) => ({ default: m.Campaigns })));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetail').then((m) => ({ default: m.CampaignDetail })));
const CampaignNavigatorPage = lazy(() => import('./pages/CampaignNavigator').then((m) => ({ default: m.CampaignNavigator })));

// Multiplayer Pages
const SessionLobbyPage = lazy(() => import('./pages/SessionLobby').then((m) => ({ default: m.SessionLobby })));
const PlayerViewPage = lazy(() => import('./pages/PlayerView').then((m) => ({ default: m.PlayerView })));

function RouteLoader() {
  return (
    <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center text-stone-400 text-sm">
      Loading page...
    </div>
  );
}

function App() {
  return (
    <Router>
      <ToastProvider>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            {/* Multiplayer routes — no AppShell wrapper */}
            <Route path="/lobby" element={<SessionLobbyPage />} />
            <Route path="/player" element={<PlayerViewPage />} />

            {/* DM routes — wrapped in AppShell */}
            <Route path="/*" element={
              <AppShell>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                  <Route path="/characters" element={<CharactersPage />} />
                  <Route path="/combat" element={<CombatPage />} />
                  <Route path="/camp" element={<CampPage />} />
                  <Route path="/navigator" element={<CampaignNavigatorPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                {/* DM Session Panel floats on top of all DM pages */}
                <SessionPanel />
              </AppShell>
            } />
          </Routes>
        </Suspense>
      </ToastProvider>
    </Router>
  );
}

export default App;
