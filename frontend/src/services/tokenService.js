// Token management service

// Constants for token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USERNAME_KEY = 'username';
const PLAYER_ID_KEY = 'player_id';

// Save tokens to localStorage
export const saveTokens = (authData) => {
  if (!authData) return false;
  
  // Store tokens and user data
  localStorage.setItem(ACCESS_TOKEN_KEY, authData.access);
  localStorage.setItem(REFRESH_TOKEN_KEY, authData.refresh);
  
  // Store user information
  if (authData.username) {
    localStorage.setItem(USERNAME_KEY, authData.username);
  }
  
  if (authData.player_id) {
    localStorage.setItem(PLAYER_ID_KEY, authData.player_id.toString());
  }
  
  return true;
};

// Get access token
export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

// Get refresh token
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

// Get username
export const getUsername = () => {
  return localStorage.getItem(USERNAME_KEY);
};

// Get player ID
export const getPlayerId = () => {
  return localStorage.getItem(PLAYER_ID_KEY);
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAccessToken();
};

// Clear all authentication data
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(PLAYER_ID_KEY);
};