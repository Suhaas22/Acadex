import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { storeSession, clearSession } from './authSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

export const fetchInstructorWorkspace = createAsyncThunk(
  'instructors/fetchWorkspace',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const workspace = await api.get('/workspace/instructor');
      if (workspace?.instructor?.id) {
        dispatch(
          storeSession({ nexuspay_instructor_id: workspace.instructor.id })
        );
      }
      return workspace;
    } catch (err) {
      return rejectWithValue(
        err.message || 'No instructor profile is linked to this account'
      );
    }
  }
);

export const fetchInstructors = createAsyncThunk(
  'instructors/fetchAll',
  async (params = { limit: 1000 }, { rejectWithValue }) => {
    try {
      return extractItems(await api.instructors.list(params));
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load instructors.');
    }
  }
);

export const fetchOrgInstructorById = createAsyncThunk(
  'instructors/fetchOrgInstructorById',
  async (id, { rejectWithValue }) => {
    try {
      return await api.get(
        `/workspace/organization/instructors/${encodeURIComponent(id)}`
      );
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load instructor details.'
      );
    }
  }
);

export const updateInstructorStatus = createAsyncThunk(
  'instructors/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const updated = await api.patch(
        `/instructors/${encodeURIComponent(id)}`,
        {
          status,
        }
      );
      const detail = await api.get(
        `/workspace/organization/instructors/${encodeURIComponent(id)}`
      );
      return { updated, detail };
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to update instructor status.'
      );
    }
  }
);

export const leaveOrganization = createAsyncThunk(
  'instructors/leaveOrganization',
  async (instructorId, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.instructors.leaveOrganization(instructorId);
      await dispatch(fetchInstructorWorkspace());
      return res;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to leave organization.');
    }
  }
);

const initialState = {
  workspace: createResourceState(null),
  items: createResourceState([]),
  selected: createResourceState(null),
  actionLoading: false,
  actionError: '',
};

const instructorsSlice = createSlice({
  name: 'instructors',
  initialState,
  reducers: {
    clearSelectedInstructor: (state) => {
      state.selected = createResourceState(null);
      state.actionError = '';
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(
      builder,
      fetchInstructorWorkspace,
      (s) => s.workspace
    );
    bindResourceLifecycle(builder, fetchInstructors, (s) => s.items);
    bindResourceLifecycle(builder, fetchOrgInstructorById, (s) => s.selected, {
      resetOnPending: true,
    });

    builder
      .addCase(updateInstructorStatus.pending, (state) => {
        state.actionLoading = true;
        state.actionError = '';
      })
      .addCase(updateInstructorStatus.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selected.data = action.payload.detail;
        const updated = action.payload.updated;
        if (Array.isArray(state.items.data) && updated?.id) {
          state.items.data = state.items.data.map((i) =>
            i.id === updated.id ? { ...i, ...updated } : i
          );
        }
      })
      .addCase(updateInstructorStatus.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError =
          action.payload || action.error?.message || 'Unable to update status.';
      })
      .addCase(leaveOrganization.pending, (state) => {
        state.actionLoading = true;
        state.actionError = '';
      })
      .addCase(leaveOrganization.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(leaveOrganization.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError =
          action.payload || action.error?.message || 'Action failed.';
      })
      .addCase(clearSession, () => initialState);
  },
});

export const { clearSelectedInstructor } = instructorsSlice.actions;

export default instructorsSlice.reducer;
