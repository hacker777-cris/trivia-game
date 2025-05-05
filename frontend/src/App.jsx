import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'boxicons/css/boxicons.min.css';
import './App.css';

// Import API services
import { checkHealth } from './services/api';
import { getUsername, isAuthenticated, clearTokens } from './services/tokenService';

// Import components
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Room from './components/Room';

// Main App Component
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    // Check if user is already logged in using token service
    const storedUsername = getUsername();
    const authenticated = isAuthenticated();
    
    if (storedUsername && authenticated) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }

    // Check API health
    const checkApiHealth = async () => {
      try {
        const health = await checkHealth();
        setApiStatus(health.success ? 'online' : 'offline');
      } catch (err) {
        setApiStatus('offline');
        console.error(err);
      }
    };

    checkApiHealth();
  }, []);

  const handleLogin = (username) => {
    setIsLoggedIn(true);
    setUsername(username);
  };

  const handleLogout = () => {
    clearTokens();
    setIsLoggedIn(false);
    setUsername('');
  };

  if (apiStatus === 'checking') {
    return (
      <div className="api-checking">
        <i className='bx bx-loader-alt bx-spin'></i>
        <p>Connecting to server...</p>
      </div>
    );
  }

  if (apiStatus === 'offline') {
    return (
      <div className="api-offline">
        <i className='bx bx-error-circle'></i>
        <h2>Server Unavailable</h2>
        <p>The trivia game server is currently offline. Please try again later.</p>
        <button onClick={() => window.location.reload()}>Retry Connection</button>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            isLoggedIn ? 
            <Navigate to="/dashboard" /> : 
            <LandingPage onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isLoggedIn ? 
            <Dashboard username={username} onLogout={handleLogout} /> : 
            <Navigate to="/" />
          } 
        />
        <Route 
          path="/room/:roomId" 
          element={
            isLoggedIn ? 
            <Room username={username} /> : 
            <Navigate to="/" />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App
