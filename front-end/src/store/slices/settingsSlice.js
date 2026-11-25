import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import { bindResourceLifecycle, createResourceState } from '../utils';

export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await api.settings.get();
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load settings.');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'settings/update',
  async (newSettings, { rejectWithValue }) => {
    try {
      return await api.settings.update(newSettings);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to update settings.');
    }
  }
);

export const resetDatabase = createAsyncThunk(
  'settings/resetDatabase',
  async (_, { rejectWithValue }) => {
    try {
      return await api.settings.resetDatabase();
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to reset database.');
    }
  }
);

const initialState = {
  ...createResourceState({}),
  saving: false,
  saveError: '',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    bindResourceLifecycle(builder, fetchSettings, (s) => s);

    builder
      .addCase(updateSettings.pending, (state) => {
        state.saving = true;
        state.saveError = '';
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.saving = false;
        state.data = { ...(state.data || {}), ...(action.payload || {}) };
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.saving = false;
        state.saveError =
          action.payload ||
          action.error?.message ||
          'Unable to update settings.';
      })
      .addCase(resetDatabase.pending, (state) => {
        state.saving = true;
        state.saveError = '';
      })
      .addCase(resetDatabase.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(resetDatabase.rejected, (state, action) => {
        state.saving = false;
        state.saveError =
          action.payload ||
          action.error?.message ||
          'Unable to reset database.';
      })
      .addCase(clearSession, () => initialState);
  },
});

export default settingsSlice.reducer;
