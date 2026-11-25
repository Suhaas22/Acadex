import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import { fetchStudentProfile } from './learnersSlice';
import { fetchStudentCertificates } from './certificatesSlice';
import { createResourceState } from '../utils';

export const fetchStudentEnrollments = createAsyncThunk(
  'enrollments/fetchStudent',
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.student.getEnrollments();
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load enrollments.');
    }
  }
);

export const enrollFreeCourse = createAsyncThunk(
  'enrollments/enrollFree',
  async (courseId, { dispatch, rejectWithValue }) => {
    try {
      const created = await api.student.enrollFree(courseId);
      await Promise.allSettled([
        dispatch(fetchStudentEnrollments()),
        dispatch(fetchStudentProfile()),
      ]);
      return created;
    } catch (err) {
      return rejectWithValue(err.message || 'Could not enroll.');
    }
  }
);

export const fetchLearningContent = createAsyncThunk(
  'enrollments/fetchLearningContent',
  async (courseId, { rejectWithValue }) => {
    try {
      return await api.get(
        `/student/courses/${encodeURIComponent(courseId)}/content`
      );
    } catch (err) {
      return rejectWithValue({
        message: err.message || 'Unable to load course content.',
        status: err.status,
      });
    }
  }
);

export const updateLessonProgress = createAsyncThunk(
  'enrollments/updateProgress',
  async (
    { enrollmentId, lessonId, completed },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const updated = await api.student.updateProgress(
        enrollmentId,
        lessonId,
        completed
      );
      await Promise.allSettled([
        dispatch(fetchStudentEnrollments()),
        dispatch(fetchStudentProfile()),
        ...(updated?.status === 'Completed'
          ? [dispatch(fetchStudentCertificates())]
          : []),
      ]);
      return updated;
    } catch (err) {
      return rejectWithValue(err.message || 'Could not save progress.');
    }
  }
);

export const recordLearningActivity = createAsyncThunk(
  'enrollments/recordActivity',
  async ({ courseId, lessonId, seconds = 30 }) => {
    try {
      return await api.post(
        `/student/courses/${encodeURIComponent(courseId)}/activity`,
        {
          lessonId,
          seconds,
        }
      );
    } catch {
      return null;
    }
  }
);

export const assignCoursesToLearners = createAsyncThunk(
  'enrollments/assignToLearners',
  async ({ courseIds, learnerIds }, { rejectWithValue }) => {
    try {
      return await api.enrollments.assign(courseIds, learnerIds);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to assign courses.');
    }
  }
);

const initialPlayer = {
  course: null,
  enrollment: null,
  lessons: [],
  assessment: null,
  currentLessonId: null,
  loading: true,
  notEnrolled: false,
  saving: false,
  error: '',
};

const initialState = {
  ...createResourceState([]),
  actionLoading: false,
  player: initialPlayer,
};

const enrollmentsSlice = createSlice({
  name: 'enrollments',
  initialState,
  reducers: {
    setCurrentLessonId: (state, action) => {
      state.player.currentLessonId = action.payload;
    },
    resetPlayer: (state) => {
      state.player = { ...initialPlayer };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentEnrollments.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchStudentEnrollments.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchStudentEnrollments.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ||
          action.error?.message ||
          'Unable to load enrollments.';
      })

      .addCase(enrollFreeCourse.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(enrollFreeCourse.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload?.id && Array.isArray(state.data)) {
          state.data = [
            action.payload,
            ...state.data.filter((e) => e.id !== action.payload.id),
          ];
        }
      })
      .addCase(enrollFreeCourse.rejected, (state) => {
        state.actionLoading = false;
      })

      .addCase(fetchLearningContent.pending, (state) => {
        state.player.loading = true;
        state.player.error = '';
        state.player.notEnrolled = false;
      })
      .addCase(fetchLearningContent.fulfilled, (state, action) => {
        const data = action.payload || {};
        state.player.loading = false;
        state.player.course = data.course || null;
        state.player.enrollment = data.enrollment || null;
        state.player.lessons = Array.isArray(data.lessons) ? data.lessons : [];
        state.player.assessment = data.assessment || null;

        const done = new Set(
          (data.enrollment?.completedLessons || []).map(String)
        );
        const lessons = state.player.lessons;
        if (
          lessons.length > 0 &&
          (!state.player.currentLessonId ||
            !lessons.some((l) => l.id === state.player.currentLessonId))
        ) {
          const next = lessons.find((l) => !done.has(l.id)) || lessons[0];
          state.player.currentLessonId = next.id;
        }
      })
      .addCase(fetchLearningContent.rejected, (state, action) => {
        const payload = action.payload || {};
        state.player.loading = false;
        state.player.error =
          payload.message || action.error?.message || 'Unable to load course.';
        state.player.notEnrolled =
          payload.status === 403 || payload.status === 404;
        state.player.course = null;
        state.player.enrollment = null;
        state.player.lessons = [];
      })

      .addCase(updateLessonProgress.pending, (state) => {
        state.player.saving = true;
      })
      .addCase(updateLessonProgress.fulfilled, (state, action) => {
        state.player.saving = false;
        const updated = action.payload;
        if (!updated) return;
        state.player.enrollment = updated;
        if (Array.isArray(state.data)) {
          state.data = state.data.map((e) =>
            e.id === updated.id ? { ...e, ...updated } : e
          );
        }
      })
      .addCase(updateLessonProgress.rejected, (state) => {
        state.player.saving = false;
      })

      .addCase(clearSession, () => initialState);
  },
});

export const { setCurrentLessonId, resetPlayer } = enrollmentsSlice.actions;

export default enrollmentsSlice.reducer;
