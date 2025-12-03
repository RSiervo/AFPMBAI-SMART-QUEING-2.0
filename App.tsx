
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { QueueProvider } from './context/QueueContext';
import Kiosk from './components/Kiosk';
import StaffDashboard from './components/StaffDashboard';
import PublicMonitor from './components/PublicMonitor';
import { Monitor, Tv, Settings } from 'lucide-react';

const GlobalKeyListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  return null;
};

const AfpmbaiLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left Top */}
    <path d="M98 10 L60 50 V110 L98 140 V10 Z" fill="#16a34a" />
    {/* Right Top */}
    <path d="M102 10 L140 50 V110 L102 140 V10 Z" fill="#15803d" />
    
    {/* Left Bottom */}
    <path d="M56 110 H10 L10 150 L50 190 H94 V144 L56 110 Z" fill="#16a34a" />
    {/* Right Bottom */}
    <path d="M144 110 H190 L190 150 L150 190 H106 V144 L144 110 Z" fill="#15803d" />
  </svg>
);

const Navigation = () => {
  const location = useLocation();
  
  if (location.pathname !== '/') return null;

  return (
    <div className="h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center p-4 overflow-hidden font-sans">
      <div className="max-w-4xl w-full text-center mb-6 lg:mb-8 flex flex-col items-center shrink-0">
        <div className="w-20 h-20 lg:w-24 lg:h-24 mb-4 drop-shadow-xl animate-fade-in">
           <AfpmbaiLogo className="w-full h-full" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-afpmbai-900 mb-1 tracking-tight animate-fade-in delay-100">AFPMBAI</h1>
        <h2 className="text-lg lg:text-xl font-medium text-afpmbai-700 tracking-widest uppercase animate-fade-in delay-200">Smart Queuing System</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-5xl w-full px-4 animate-fade-in delay-300">
        <Link to="/kiosk" className="group bg-white rounded-2xl p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-green-100 flex flex-col items-center">
          <div className="bg-green-100 p-4 lg:p-5 rounded-full mb-4 group-hover:bg-green-500 group-hover:text-white transition-colors text-green-700">
            <Tv size={32} className="lg:w-10 lg:h-10" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-1">Kiosk</h2>
          <p className="text-gray-500 text-center text-sm lg:text-base">Customer touch interface for ticket generation</p>
          <span className="mt-4 text-green-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center text-sm lg:text-base">
            Launch Kiosk &rarr;
          </span>
        </Link>

        <Link to="/staff" className="group bg-white rounded-2xl p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-green-100 flex flex-col items-center">
          <div className="bg-blue-100 p-4 lg:p-5 rounded-full mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors text-blue-700">
            <Settings size={32} className="lg:w-10 lg:h-10" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-1">Staff Portal</h2>
          <p className="text-gray-500 text-center text-sm lg:text-base">Dashboard for calling and managing tickets</p>
          <span className="mt-4 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center text-sm lg:text-base">
            Login &rarr;
          </span>
        </Link>

        <Link to="/monitor" className="group bg-white rounded-2xl p-6 lg:p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 border border-green-100 flex flex-col items-center">
          <div className="bg-purple-100 p-4 lg:p-5 rounded-full mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors text-purple-700">
            <Monitor size={32} className="lg:w-10 lg:h-10" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-1">Public Monitor</h2>
          <p className="text-gray-500 text-center text-sm lg:text-base">Large screen display for waiting list and status</p>
          <span className="mt-4 text-purple-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center text-sm lg:text-base">
            Open Display &rarr;
          </span>
        </Link>
      </div>

      <div className="mt-8 lg:mt-12 text-gray-400 text-xs lg:text-sm animate-fade-in delay-500 shrink-0">
        &copy; 2024 AFPMBAI System Demo <span className="mx-2">|</span> Press <span className="font-bold border px-1 rounded">ESC</span> to return here anytime
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueueProvider>
      <Router>
        <GlobalKeyListener />
        <Routes>
          <Route path="/" element={<Navigation />} />
          <Route path="/kiosk" element={<Kiosk />} />
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/monitor" element={<PublicMonitor />} />
        </Routes>
      </Router>
    </QueueProvider>
  );
};

export default App;
