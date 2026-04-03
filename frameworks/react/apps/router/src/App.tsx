import { Suspense, lazy, useState, useEffect, useCallback, createContext } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AuthGuard from './components/AuthGuard';
import LoadingSkeleton from './components/LoadingSkeleton';

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Table = lazy(() => import('./pages/Table'));
const Form = lazy(() => import('./pages/Form'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Search = lazy(() => import('./pages/Search'));
const About = lazy(() => import('./pages/About'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Login = lazy(() => import('./pages/Login'));

export const AuthContext = createContext<{
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}>({
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadTime] = useState(() => performance.now());
  const navigate = useNavigate();
  const location = useLocation();
  const [pageVisible, setPageVisible] = useState(true);

  const login = useCallback(async (username: string, _password: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (username) {
      setIsAuthenticated(true);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  // Page transition: fade effect
  useEffect(() => {
    setPageVisible(false);
    const timer = setTimeout(() => setPageVisible(true), 20);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Benchmark hooks
  useEffect(() => {
    const hooks = {
      navigateTo: async (path: string): Promise<number> => {
        const start = performance.now();
        navigate(path);
        // Wait for paint
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => setTimeout(resolve, 0));
        });
        return performance.now() - start;
      },
      getLoadTime: () => loadTime,
    };
    (window as unknown as Record<string, unknown>).__benchmark = hooks;
    return () => {
      delete (window as unknown as Record<string, unknown>).__benchmark;
    };
  }, [navigate, loadTime]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      <div className="app-layout">
        <Sidebar isAuthenticated={isAuthenticated} onLogout={logout} />
        <main
          className="main-content"
          style={{
            opacity: pageVisible ? 1 : 0,
            transition: 'opacity 200ms ease',
          }}
        >
          <Suspense fallback={<LoadingSkeleton />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/table" element={<Table />} />
              <Route path="/form" element={<Form />} />
              <Route
                path="/profile"
                element={
                  <AuthGuard>
                    <Profile />
                  </AuthGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <AuthGuard>
                    <Settings />
                  </AuthGuard>
                }
              />
              <Route
                path="/notifications"
                element={
                  <AuthGuard>
                    <Notifications />
                  </AuthGuard>
                }
              />
              <Route path="/search" element={<Search />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
