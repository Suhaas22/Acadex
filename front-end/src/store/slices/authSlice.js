import { createSlice } from '@reduxjs/toolkit';
import { api } from '../../services/api';

const keys = [
  'nexuspay_auth_token',
  'auth_token',
  'nexuspay_student_token',
  'user_id',
  'nexuspay_user_id',
  'user_role',
  'nexuspay_active_role',
  'user_name',
  'user_email',
  'nexuspay_user_email',
  'user_organization_id',
  'user_organization_name',
  'nexuspay_instructor_id',
];

export const readAuthStorage = () =>
  Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
const authSlice = createSlice({
  name: 'auth',
  initialState: readAuthStorage,
  reducers: {
    mirrored: (state, action) => {
      for (const key of keys) state[key] = action.payload[key];
    },
  },
});
export const syncAuth = () => (dispatch) =>
  dispatch(authSlice.actions.mirrored(readAuthStorage()));
export const storeSession =
  (values, emptyNullish = false) =>
  (dispatch) => {
    for (const [key, value] of Object.entries(values)) {
      localStorage.setItem(key, String(emptyNullish ? (value ?? '') : value));
    }
    dispatch(syncAuth());
  };
// The router commits the sign-out destination before the mirror updates.
export const clearSession = (keys) => () => {
  keys.forEach((key) => localStorage.removeItem(key));
};

// Keep credentials in the request closure, outside Redux state and action logs.
export const login = (email, password) => () => api.auth.login(email, password);
export const register = (form) => () => api.auth.register(form);
export const requestPasswordReset = (email) => () =>
  api.auth.requestPasswordReset(email);
export const resetPassword = (email, code, password) => () =>
  api.auth.resetPassword(email, code, password);
export default authSlice.reducer;
