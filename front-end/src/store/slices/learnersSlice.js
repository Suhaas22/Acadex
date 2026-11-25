import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { storeSession, clearSession } from './authSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

export const fetchStudentProfile = createAsyncThunk(
  'learners/fetchStudentProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await api.student.getProfile();
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load student profile.');
    }
  }
);

export const updateStudentProfile = createAsyncThunk(
  'learners/updateStudentProfile',
  async (updates, { dispatch, rejectWithValue }) => {
    try {
      const updated = await api.student.updateProfile(updates);
      if (updated?.name) {
        dispatch(storeSession({ user_name: updated.name }));
      }
      return updated;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to save profile.');
    }
  }
);

export const fetchOrgLearners = createAsyncThunk(
  'learners/fetchOrgLearners',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.get('/workspace/organization/learners'));
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load learners.');
    }
  }
);

export const fetchOrgLearnerById = createAsyncThunk(
  'learners/fetchOrgLearnerById',
  async (id, { rejectWithValue }) => {
    try {
      return await api.get(
        `/workspace/organization/learners/${encodeURIComponent(id)}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load learner details.');
    }
  }
);

export const fetchInstructorLearnerById = createAsyncThunk(
  'learners/fetchInstructorLearnerById',
  async (id, { rejectWithValue }) => {
    try {
      return await api.get(
        `/workspace/instructor/learners/${encodeURIComponent(id)}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load learner progress.');
    }
  }
);

export const fetchLearners = createAsyncThunk(
  'learners/fetchAll',
  async (params = { limit: 1000 }, { rejectWithValue }) => {
    try {
      return extractItems(await api.learners.list(params));
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load learners.');
    }
  }
);

export const createLearner = createAsyncThunk(
  'learners/create',
  async (data, { rejectWithValue }) => {
    try {
      return await api.learners.create(data);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to create learner.');
    }
  }
);

export const updateLearner = createAsyncThunk(
  'learners/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await api.learners.update(id, data);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to update learner.');
    }
  }
);

export const deleteLearner = createAsyncThunk(
  'learners/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.learners.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to delete learner.');
    }
  }
);

const initialState = {
  studentProfile: createResourceState(null),
  orgLearners: createResourceState([]),
  orgLearnerDetail: createResourceState(null),
  instructorLearnerDetail: createResourceState(null),
  items: createResourceState([]),
  saving: false,
  actionError: '',
};

const learnersSlice = createSlice({
  name: 'learners',
  initialState,
  reducers: {
    clearLearnerDetail: (state) => {
      state.orgLearnerDetail = createResourceState(null);
      state.instructorLearnerDetail = createResourceState(null);
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(
      builder,
      fetchStudentProfile,
      (s) => s.studentProfile
    );
    bindResourceLifecycle(builder, fetchOrgLearners, (s) => s.orgLearners);
    bindResourceLifecycle(
      builder,
      fetchOrgLearnerById,
      (s) => s.orgLearnerDetail,
      { resetOnPending: true }
    );
    bindResourceLifecycle(
      builder,
      fetchInstructorLearnerById,
      (s) => s.instructorLearnerDetail,
      { resetOnPending: true }
    );
    bindResourceLifecycle(builder, fetchLearners, (s) => s.items);

    builder
      .addCase(updateStudentProfile.pending, (state) => {
        state.saving = true;
        state.actionError = '';
      })
      .addCase(updateStudentProfile.fulfilled, (state, action) => {
        state.saving = false;
        state.studentProfile.data = action.payload;
      })
      .addCase(updateStudentProfile.rejected, (state, action) => {
        state.saving = false;
        state.actionError =
          action.payload || action.error?.message || 'Unable to save profile.';
      })
      .addCase(createLearner.fulfilled, (state, action) => {
        if (Array.isArray(state.items.data) && action.payload) {
          state.items.data.unshift(action.payload);
        }
      })
      .addCase(updateLearner.fulfilled, (state, action) => {
        if (Array.isArray(state.items.data) && action.payload?.id) {
          state.items.data = state.items.data.map((l) =>
            l.id === action.payload.id ? action.payload : l
          );
        }
      })
      .addCase(deleteLearner.fulfilled, (state, action) => {
        if (Array.isArray(state.items.data)) {
          state.items.data = state.items.data.filter(
            (l) => l.id !== action.payload
          );
        }
      })
      .addCase(clearSession, () => initialState);
  },
});

export const { clearLearnerDetail } = learnersSlice.actions;

export default learnersSlice.reducer;
