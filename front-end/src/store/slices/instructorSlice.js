import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { syncAuth } from './authSlice';

const initialRecord = {
  instructor: null,
  invitations: [],
  joinRequests: [],
  assignedCourses: [],
  loading: true,
  actionLoading: false,
  error: null,
};
const itemsOf = (res) => (Array.isArray(res) ? res : res?.items || []);
export const refreshInstructor = createAsyncThunk(
  'instructor/refresh',
  async (scope, { dispatch }) => {
    change(dispatch, scope, { error: null });
    try {
      const workspace = await api.get('/workspace/instructor');
      const me = workspace.instructor;
      if (!me)
        throw new Error('No instructor profile is linked to this account');
      change(dispatch, scope, { instructor: me });
      localStorage.setItem('nexuspay_instructor_id', me.id);
      dispatch(syncAuth());
      const [invRes, joinRes, coursesRes] = await Promise.allSettled([
        api.instructorRequests.list({ instructorId: me.id, limit: 1000 }),
        api.instructorRequests.myJoinRequests(),
        Promise.resolve(workspace.courses),
      ]);
      change(dispatch, scope, {
        invitations: invRes.status === 'fulfilled' ? itemsOf(invRes.value) : [],
        joinRequests:
          joinRes.status === 'fulfilled' ? itemsOf(joinRes.value) : [],
        assignedCourses:
          coursesRes.status === 'fulfilled' ? itemsOf(coursesRes.value) : [],
      });
    } catch (err) {
      change(dispatch, scope, {
        instructor: null,
        assignedCourses: [],
        error: err.message,
      });
    } finally {
      change(dispatch, scope, { loading: false });
    }
  }
);
const run = (scope, fn) => async (dispatch) => {
  change(dispatch, scope, { actionLoading: true });
  try {
    const result = await fn();
    await dispatch(refreshInstructor(scope)).unwrap();
    return result;
  } finally {
    change(dispatch, scope, { actionLoading: false });
  }
};
export const respondInvitation = (scope, id, decision, notes) =>
  run(scope, () => api.instructorRequests.respond(id, decision, notes));
export const leaveOrganization = (scope, instructor) =>
  run(scope, () => api.instructors.leaveOrganization(instructor.id));
const instructorSlice = createSlice({
  name: 'instructor',
  initialState: {},
  reducers: {
    changed: (state, { payload: { id, changes } }) => {
      state[id] = { ...(state[id] || initialRecord), ...changes };
    },
    reset: (state, action) => {
      delete state[action.payload];
    },
  },
});
const change = (dispatch, scope, changes) => {
  if (scope.mounted.current)
    dispatch(instructorSlice.actions.changed({ id: scope.id, changes }));
};
export const { reset: resetInstructor } = instructorSlice.actions;
export default instructorSlice.reducer;
export const selectInstructor = createSelector(
  [(state, id) => state.instructor[id] || initialRecord],
  (state) => {
    const {
      instructor,
      invitations,
      assignedCourses,
      loading,
      actionLoading,
      error,
    } = state;
    const isAffiliated =
      Boolean(instructor?.organizationId) && instructor?.status === 'Active';
    const pendingOrgInvitations = invitations.filter(
      (i) =>
        /pending|sent/i.test(i.status || '') &&
        (i.type === 'org-invitation' ||
          !i.courseId ||
          i.courseTitle === 'General Course Assignment')
    );
    const pendingCourseRequests = [];
    return {
      instructor,
      isAffiliated,
      invitations,
      pendingCourseRequests,
      pendingOrgInvitations,
      pendingCount: isAffiliated
        ? pendingCourseRequests.length
        : pendingOrgInvitations.length,
      assignedCourses,
      loading,
      actionLoading,
      error,
    };
  }
);
