import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { syncAuth } from './authSlice';

const initialRecord = {
  student: null,
  enrollments: [],
  certificates: [],
  isLoading: true,
  error: null,
};
const errorValue = (error) =>
  error == null
    ? null
    : {
        message: error.message,
        ...(error.status === undefined ? {} : { status: error.status }),
      };
export const refreshStudent = createAsyncThunk(
  'student/refresh',
  async (scope, { dispatch }) => {
    change(dispatch, scope, { error: null });
    const results = await Promise.allSettled([
      api.student.getProfile(),
      api.student.getEnrollments(),
      api.student.getCertificates(),
    ]);
    const next = {};
    ['student', 'enrollments', 'certificates'].forEach((key, index) => {
      const result = results[index];
      if (result.status === 'fulfilled')
        next[key] =
          index === 0
            ? result.value
            : Array.isArray(result.value)
              ? result.value
              : [];
      else {
        next[key] = index === 0 ? null : [];
        next.error = errorValue(result.reason);
      }
    });
    change(dispatch, scope, { ...next, isLoading: false });
  }
);
export const updateStudentProfile = (scope, updates) => async (dispatch) => {
  const updated = await api.student.updateProfile(updates);
  change(dispatch, scope, { student: updated });
  if (updated?.name) localStorage.setItem('user_name', updated.name);
  dispatch(syncAuth());
  return updated;
};
const studentSlice = createSlice({
  name: 'student',
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
export const { reset: resetStudent } = studentSlice.actions;
export default studentSlice.reducer;

export const selectStudent = (state, id) => state.student[id] || initialRecord;
const change = (dispatch, scope, changes) => {
  if (scope.mounted.current)
    dispatch(studentSlice.actions.changed({ id: scope.id, changes }));
};
