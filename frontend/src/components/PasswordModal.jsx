import { useState } from 'react';

const PasswordModal = ({ isOpen, onClose, onSubmit, roomCode }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      await onSubmit(password);
    } catch (err) {
      setError('Invalid password. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="password-modal">
        <div className="modal-header">
          <h2>Enter Room Password</h2>
          <button className="close-modal-btn" onClick={onClose}>
            <i className='bx bx-x'></i>
          </button>
        </div>
        
        <div className="modal-content">
          <p>This is a private room. Please enter the password to join Room: <strong>{roomCode}</strong></p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <i className='bx bx-lock-alt'></i>
              <input 
                type="password" 
                placeholder="Room Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <button 
              type="submit" 
              className="submit-password-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className='bx bx-loader-alt bx-spin'></i> Verifying...
                </>
              ) : (
                <>
                  <i className='bx bx-log-in'></i> Join Room
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;