import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import { syncOrgCounts } from './organizationsSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

export const fetchPublicLanding = createAsyncThunk(
  'courses/fetchPublicLanding',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/public/landing');
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load landing courses.');
    }
  }
);

export const fetchStudentCatalog = createAsyncThunk(
  'courses/fetchStudentCatalog',
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.student.getCatalog();
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load catalog.');
    }
  }
);

export const browseStudentCatalog = createAsyncThunk(
  'courses/browseStudentCatalog',
  async ({ search = '', page = '1', limit = 9 } = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams({ search, page, limit });
      return await api.get(`/student/catalog/browse?${query}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to browse courses.');
    }
  }
);

export const fetchStudentCatalogCourse = createAsyncThunk(
  'courses/fetchStudentCatalogCourse',
  async (courseId, { rejectWithValue }) => {
    try {
      return await api.student.getCatalogCourse(courseId);
    } catch (err) {
      return rejectWithValue(err.message || 'Course not available.');
    }
  }
);

export const fetchOrgCourses = createAsyncThunk(
  'courses/fetchOrgCourses',
  async (search = '', { rejectWithValue }) => {
    try {
      return await api.get(
        `/courses/organization/list?${new URLSearchParams({ search })}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load courses.');
    }
  }
);

export const fetchOrgCourseById = createAsyncThunk(
  'courses/fetchOrgCourseById',
  async (id, { rejectWithValue }) => {
    try {
      return await api.get(`/courses/${encodeURIComponent(id)}/organization`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load course details.');
    }
  }
);

export const createCourse = createAsyncThunk(
  'courses/createCourse',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const created = await api.courses.create(payload);
      dispatch(syncOrgCounts());
      return created;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create course.');
    }
  }
);

export const updateCourse = createAsyncThunk(
  'courses/updateCourse',
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      const payload = {
        ...data,
        ...(data.price === undefined ? {} : { price: Number(data.price) }),
      };
      const updated = await api.courses.update(id, payload);
      dispatch(syncOrgCounts());
      return { id, updated: updated || payload };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update course.');
    }
  }
);

export const submitCourseForApproval = createAsyncThunk(
  'courses/submitForApproval',
  async (id, { rejectWithValue }) => {
    try {
      await api.post(`/courses/${encodeURIComponent(id)}/submit`, {});
      return await api.get(`/courses/${encodeURIComponent(id)}/organization`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to submit course.');
    }
  }
);

export const fetchAssignmentOptions = createAsyncThunk(
  'courses/fetchAssignmentOptions',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/courses/assignment-options');
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load assignment options.'
      );
    }
  }
);

export const assignCourseInstructors = createAsyncThunk(
  'courses/assignInstructors',
  async ({ courseIds, instructorIds }, { rejectWithValue }) => {
    try {
      return await api.post('/courses/assignments', {
        courseIds,
        instructorIds,
      });
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to assign instructors.');
    }
  }
);

