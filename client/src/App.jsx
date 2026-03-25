import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Archive from './pages/Archive';
import NewDream from './pages/NewDream';
import EditDream from './pages/EditDream';
import DreamDetail from './pages/DreamDetail';
import Symbols from './pages/Symbols';
import Timeline from './pages/Timeline';
import AskArchive from './pages/AskArchive';
import AnalystFocus from './pages/AnalystFocus';
import Individuation from './pages/Individuation';
import ImportCSV from './pages/ImportCSV';
import Settings from './pages/Settings';
import GuideLetter from './pages/GuideLetter';
import Reference from './pages/Reference';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-parchment dark:bg-gray-950">
      <p className="font-display italic text-2xl text-plum opacity-60">
        Entering the dream...
      </p>
    </div>
  );
}

// Protects all main app routes. Redirects to /welcome if onboarding is incomplete.
function PrivateRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.onboarding_complete) return <Navigate to="/welcome" replace />;
  return children;
}

// Wraps /welcome — redirects away if already onboarded or not logged in.
function WelcomeRoute({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.onboarding_complete) return <Navigate to="/archive" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/welcome" element={<WelcomeRoute><Onboarding /></WelcomeRoute>} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/archive" replace />} />
                    <Route path="/archive" element={<Archive />} />
                    <Route path="/new" element={<NewDream />} />
                    <Route path="/dream/:id" element={<DreamDetail />} />
                    <Route path="/dream/:id/edit" element={<EditDream />} />
                    <Route path="/symbols" element={<Symbols />} />
                    <Route path="/timeline" element={<Timeline />} />
                    <Route path="/ask" element={<AskArchive />} />
                    <Route path="/focus" element={<AnalystFocus />} />
                    <Route path="/letter" element={<GuideLetter />} />
                    <Route path="/reference" element={<Reference />} />
                    <Route path="/individuation" element={<Individuation />} />
                    <Route path="/import" element={<ImportCSV />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
