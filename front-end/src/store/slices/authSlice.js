import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

const STORAGE_KEYS = [
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
  Object.fromEntries(
    STORAGE_KEYS.map((key) => [key, localStorage.getItem(key)])
  );

const initialState = () => ({
  ...readAuthStorage(),
  loading: false,
  error: '',
});

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      return await api.auth.login(email, password);
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to sign in. Please try again.'
      );
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (form, { rejectWithValue }) => {
    try {
      return await api.auth.register(form);
    } catch (err) {
      return rejectWithValue(err.message || 'Could not create your account.');
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword, userId }, { rejectWithValue }) => {
    try {
      return await api.auth.changePassword(
        currentPassword,
        newPassword,
        userId
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to change password.');
    }
  }
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email, { rejectWithValue }) => {
    try {
      return await api.auth.requestPasswordReset(email);
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to start password recovery. Please try again.'
      );
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, code, password }, { rejectWithValue }) => {
    try {
      return await api.auth.resetPassword(email, code, password);
    } catch (err) {
      return rejectWithValue(
        err.message ||
          'Unable to reset your password. Please check the code and try again.'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    mirrored: (state, action) => {
      for (const key of STORAGE_KEYS) {
        state[key] = action.payload[key] ?? null;
      }
    },
    sessionStored: (state, action) => {
      const { values, emptyNullish = false } = action.payload;
      for (const [key, value] of Object.entries(values)) {
        const stringVal = String(emptyNullish ? (value ?? '') : value);
        localStorage.setItem(key, stringVal);
        if (STORAGE_KEYS.includes(key)) {
          state[key] = stringVal;
        }
      }
    },
    sessionCleared: (state, action) => {
      const keys = Array.isArray(action.payload)
        ? action.payload
        : STORAGE_KEYS;
      keys.forEach((key) => {
        localStorage.removeItem(key);
        if (STORAGE_KEYS.includes(key)) {
          state[key] = null;
        }
      });
    },
    authErrorCleared: (state) => {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    const startPending = (state) => {
      state.loading = true;
      state.error = '';
    };
    const stopFulfilled = (state) => {
      state.loading = false;
    };
    const handleRejected = (state, action) => {
      state.loading = false;
      state.error =
        action.payload || action.error?.message || 'Request failed.';
    };

    builder
      .addCase(login.pending, startPending)
      .addCase(login.fulfilled, stopFulfilled)
      .addCase(login.rejected, handleRejected)
      .addCase(register.pending, startPending)
      .addCase(register.fulfilled, stopFulfilled)
      .addCase(register.rejected, handleRejected)
      .addCase(changePassword.pending, startPending)
      .addCase(changePassword.fulfilled, stopFulfilled)
      .addCase(changePassword.rejected, handleRejected)
      .addCase(requestPasswordReset.pending, startPending)
      .addCase(requestPasswordReset.fulfilled, stopFulfilled)
      .addCase(requestPasswordReset.rejected, handleRejected)
      .addCase(resetPassword.pending, startPending)
      .addCase(resetPassword.fulfilled, stopFulfilled)
      .addCase(resetPassword.rejected, handleRejected);
  },
});

export const { mirrored, sessionStored, sessionCleared, authErrorCleared } =
  authSlice.actions;

export const syncAuth = () => (dispatch) =>
  dispatch(mirrored(readAuthStorage()));

export const storeSession = (values, emptyNullish = false) =>
  sessionStored({ values, emptyNullish });

export const clearSession = (keys = STORAGE_KEYS) => sessionCleared(keys);

export default authSlice.reducer;