export const fetchAdminCourseQueue = createAsyncThunk(
  'courses/fetchAdminCourseQueue',
  async (search = '', { rejectWithValue }) => {
    try {
      return await api.get(
        `/admin/course-queue?${new URLSearchParams({ search })}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load course queue.');
    }
  }
);

export const fetchAdminCourses = createAsyncThunk(
  'courses/fetchAdminCourses',
  async (
    { search = '', status = 'Pending Approval', page = 1, limit = 12 } = {},
    { rejectWithValue }
  ) => {
    try {
      return await api.get(
        `/admin/courses?${new URLSearchParams({ search, status, page, limit })}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load courses.');
    }
  }
);

export const fetchAdminCourseById = createAsyncThunk(
  'courses/fetchAdminCourseById',
  async (courseId, { rejectWithValue }) => {
    try {
      return await api.get(`/admin/courses/${encodeURIComponent(courseId)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load course details.');
    }
  }
);

export const reviewAdminCourse = createAsyncThunk(
  'courses/reviewAdminCourse',
  async ({ courseId, decision, reason }, { rejectWithValue }) => {
    try {
      await api.post(
        `/admin/courses/${encodeURIComponent(courseId)}/review`,
        {
          decision,
          ...(decision === 'reject' ? { reason } : {}),
        },
        'admin'
      );
      return { courseId, decision };
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to review course.');
    }
  }
);

export const updateAdminCourse = createAsyncThunk(
  'courses/updateAdminCourse',
  async ({ courseId, form }, { rejectWithValue }) => {
    try {
      const updated = await api.patch(
        `/admin/courses/${encodeURIComponent(courseId)}`,
        form
      );
      return { courseId, updated: updated || form };
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to update course.');
    }
  }
);

export const archiveAdminCourse = createAsyncThunk(
  'courses/archiveAdminCourse',
  async (courseId, { rejectWithValue }) => {
    try {
      await api.post(
        `/admin/courses/${encodeURIComponent(courseId)}/archive`,
        {}
      );
      return courseId;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to archive course.');
    }
  }
);

export const deleteAdminCourse = createAsyncThunk(
  'courses/deleteAdminCourse',
  async (courseId, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/courses/${encodeURIComponent(courseId)}`);
      return courseId;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to delete course.');
    }
  }
);

const initialState = {
  publicLanding: createResourceState(null),
  catalog: createResourceState([]),
  browse: createResourceState(null),
  selectedCatalogCourse: createResourceState(null),
  orgCourses: createResourceState(null),
  selectedOrgCourse: createResourceState(null),
  assignmentOptions: createResourceState(null),
  adminQueue: createResourceState(null),
  adminCourses: createResourceState(null),
  selectedAdminCourse: createResourceState(null),
  actionLoading: false,
  actionError: '',
};

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    clearCourseErrors: (state) => {
      state.actionError = '';
    },
    clearSelectedCatalogCourse: (state) => {
      state.selectedCatalogCourse = createResourceState(null);
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(builder, fetchPublicLanding, (s) => s.publicLanding);
    bindResourceLifecycle(builder, fetchStudentCatalog, (s) => s.catalog);
    bindResourceLifecycle(builder, browseStudentCatalog, (s) => s.browse);
    bindResourceLifecycle(
      builder,
      fetchStudentCatalogCourse,
      (s) => s.selectedCatalogCourse,
      { resetOnPending: true }
    );
    bindResourceLifecycle(builder, fetchOrgCourses, (s) => s.orgCourses);
    bindResourceLifecycle(
      builder,
      fetchOrgCourseById,
      (s) => s.selectedOrgCourse,
      { resetOnPending: true }
    );
    bindResourceLifecycle(
      builder,
      fetchAssignmentOptions,
      (s) => s.assignmentOptions
    );
    bindResourceLifecycle(builder, fetchAdminCourseQueue, (s) => s.adminQueue);
    bindResourceLifecycle(builder, fetchAdminCourses, (s) => s.adminCourses);
    bindResourceLifecycle(
      builder,
      fetchAdminCourseById,
      (s) => s.selectedAdminCourse,
      { resetOnPending: true }
    );

    const startAction = (state) => {
      state.actionLoading = true;
      state.actionError = '';
    };
    const failAction = (state, action) => {
      state.actionLoading = false;
      state.actionError =
        action.payload || action.error?.message || 'Course action failed.';
    };

    builder
      .addCase(createCourse.pending, startAction)
      .addCase(createCourse.fulfilled, (state, action) => {
        state.actionLoading = false;
        const created = action.payload;
        if (created && state.orgCourses.data?.items) {
          state.orgCourses.data.items = [
            created,
            ...state.orgCourses.data.items.filter((c) => c.id !== created.id),
          ];
        }
      })
      .addCase(createCourse.rejected, failAction)

      .addCase(updateCourse.pending, startAction)
      .addCase(updateCourse.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { id, updated } = action.payload;
        if (state.orgCourses.data?.items) {
          state.orgCourses.data.items = state.orgCourses.data.items.map((c) =>
            c.id === id ? { ...c, ...updated } : c
          );
        }
        if (state.selectedOrgCourse.data?.id === id) {
          state.selectedOrgCourse.data = {
            ...state.selectedOrgCourse.data,
            ...updated,
          };
        }
      })
      .addCase(updateCourse.rejected, failAction)

      .addCase(submitCourseForApproval.pending, startAction)
      .addCase(submitCourseForApproval.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.selectedOrgCourse.data = action.payload;
        if (state.orgCourses.data?.items && action.payload?.id) {
          state.orgCourses.data.items = state.orgCourses.data.items.map((c) =>
            c.id === action.payload.id
              ? { ...c, status: action.payload.status }
              : c
          );
        }
      })
      .addCase(submitCourseForApproval.rejected, failAction)

      .addCase(assignCourseInstructors.pending, startAction)
      .addCase(assignCourseInstructors.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(assignCourseInstructors.rejected, failAction)

      .addCase(reviewAdminCourse.pending, startAction)
      .addCase(reviewAdminCourse.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { courseId, decision } = action.payload;
        if (state.adminCourses.data?.items) {
          state.adminCourses.data.items = state.adminCourses.data.items.filter(
            (c) => c.id !== courseId
          );
        }
        if (state.selectedAdminCourse.data?.id === courseId) {
          state.selectedAdminCourse.data.status =
            decision === 'approve' ? 'Published' : 'Rejected';
        }
      })
      .addCase(reviewAdminCourse.rejected, failAction)

      .addCase(updateAdminCourse.pending, startAction)
      .addCase(updateAdminCourse.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { courseId, updated } = action.payload;
        if (state.selectedAdminCourse.data?.id === courseId) {
          state.selectedAdminCourse.data = {
            ...state.selectedAdminCourse.data,
            ...updated,
          };
        }
        if (state.adminCourses.data?.items) {
          state.adminCourses.data.items = state.adminCourses.data.items.map(
            (c) => (c.id === courseId ? { ...c, ...updated } : c)
          );
        }
      })
      .addCase(updateAdminCourse.rejected, failAction)

      .addCase(archiveAdminCourse.pending, startAction)
      .addCase(archiveAdminCourse.fulfilled, (state, action) => {
        state.actionLoading = false;
        const id = action.payload;
        if (state.selectedAdminCourse.data?.id === id) {
          state.selectedAdminCourse.data.status = 'Archived';
        }
        if (state.adminCourses.data?.items) {
          state.adminCourses.data.items = state.adminCourses.data.items.map(
            (c) => (c.id === id ? { ...c, status: 'Archived' } : c)
          );
        }
      })
      .addCase(archiveAdminCourse.rejected, failAction)

      .addCase(deleteAdminCourse.pending, startAction)
      .addCase(deleteAdminCourse.fulfilled, (state, action) => {
        state.actionLoading = false;
        const id = action.payload;
        if (state.selectedAdminCourse.data?.id === id) {
          state.selectedAdminCourse.data = null;
        }
        if (state.adminCourses.data?.items) {
          state.adminCourses.data.items = state.adminCourses.data.items.filter(
            (c) => c.id !== id
          );
        }
      })
      .addCase(deleteAdminCourse.rejected, failAction)

      .addCase(clearSession, () => initialState);
  },
});

export const { clearCourseErrors, clearSelectedCatalogCourse } =
  coursesSlice.actions;

export default coursesSlice.reducer;
