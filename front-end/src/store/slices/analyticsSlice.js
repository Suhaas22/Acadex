import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import { bindResourceLifecycle, createResourceState } from '../utils';

export const fetchWorkspaceOverview = createAsyncThunk(
  'analytics/fetchWorkspaceOverview',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/workspace/overview');
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load overview.');
    }
  }
);

export const fetchOrgAnalytics = createAsyncThunk(
  'analytics/fetchOrgAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/analytics/organization');
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load organization analytics.'
      );
    }
  }
);

export const fetchAdminOverview = createAsyncThunk(
  'analytics/fetchAdminOverview',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/admin/overview');
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load admin overview.');
    }
  }
);

export const fetchSuperAdminExecutive = createAsyncThunk(
  'analytics/fetchSuperAdminExecutive',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/admin/executive');
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load executive overview.'
      );
    }
  }
);

export const fetchAdminHistory = createAsyncThunk(
  'analytics/fetchAdminHistory',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await api.get(`/admin/history?${new URLSearchParams(params)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load admin activity.');
    }
  }
);

export const fetchHistoryAdminOptions = createAsyncThunk(
  'analytics/fetchHistoryAdminOptions',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await api.get(
        `/admin/history/options?${new URLSearchParams({ type: 'administrator', ...params })}`
      );
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load administrator options.'
      );
    }
  }
);

export const fetchHistoryCourseOptions = createAsyncThunk(
  'analytics/fetchHistoryCourseOptions',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await api.get(
        `/admin/history/options?${new URLSearchParams({ type: 'course', ...params })}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load course options.');
    }
  }
);

export const fetchLogs = createAsyncThunk(
  'analytics/fetchLogs',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await api.get(`/workspace/logs?${new URLSearchParams(params)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load logs.');
    }
  }
);

export const fetchLogById = createAsyncThunk(
  'analytics/fetchLogById',
  async (id, { rejectWithValue }) => {
    try {
      return await api.get(`/workspace/logs/${encodeURIComponent(id)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load log details.');
    }
  }
);

const initialState = {
  workspaceOverview: createResourceState(null),
  orgAnalytics: createResourceState(null),
  adminOverview: createResourceState(null),
  superAdminExecutive: createResourceState(null),
  adminHistory: createResourceState(null),
  historyAdminOptions: createResourceState(null),
  historyCourseOptions: createResourceState(null),
  logs: createResourceState(null),
  selectedLog: createResourceState(null),
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    bindResourceLifecycle(
      builder,
      fetchWorkspaceOverview,
      (s) => s.workspaceOverview
    );
    bindResourceLifecycle(builder, fetchOrgAnalytics, (s) => s.orgAnalytics);
    bindResourceLifecycle(builder, fetchAdminOverview, (s) => s.adminOverview);
    bindResourceLifecycle(
      builder,
      fetchSuperAdminExecutive,
      (s) => s.superAdminExecutive
    );
    bindResourceLifecycle(builder, fetchAdminHistory, (s) => s.adminHistory);
    bindResourceLifecycle(
      builder,
      fetchHistoryAdminOptions,
      (s) => s.historyAdminOptions
    );
    bindResourceLifecycle(
      builder,
      fetchHistoryCourseOptions,
      (s) => s.historyCourseOptions
    );
    bindResourceLifecycle(builder, fetchLogs, (s) => s.logs);
    bindResourceLifecycle(builder, fetchLogById, (s) => s.selectedLog, {
      resetOnPending: true,
    });

    builder.addCase(clearSession, () => initialState);
  },
});

export default analyticsSlice.reducer;
