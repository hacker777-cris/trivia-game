import { useState } from 'react';
import { loginUser } from '../services/api';

const LandingPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await loginUser(username);
      if (result.success) {
        onLogin(username);
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="hero-section">
        <h1>Trivia Challenge</h1>
        <p>Test your knowledge with fun trivia games!</p>
        
        <div className="login-container">
          <h2>Enter Username to Start</h2>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <i className='bx bx-user'></i>
              <input 
                type="text" 
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <i className='bx bx-loader-alt bx-spin'></i>
                  Logging in...
                </>
              ) : (
                <>
                  <i className='bx bx-right-arrow-alt'></i>
                  Start Playing
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;