import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import { fetchInstructorWorkspace } from './instructorsSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

export const fetchMyInvitations = createAsyncThunk(
  'instructorRequests/fetchMyInvitations',
  async (instructorId, { rejectWithValue }) => {
    try {
      return extractItems(
        await api.instructorRequests.list({ instructorId, limit: 1000 })
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load invitations.');
    }
  }
);

export const fetchMyJoinRequests = createAsyncThunk(
  'instructorRequests/fetchMyJoinRequests',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.instructorRequests.myJoinRequests());
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load join requests.');
    }
  }
);

export const respondInvitation = createAsyncThunk(
  'instructorRequests/respondInvitation',
  async (
    { id, decision, notes, instructorId },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const updated = await api.instructorRequests.respond(id, decision, notes);
      await dispatch(fetchInstructorWorkspace());
      if (instructorId) {
        await dispatch(fetchMyInvitations(instructorId));
      }
      return updated;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to respond to invitation.');
    }
  }
);

export const fetchTeachingAssignments = createAsyncThunk(
  'instructorRequests/fetchTeachingAssignments',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/workspace/organization/teaching-assignments');
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load teaching assignments.'
      );
    }
  }
);

export const fetchIncomingJoinRequests = createAsyncThunk(
  'instructorRequests/fetchIncomingJoinRequests',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.instructorRequests.incomingJoinRequests());
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load join requests.');
    }
  }
);

export const fetchAllInstructorRequests = createAsyncThunk(
  'instructorRequests/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.instructorRequests.list({ limit: 1000 }));
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load requests.');
    }
  }
);

export const lookupInstructorByEmail = createAsyncThunk(
  'instructorRequests/lookupByEmail',
  async (email, { rejectWithValue }) => {
    try {
      return await api.get(
        `/workspace/organization/invitation-lookup?${new URLSearchParams({ email })}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Instructor not found.');
    }
  }
);

export const sendInvitation = createAsyncThunk(
  'instructorRequests/sendInvitation',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const created = await api.instructorRequests.create(payload);
      await dispatch(fetchTeachingAssignments());
      return created;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to send invitation.');
    }
  }
);

export const resendInvitation = createAsyncThunk(
  'instructorRequests/resendInvitation',
  async (requestId, { rejectWithValue }) => {
    try {
      return await api.instructorRequests.resend(requestId);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to resend invitation.');
    }
  }
);

export const withdrawInvitation = createAsyncThunk(
  'instructorRequests/withdrawInvitation',
  async ({ requestId, reason }, { rejectWithValue }) => {
    try {
      return await api.instructorRequests.withdraw(requestId, reason);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to withdraw invitation.');
    }
  }
);

export const decideJoinRequest = createAsyncThunk(
  'instructorRequests/decideJoinRequest',
  async ({ requestId, action, notes }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await api.instructorRequests.decideJoinRequest(
        requestId,
        action,
        notes
      );
      await Promise.allSettled([
        dispatch(fetchIncomingJoinRequests()),
        dispatch(fetchTeachingAssignments()),
      ]);
      return updated;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to decide join request.');
    }
  }
);

const initialState = {
  invitations: createResourceState([]),
  joinRequests: createResourceState([]),
  incomingJoinRequests: createResourceState([]),
  allRequests: createResourceState([]),
  teachingAssignments: createResourceState(null),
  lookup: createResourceState(null),
  actionLoading: false,
  actionError: '',
};

const instructorRequestsSlice = createSlice({
  name: 'instructorRequests',
  initialState,
  reducers: {
    clearInstructorLookup: (state) => {
      state.lookup = createResourceState(null);
      state.actionError = '';
    },
    clearRequestActionError: (state) => {
      state.actionError = '';
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(builder, fetchMyInvitations, (s) => s.invitations);
    bindResourceLifecycle(builder, fetchMyJoinRequests, (s) => s.joinRequests);
    bindResourceLifecycle(
      builder,
      fetchIncomingJoinRequests,
      (s) => s.incomingJoinRequests
    );
    bindResourceLifecycle(
      builder,
      fetchAllInstructorRequests,
      (s) => s.allRequests
    );
    bindResourceLifecycle(
      builder,
      fetchTeachingAssignments,
      (s) => s.teachingAssignments
    );
    bindResourceLifecycle(builder, lookupInstructorByEmail, (s) => s.lookup, {
      resetOnPending: true,
    });

    const startAction = (state) => {
      state.actionLoading = true;
      state.actionError = '';
    };
    const failAction = (state, action) => {
      state.actionLoading = false;
      state.actionError =
        action.payload || action.error?.message || 'Action failed.';
    };
    const updateItemInList = (list, updated) => {
      if (!Array.isArray(list) || !updated?.id) return list;
      return list.map((item) => (item.id === updated.id ? updated : item));
    };

    builder
      .addCase(respondInvitation.pending, startAction)
      .addCase(respondInvitation.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.invitations.data = updateItemInList(
          state.invitations.data,
          action.payload
        );
      })
      .addCase(respondInvitation.rejected, failAction)

      .addCase(sendInvitation.pending, startAction)
      .addCase(sendInvitation.fulfilled, (state) => {
        state.actionLoading = false;
        state.lookup.data = null;
      })
      .addCase(sendInvitation.rejected, failAction)

      .addCase(resendInvitation.pending, startAction)
      .addCase(resendInvitation.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.allRequests.data = updateItemInList(
          state.allRequests.data,
          action.payload
        );
        if (state.teachingAssignments.data?.invitations) {
          state.teachingAssignments.data.invitations = updateItemInList(
            state.teachingAssignments.data.invitations,
            action.payload
          );
        }
      })
      .addCase(resendInvitation.rejected, failAction)

      .addCase(withdrawInvitation.pending, startAction)
      .addCase(withdrawInvitation.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.allRequests.data = updateItemInList(
          state.allRequests.data,
          action.payload
        );
        if (state.teachingAssignments.data?.invitations) {
          state.teachingAssignments.data.invitations = updateItemInList(
            state.teachingAssignments.data.invitations,
            action.payload
          );
        }
      })
      .addCase(withdrawInvitation.rejected, failAction)

      .addCase(decideJoinRequest.pending, startAction)
      .addCase(decideJoinRequest.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.incomingJoinRequests.data = updateItemInList(
          state.incomingJoinRequests.data,
          action.payload
        );
      })
      .addCase(decideJoinRequest.rejected, failAction)

      .addCase(clearSession, () => initialState);
  },
});

export const { clearInstructorLookup, clearRequestActionError } =
  instructorRequestsSlice.actions;

export const selectPendingOrgInvitations = createSelector(
  [(state) => state.instructorRequests.invitations.data || []],
  (invitations) =>
    invitations.filter(
      (i) =>
        /pending|sent/i.test(i.status || '') &&
        (i.type === 'org-invitation' ||
          !i.courseId ||
          i.courseTitle === 'General Course Assignment')
    )
);

export default instructorRequestsSlice.reducer;
