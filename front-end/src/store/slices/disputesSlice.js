import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

export const fetchAdminDisputes = createAsyncThunk(
  'disputes/fetchAdminAll',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.get('/disputes?limit=1000'));
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load disputes.');
    }
  }
);

export const fetchAdminDisputeById = createAsyncThunk(
  'disputes/fetchAdminById',
  async (id, { rejectWithValue }) => {
    try {
      return await api.get(`/disputes/${encodeURIComponent(id)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load dispute details.');
    }
  }
);

export const transitionDispute = createAsyncThunk(
  'disputes/transition',
  async ({ disputeId, status, note }, { rejectWithValue }) => {
    try {
      return await api.post(
        `/admin/disputes/${encodeURIComponent(disputeId)}/transition`,
        { status, note }
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to update dispute status.');
    }
  }
);

export const addAdminDisputeComment = createAsyncThunk(
  'disputes/addAdminComment',
  async ({ disputeId, message }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      let author =
        state.users?.workspaceSession?.data?.name ||
        state.auth?.user_name ||
        '';
      if (!author) {
        const session = await api.get('/workspace/session');
        author = session?.name || 'Administrator';
      }
      return await api.post(
        `/disputes/${encodeURIComponent(disputeId)}/comments`,
        { author, message, isAdmin: true }
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to add comment.');
    }
  }
);

export const fetchStudentDisputes = createAsyncThunk(
  'disputes/fetchStudentAll',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.get('/student/disputes'));
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load support requests.');
    }
  }
);

export const fetchStudentDisputeCategories = createAsyncThunk(
  'disputes/fetchStudentCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/student/dispute-categories');
      return Array.isArray(res) ? res : [];
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load categories.');
    }
  }
);

export const fetchStudentDisputeById = createAsyncThunk(
  'disputes/fetchStudentById',
  async (disputeId, { rejectWithValue }) => {
    try {
      return await api.get(
        `/student/disputes/${encodeURIComponent(disputeId)}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load support case.');
    }
  }
);

export const createStudentDispute = createAsyncThunk(
  'disputes/createStudent',
  async (form, { rejectWithValue }) => {
    try {
      return await api.post('/student/disputes', form);
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to create support request.'
      );
    }
  }
);

export const addStudentDisputeComment = createAsyncThunk(
  'disputes/addStudentComment',
  async ({ disputeId, message }, { rejectWithValue }) => {
    try {
      await api.post(
        `/student/disputes/${encodeURIComponent(disputeId)}/comments`,
        { message }
      );
      return await api.get(
        `/student/disputes/${encodeURIComponent(disputeId)}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to send message.');
    }
  }
);

export const fetchOrgSupport = createAsyncThunk(
  'disputes/fetchOrgSupport',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/workspace/organization/support');
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load support requests.');
    }
  }
);

export const createOrgSupport = createAsyncThunk(
  'disputes/createOrgSupport',
  async (form, { dispatch, rejectWithValue }) => {
    try {
      const created = await api.post('/workspace/organization/support', form);
      await dispatch(fetchOrgSupport());
      return created;
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to submit support request.'
      );
    }
  }
);

const initialState = {
  adminDisputes: createResourceState([]),
  studentDisputes: createResourceState([]),
  orgSupport: createResourceState(null),
  categories: createResourceState([]),
  selected: createResourceState(null),
  saving: false,
  actionError: '',
};

const disputesSlice = createSlice({
  name: 'disputes',
  initialState,
  reducers: {
    clearSelectedDispute: (state) => {
      state.selected = createResourceState(null);
      state.actionError = '';
    },
    clearDisputeError: (state) => {
      state.actionError = '';
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(builder, fetchAdminDisputes, (s) => s.adminDisputes);
    bindResourceLifecycle(
      builder,
      fetchStudentDisputes,
      (s) => s.studentDisputes
    );
    bindResourceLifecycle(builder, fetchOrgSupport, (s) => s.orgSupport);
    bindResourceLifecycle(
      builder,
      fetchStudentDisputeCategories,
      (s) => s.categories
    );
    bindResourceLifecycle(builder, fetchAdminDisputeById, (s) => s.selected);
    bindResourceLifecycle(builder, fetchStudentDisputeById, (s) => s.selected, {
      resetOnPending: true,
    });

    const startSaving = (state) => {
      state.saving = true;
      state.actionError = '';
    };
    const failSaving = (state, action) => {
      state.saving = false;
      state.actionError =
        action.payload || action.error?.message || 'Unable to update dispute.';
    };
    const syncDisputeInAdminList = (state, updated) => {
      if (!updated?.id || !Array.isArray(state.adminDisputes.data)) return;
      state.adminDisputes.data = state.adminDisputes.data.map((d) =>
        d.id === updated.id ? { ...d, ...updated } : d
      );
    };

    builder
      .addCase(transitionDispute.pending, startSaving)
      .addCase(transitionDispute.fulfilled, (state, action) => {
        state.saving = false;
        state.selected.data = action.payload;
        syncDisputeInAdminList(state, action.payload);
      })
      .addCase(transitionDispute.rejected, failSaving)

      .addCase(addAdminDisputeComment.pending, startSaving)
      .addCase(addAdminDisputeComment.fulfilled, (state, action) => {
        state.saving = false;
        state.selected.data = action.payload;
        syncDisputeInAdminList(state, action.payload);
      })
      .addCase(addAdminDisputeComment.rejected, failSaving)

      .addCase(createStudentDispute.pending, startSaving)
      .addCase(createStudentDispute.fulfilled, (state, action) => {
        state.saving = false;
        if (action.payload?.id && Array.isArray(state.studentDisputes.data)) {
          state.studentDisputes.data = [
            action.payload,
            ...state.studentDisputes.data,
          ];
        }
      })
      .addCase(createStudentDispute.rejected, failSaving)

      .addCase(addStudentDisputeComment.pending, startSaving)
      .addCase(addStudentDisputeComment.fulfilled, (state, action) => {
        state.saving = false;
        state.selected.data = action.payload;
      })
      .addCase(addStudentDisputeComment.rejected, failSaving)

      .addCase(createOrgSupport.pending, startSaving)
      .addCase(createOrgSupport.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(createOrgSupport.rejected, failSaving)

      .addCase(clearSession, () => initialState);
  },
});

export const { clearSelectedDispute, clearDisputeError } =
  disputesSlice.actions;

export default disputesSlice.reducer;
