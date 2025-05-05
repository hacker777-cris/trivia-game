// API service for handling authentication and game rooms
const API_URL = 'http://localhost:8000/api/v1';

import axios from 'axios';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './tokenService';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          // No refresh token available, logout user
          clearTokens();
          return Promise.reject(error);
        }
        
        // Call token refresh endpoint
        const response = await axios.post(`${API_URL}/auth/refresh/`, {
          refresh: refreshToken
        });
        
        // Save the new tokens
        if (response.data && response.data.access) {
          saveTokens(response.data);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, logout user
        clearTokens();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API functions
export const loginUser = async (username) => {
  try {
    const response = await apiClient.post('/auth/username/', { username });
    
    // Handle the response with access and refresh tokens
    if (response.data) {
      // Save tokens and user data
      const authData = {
        ...response.data,
        username // Ensure username is included in saved data
      };
      
      saveTokens(authData);
      return { success: true, data: response.data };
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.response?.data || 'Login failed' };
  }
};

export const fetchRooms = async () => {
  try {
    const response = await apiClient.get('/rooms/');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return { success: false, error: error.response?.data || 'Failed to fetch rooms' };
  }
};

export const createRoom = async (isPrivate) => {
  try {
    const response = await apiClient.post('/rooms/create/', { is_private: isPrivate });
    return { 
      success: true, 
      data: {
        roomCode: response.data.code,
        isPrivate: response.data.is_private,
        message: response.data.message
      } 
    };
  } catch (error) {
    console.error('Error creating room:', error);
    return { success: false, error: error.response?.data || 'Failed to create room' };
  }
};

export const joinRoom = async (roomCode) => {
  try {
    const response = await apiClient.post(`/rooms/${roomCode}/join/`);
    return { 
      success: true, 
      data: {
        message: response.data.message,
        roomCode: roomCode
      } 
    };
  } catch (error) {
    console.error('Error joining room:', error);
    // Handle specific error cases based on status codes
    if (error.response?.status === 404) {
      return { success: false, error: 'Room not found' };
    } else if (error.response?.status === 400 && error.response.data?.error === 'Game has already started.') {
      return { success: false, error: 'Game has already started' };
    }
    return { success: false, error: error.response?.data?.error || 'Failed to join room' };
  }
};

export const leaveRoom = async (roomCode) => {
  try {
    const response = await apiClient.post(`/rooms/${roomCode}/leave/`);
    return { 
      success: true, 
      data: {
        message: response.data.message,
        roomDeleted: response.data.message.includes('Room deleted')
      } 
    };
  } catch (error) {
    console.error('Error leaving room:', error);
    // Handle specific error cases
    if (error.response?.status === 404) {
      return { success: false, error: 'Room not found or you are not in this room' };
    }
    return { success: false, error: error.response?.data?.error || 'Failed to leave room' };
  }
};

export const getRoomDetails = async (roomCode) => {
  try {
    const response = await apiClient.get(`/rooms/${roomCode}/detail/`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error getting room details:', error);
    return { success: false, error: error.response?.data?.error || 'Failed to get room details' };
  }
};

export const getRoomStatus = async (roomCode) => {
  try {
    const response = await apiClient.get(`/rooms/${roomCode}/status/`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error getting room status:', error);
    return { success: false, error: error.response?.data?.error || 'Failed to get room status' };
  }
};

export const verifyRoomPassword = async (roomCode, password) => {
  try {
    const response = await apiClient.post(`/rooms/${roomCode}/verify-password/`, { password });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error verifying room password:', error);
    return { success: false, error: error.response?.data || 'Invalid password' };
  }
};

export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Health check failed:', error);
    return { success: false, error: 'API server is not responding' };
  }
};