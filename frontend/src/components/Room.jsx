import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { joinRoom, leaveRoom, getRoomDetails } from '../services/api';

const Room = ({ username }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]);
  
  // Get room data and details
  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        // If no room data in state, attempt to join the room
        if (!location.state?.roomData) {
          const joinResult = await joinRoom(roomId);
          if (!joinResult.success) {
            setError('Failed to join room. Please try again.');
            setTimeout(() => navigate('/dashboard'), 3000); // Redirect after error
            return;
          }
        }
        
        // Get detailed room information including players
        const detailsResult = await getRoomDetails(roomId);
        if (detailsResult.success) {
          setRoomData(detailsResult.data);
          setPlayers(detailsResult.data.players || []);
        } else {
          setError('Failed to get room details. Please try again.');
          setTimeout(() => navigate('/dashboard'), 3000);
        }
      } catch (err) {
        setError('An error occurred while loading the room');
        setTimeout(() => navigate('/dashboard'), 3000);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
    
    // Set up interval to refresh room details
    const interval = setInterval(() => fetchRoomData(), 5000);
    return () => clearInterval(interval);
  }, [roomId, location.state, navigate]);

  const handleLeaveRoom = async () => {
    try {
      setLoading(true);
      const result = await leaveRoom(roomId);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Failed to leave room');
        setTimeout(() => navigate('/dashboard'), 3000);
      }
    } catch (err) {
      console.error('Error leaving room:', err);
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="room-loading">
        <i className='bx bx-loader-alt bx-spin'></i>
        <p>Loading room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-error">
        <i className='bx bx-error-circle'></i>
        <h2>Error</h2>
        <p>{error}</p>
        <p>Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="room-container">
      <header className="room-header-bar">
        <div className="room-info-header">
          <h1>Room: {roomId}</h1>
          <div className="room-status">
            {roomData?.is_private ? (
              <span className="private-badge">
                <i className='bx bx-lock-alt'></i> Private
              </span>
            ) : (
              <span className="public-badge">
                <i className='bx bx-globe'></i> Public
              </span>
            )}
          </div>
        </div>
        <button className="leave-room-btn" onClick={handleLeaveRoom}>
          <i className='bx bx-exit'></i> Leave Room
        </button>
      </header>

      <main className="room-content">
        <div className="players-section">
          <h2>Players</h2>
          <div className="players-list">
            {players.length > 0 ? (
              players.map((playerData, index) => (
                <div 
                  key={index} 
                  className={`player-item ${playerData.player === roomData?.host ? 'host' : ''}`}
                >
                  {playerData.player === roomData?.host ? (
                    <i className='bx bx-crown'></i>
                  ) : (
                    <i className='bx bx-user'></i>
                  )}
                  <span>
                    {playerData.player}
                    {playerData.player === roomData?.host ? ' (Host)' : ''}
                  </span>
                </div>
              ))
            ) : (
              <div className="no-players">
                <p>No players in this room</p>
              </div>
            )}
          </div>
        </div>

        <div className="game-section">
          <div className="waiting-for-game">
            <i className='bx bx-time'></i>
            <h2>Waiting for game to start</h2>
            <p>The host will start the game soon</p>
          </div>
          
          {roomData?.host === username && (
            <div className="host-controls">
              <button className="start-game-btn">
                <i className='bx bx-play'></i> Start Game
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Room;