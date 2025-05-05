import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRooms, createRoom, joinRoom, verifyRoomPassword } from '../services/api';
import PasswordModal from './PasswordModal';

const Dashboard = ({ username, onLogout }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    const getRooms = async () => {
      try {
        const result = await fetchRooms();
        if (result.success) {
          setRooms(result.data || []);
        } else {
          setError('Failed to load game rooms');
        }
      } catch (err) {
        setError('An error occurred while fetching rooms');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getRooms();
    // Set up interval to refresh rooms list
    const interval = setInterval(getRooms, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const handleCreateRoom = async (isPrivate) => {
    setCreatingRoom(true);
    try {
      const createResult = await createRoom(isPrivate);
      if (createResult.success) {
        // Get the room code from the creation response
        const roomCode = createResult.data.roomCode;
        
        // The backend automatically adds the creator to the room, so we don't need to join
        // Just navigate to the room with the creation data
        navigate(`/room/${roomCode}`, { 
          state: { 
            roomData: {
              code: roomCode,
              is_private: createResult.data.isPrivate,
              message: createResult.data.message
            } 
          } 
        });
      } else {
        setError('Failed to create room');
      }
    } catch (err) {
      setError('An error occurred while creating room');
      console.error(err);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (roomCode = null) => {
    const codeToJoin = roomCode || roomIdToJoin.trim();
    if (!codeToJoin) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Find the room in the list to check if it's private
      const roomToJoin = rooms.find(room => room.code === codeToJoin);
      
      if (roomToJoin && roomToJoin.is_private) {
        // For private rooms, show password modal
        setSelectedRoom(roomToJoin);
        setShowPasswordModal(true);
        setLoading(false);
        return;
      }
      
      // For public rooms, join directly
      const result = await joinRoom(codeToJoin);
      if (result.success) {
        navigate(`/room/${codeToJoin}`, { state: { roomData: result.data } });
        setRoomIdToJoin('');
      } else {
        setError(result.error || 'Failed to join room');
      }
    } catch (err) {
      setError('An error occurred while joining the room');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordSubmit = async (password) => {
    if (!selectedRoom) return;
    
    try {
      const result = await joinRoom(selectedRoom.code, password);
      if (result.success) {
        setShowPasswordModal(false);
        navigate(`/room/${selectedRoom.code}`, { state: { roomData: result.data } });
      } else {
        throw new Error(result.error || 'Invalid password');
      }
    } catch (err) {
      throw err;
    }
  };
  
  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedRoom(null);
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Trivia Games</h1>
        <div className="user-info">
          <span>Welcome, {username}!</span>
          <button onClick={onLogout} className="logout-btn">
            <i className='bx bx-log-out'></i>
            Logout
          </button>
        </div>
      </header>

      <main>
        <div className="room-actions">
          <form 
            className="join-room-form" 
            onSubmit={(e) => {
              e.preventDefault();
              handleJoinRoom();
            }}
          >
            <input 
              type="text" 
              placeholder="Enter Room Code" 
              value={roomIdToJoin}
              onChange={(e) => setRoomIdToJoin(e.target.value)}
            />
            <button 
              type="submit"
              className="join-room-btn"
              disabled={!roomIdToJoin.trim()}
            >
              <i className='bx bx-log-in'></i> Join Room
            </button>
          </form>
          
          <div className="create-room-buttons">
            <button 
              className="create-public-btn"
              onClick={() => handleCreateRoom(false)}
              disabled={creatingRoom}
            >
              <i className='bx bx-plus-circle'></i> Create Public Room
            </button>
            <button 
              className="create-private-btn"
              onClick={() => handleCreateRoom(true)}
              disabled={creatingRoom}
            >
              <i className='bx bx-lock-alt'></i> Create Private Room
            </button>
          </div>
        </div>
        
        <h2>Available Rooms</h2>
        
        {loading ? (
          <div className="loading">
            <i className='bx bx-loader-alt bx-spin'></i>
            <p>Loading games...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : rooms.length === 0 ? (
          <div className="no-rooms">
            <i className='bx bx-info-circle'></i>
            <p>No game rooms available. Check back later!</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room.code} className="room-card">
                <div className="room-header">
                  <h3>Room: {room.code}</h3>
                  {room.is_private ? (
                    <span className="private-badge">
                      <i className='bx bx-lock-alt'></i> Private
                    </span>
                  ) : (
                    <span className="public-badge">
                      <i className='bx bx-globe'></i> Public
                    </span>
                  )}
                </div>
                <div className="room-info">
                  <p><i className='bx bx-user'></i> Host: {room.host}</p>
                  <p><i className='bx bx-group'></i> Players: {room.player_count || 0}</p>
                  <p><i className='bx bx-info-circle'></i> Status: {room.started ? 'Game in progress' : 'Waiting for players'}</p>
                </div>
                <button 
                  className="join-btn"
                  onClick={() => handleJoinRoom(room.code)}
                >
                  <i className='bx bx-right-arrow-circle'></i> Join Game
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Password Modal */}
      <PasswordModal 
        isOpen={showPasswordModal}
        onClose={handleClosePasswordModal}
        onSubmit={handlePasswordSubmit}
        roomCode={selectedRoom?.code}
      />
    </div>
  );
};

export default Dashboard;