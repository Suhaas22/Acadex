import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

export const fetchOrgProfile = createAsyncThunk(
  'organizations/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await api.organization.get();
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load organization.');
    }
  }
);

export const updateOrgProfile = createAsyncThunk(
  'organizations/updateProfile',
  async (newInfo, { rejectWithValue }) => {
    try {
      return await api.organization.update(newInfo);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to update organization.');
    }
  }
);

export const fetchOrgStats = createAsyncThunk(
  'organizations/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await api.organization.getStats();
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load organization stats.'
      );
    }
  }
);

export const syncOrgCounts = createAsyncThunk(
  'organizations/syncCounts',
  async (_, { rejectWithValue }) => {
    try {
      const synced = await api.organization.syncCounts();
      if (!synced) return null;
      return await api.organization.get();
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to sync organization counts.'
      );
    }
  }
);

export const fetchInstitutions = createAsyncThunk(
  'organizations/fetchInstitutions',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.organization.listInstitutions());
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load institutions.');
    }
  }
);

export const verifyInstitution = createAsyncThunk(
  'organizations/verifyInstitution',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await api.organization.verifyInstitution(id, data);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to verify institution.');
    }
  }
);

const initialState = {
  profile: createResourceState(null),
  stats: createResourceState(null),
  institutions: createResourceState([]),
  saving: false,
  error: '',
};

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    bindResourceLifecycle(builder, fetchOrgProfile, (s) => s.profile);
    bindResourceLifecycle(builder, fetchOrgStats, (s) => s.stats);
    bindResourceLifecycle(builder, fetchInstitutions, (s) => s.institutions);

    builder
      .addCase(updateOrgProfile.pending, (state) => {
        state.saving = true;
        state.error = '';
      })
      .addCase(updateOrgProfile.fulfilled, (state, action) => {
        state.saving = false;
        state.profile.data = {
          ...(state.profile.data || {}),
          ...(action.payload || {}),
        };
      })
      .addCase(updateOrgProfile.rejected, (state, action) => {
        state.saving = false;
        state.error =
          action.payload || action.error?.message || 'Update failed.';
      })
      .addCase(syncOrgCounts.fulfilled, (state, action) => {
        if (action.payload) {
          state.profile.data = action.payload;
        }
      })
      .addCase(verifyInstitution.fulfilled, (state, action) => {
        if (Array.isArray(state.institutions.data) && action.payload?.id) {
          state.institutions.data = state.institutions.data.map((inst) =>
            inst.id === action.payload.id ? action.payload : inst
          );
        }
      })
      .addCase(clearSession, () => initialState);
  },
});

export default organizationsSlice.reducer;
