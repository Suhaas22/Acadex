import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import { fetchStudentCatalogCourse } from './coursesSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

export const fetchCourseReviews = createAsyncThunk(
  'reviews/fetchCourseReviews',
  async (courseId, { rejectWithValue }) => {
    try {
      const list = await api.courses.getReviews(courseId);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load reviews.');
    }
  }
);

export const fetchMyReviews = createAsyncThunk(
  'reviews/fetchMyReviews',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.student.getMyReviews());
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load your reviews.');
    }
  }
);

export const createReview = createAsyncThunk(
  'reviews/create',
  async (
    {
      courseId,
      rating,
      comment,
      learnerName,
      learnerId,
      refreshCatalog = false,
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const created = await api.courses.addReview(
        courseId,
        rating,
        comment,
        learnerName,
        learnerId
      );
      if (refreshCatalog) {
        await Promise.allSettled([
          dispatch(fetchCourseReviews(courseId)),
          dispatch(fetchStudentCatalogCourse(courseId)),
        ]);
      }
      return created;
    } catch (err) {
      return rejectWithValue(err.message || 'Could not submit review.');
    }
  }
);

export const updateReview = createAsyncThunk(
  'reviews/update',
  async (
    { reviewId, rating, comment, courseId, refreshCatalog = false },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const updated = await api.courses.updateReview(reviewId, rating, comment);
      if (refreshCatalog && courseId) {
        await Promise.allSettled([
          dispatch(fetchCourseReviews(courseId)),
          dispatch(fetchStudentCatalogCourse(courseId)),
        ]);
      }
      return { reviewId, rating, comment, updated };
    } catch (err) {
      return rejectWithValue(err.message || 'Could not update review.');
    }
  }
);

export const deleteReview = createAsyncThunk(
  'reviews/delete',
  async (
    { reviewId, courseId, refreshCatalog = false },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await api.courses.deleteReview(reviewId);
      if (refreshCatalog && courseId) {
        await Promise.allSettled([
          dispatch(fetchCourseReviews(courseId)),
          dispatch(fetchStudentCatalogCourse(courseId)),
        ]);
      }
      return reviewId;
    } catch (err) {
      return rejectWithValue(err.message || 'Could not delete review.');
    }
  }
);

export const fetchInstructorReviews = createAsyncThunk(
  'reviews/fetchInstructorReviews',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.get('/workspace/instructor/reviews'));
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load course reviews.');
    }
  }
);

export const replyToReview = createAsyncThunk(
  'reviews/reply',
  async ({ id, response }, { rejectWithValue }) => {
    try {
      const updated = await api.post(
        `/workspace/instructor/reviews/${encodeURIComponent(id)}/reply`,
        { response }
      );
      return { id, response, updated };
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to save reply.');
    }
  }
);

export const deleteReviewReply = createAsyncThunk(
  'reviews/deleteReply',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(
        `/workspace/instructor/reviews/${encodeURIComponent(id)}/reply`
      );
      return id;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to delete reply.');
    }
  }
);

const initialState = {
  courseReviews: createResourceState([]),
  myReviews: createResourceState([]),
  instructorReviews: createResourceState([]),
  saving: false,
  actionError: '',
};

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearReviewError: (state) => {
      state.actionError = '';
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(builder, fetchCourseReviews, (s) => s.courseReviews);
    bindResourceLifecycle(builder, fetchMyReviews, (s) => s.myReviews);
    bindResourceLifecycle(
      builder,
      fetchInstructorReviews,
      (s) => s.instructorReviews
    );

    const startSaving = (state) => {
      state.saving = true;
      state.actionError = '';
    };
    const failSaving = (state, action) => {
      state.saving = false;
      state.actionError =
        action.payload || action.error?.message || 'Review action failed.';
    };

    builder
      .addCase(createReview.pending, startSaving)
      .addCase(createReview.fulfilled, (state, action) => {
        state.saving = false;
        const created = action.payload;
        if (created?.id) {
          if (Array.isArray(state.myReviews.data)) {
            state.myReviews.data = [
              created,
              ...state.myReviews.data.filter((r) => r.id !== created.id),
            ];
          }
          if (
            Array.isArray(state.courseReviews.data) &&
            !state.courseReviews.data.some((r) => r.id === created.id)
          ) {
            state.courseReviews.data = [created, ...state.courseReviews.data];
          }
        }
      })
      .addCase(createReview.rejected, failSaving)

      .addCase(updateReview.pending, startSaving)
      .addCase(updateReview.fulfilled, (state, action) => {
        state.saving = false;
        const { reviewId, rating, comment, updated } = action.payload;
        const applyPatch = (list) =>
          Array.isArray(list)
            ? list.map((r) =>
                r.id === reviewId
                  ? { ...r, ...(updated || { rating, comment }) }
                  : r
              )
            : list;
        state.myReviews.data = applyPatch(state.myReviews.data);
        state.courseReviews.data = applyPatch(state.courseReviews.data);
      })
      .addCase(updateReview.rejected, failSaving)

      .addCase(deleteReview.pending, startSaving)
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.saving = false;
        const id = action.payload;
        if (Array.isArray(state.myReviews.data)) {
          state.myReviews.data = state.myReviews.data.filter(
            (r) => r.id !== id
          );
        }
        if (Array.isArray(state.courseReviews.data)) {
          state.courseReviews.data = state.courseReviews.data.filter(
            (r) => r.id !== id
          );
        }
      })
      .addCase(deleteReview.rejected, failSaving)

      .addCase(replyToReview.pending, startSaving)
      .addCase(replyToReview.fulfilled, (state, action) => {
        state.saving = false;
        const { id, response, updated } = action.payload;
        if (Array.isArray(state.instructorReviews.data)) {
          state.instructorReviews.data = state.instructorReviews.data.map(
            (r) => (r.id === id ? { ...r, ...(updated || { response }) } : r)
          );
        }
      })
      .addCase(replyToReview.rejected, failSaving)

      .addCase(deleteReviewReply.pending, startSaving)
      .addCase(deleteReviewReply.fulfilled, (state, action) => {
        state.saving = false;
        const id = action.payload;
        if (Array.isArray(state.instructorReviews.data)) {
          state.instructorReviews.data = state.instructorReviews.data.map(
            (r) => (r.id === id ? { ...r, response: null, repliedAt: null } : r)
          );
        }
      })
      .addCase(deleteReviewReply.rejected, failSaving)

      .addCase(clearSession, () => initialState);
  },
});

export const { clearReviewError } = reviewsSlice.actions;

export default reviewsSlice.reducer;
