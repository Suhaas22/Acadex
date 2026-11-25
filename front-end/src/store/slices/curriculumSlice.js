import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

function normalizeEditorModules(rawModules) {
  return (Array.isArray(rawModules) ? rawModules : []).map((mod, idx) => ({
    ...mod,
    id: mod.id || idx + 1,
    title: mod.title || `Module ${idx + 1}`,
    description: mod.description || '',
    objectives: Array.isArray(mod.objectives) ? mod.objectives : [],
    items: Array.isArray(mod.items)
      ? mod.items
      : Array.isArray(mod.lessons)
        ? mod.lessons
        : [],
  }));
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const fetchCourseEditor = createAsyncThunk(
  'curriculum/fetchEditor',
  async (courseId, { rejectWithValue }) => {
    try {
      return await api.get(
        `/courses/${encodeURIComponent(courseId)}/editor`,
        'instructor'
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load this course.');
    }
  }
);

export const uploadLessonMedia = createAsyncThunk(
  'curriculum/uploadMedia',
  async ({ courseId, file }, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await api.post(
        `/courses/${encodeURIComponent(courseId)}/upload`,
        form
      );
      const path = (uploaded?.data || uploaded)?.path;
      if (!path) throw new Error('The server did not return an uploaded file.');
      return { path, fileName: file.name, fileSize: formatBytes(file.size) };
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to upload file.');
    }
  }
);

export const saveCurriculumDraft = createAsyncThunk(
  'curriculum/saveDraft',
  async ({ courseId, modules }, { rejectWithValue }) => {
    try {
      await api.put(
        `/courses/${encodeURIComponent(courseId)}/curriculum-draft`,
        { modules },
        'instructor'
      );
      return modules;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to save draft.');
    }
  }
);

export const submitModuleRequest = createAsyncThunk(
  'curriculum/submitModuleRequest',
  async ({ courseId, modules }, { rejectWithValue }) => {
    try {
      const created = await api.post(
        `/courses/${encodeURIComponent(courseId)}/module-requests`,
        { modules },
        'instructor'
      );
      return created || { status: 'Pending' };
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to submit curriculum changes.'
      );
    }
  }
);

export const createModuleAndSaveDraft = createAsyncThunk(
  'curriculum/createModuleAndSaveDraft',
  async ({ courseId, title, description, objectives }, { rejectWithValue }) => {
    try {
      const course = await api.get(
        `/courses/${encodeURIComponent(courseId)}/editor`,
        'instructor'
      );
      const currentModules = course?.modules || [];
      const newMod = {
        id: Date.now(),
        title,
        description,
        objectives: String(objectives || '')
          .split('\n')
          .filter(Boolean),
        items: [],
      };
      const nextModules = [...currentModules, newMod];
      await api.put(
        `/courses/${encodeURIComponent(courseId)}/curriculum-draft`,
        { modules: nextModules },
        'instructor'
      );
      return nextModules;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to save module draft.');
    }
  }
);

export const createLessonAndSaveDraft = createAsyncThunk(
  'curriculum/createLessonAndSaveDraft',
  async (
    {
      courseId,
      targetModuleId,
      lessonType,
      title,
      duration,
      readingContent,
      uploadedFile,
    },
    { rejectWithValue }
  ) => {
    try {
      const course = await api.get(
        `/courses/${encodeURIComponent(courseId)}/editor`,
        'instructor'
      );
      let uploadedUrl = '';
      if (uploadedFile) {
        const form = new FormData();
        form.append('file', uploadedFile);
        const result = await api.post(
          `/courses/${encodeURIComponent(courseId)}/upload`,
          form
        );
        uploadedUrl = (result?.data || result)?.path;
        if (!uploadedUrl) {
          throw new Error('The upload did not return a file URL.');
        }
      }
      const currentModules = Array.isArray(course?.modules)
        ? course.modules.map((m) => ({
            ...m,
            items: Array.isArray(m.items) ? [...m.items] : [],
          }))
        : [];
      if (currentModules.length > 0) {
        const targetMod = targetModuleId
          ? currentModules.find(
              (m) => String(m.id) === String(targetModuleId)
            ) || currentModules[0]
          : currentModules[0];
        const newItem = {
          id: Date.now(),
          type: lessonType === 'video' ? 'Video' : 'Reading',
          title,
          duration: Number(duration) || 10,
          videoUrl: lessonType === 'video' ? uploadedUrl : null,
          resourceUrl: lessonType === 'video' ? null : uploadedUrl,
          fileName: uploadedFile ? uploadedFile.name : '',
          fileSize: uploadedFile ? formatBytes(uploadedFile.size) : '',
          url: '',
          description: readingContent,
          content: readingContent,
        };
        targetMod.items = [...(targetMod.items || []), newItem];
      }
      await api.put(
        `/courses/${encodeURIComponent(courseId)}/curriculum-draft`,
        { modules: currentModules },
        'instructor'
      );
      return currentModules;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to save lesson draft.');
    }
  }
);

export const linkQuizToCurriculumItem = createAsyncThunk(
  'curriculum/linkQuizToItem',
  async ({ courseId, moduleId, itemId, quizId }, { rejectWithValue }) => {
    try {
      if (!moduleId || !itemId) return null;
      const course = await api.get(
        `/courses/${encodeURIComponent(courseId)}/editor`,
        'instructor'
      );
      const modules = (course?.modules || []).map((module) =>
        String(module.id) !== String(moduleId)
          ? module
          : {
              ...module,
              items: (Array.isArray(module.items)
                ? module.items
                : Array.isArray(module.lessons)
                  ? module.lessons
                  : []
              ).map((item) =>
                String(item.id) === String(itemId) ? { ...item, quizId } : item
              ),
            }
      );
      await api.put(
        `/courses/${encodeURIComponent(courseId)}/curriculum-draft`,
        { modules },
        'instructor'
      );
      return modules;
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to link quiz to curriculum.'
      );
    }
  }
);

export const fetchModuleRequests = createAsyncThunk(
  'curriculum/fetchModuleRequests',
  async (courseId = '', { rejectWithValue }) => {
    try {
      const suffix = courseId ? `?${new URLSearchParams({ courseId })}` : '';
      return extractItems(
        await api.get(`/courses/module-requests/mine${suffix}`)
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load module requests.');
    }
  }
);

export const decideModuleRequest = createAsyncThunk(
  'curriculum/decideModuleRequest',
  async ({ requestId, decision, note }, { rejectWithValue }) => {
    try {
      const updated = await api.post(
        `/courses/module-requests/${encodeURIComponent(requestId)}/decision`,
        { decision, note }
      );
      return { requestId, decision, note, updated };
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to save decision.');
    }
  }
);

export const fetchLoggedModuleRequest = createAsyncThunk(
  'curriculum/fetchLoggedModuleRequest',
  async (id, { rejectWithValue }) => {
    try {
      return await api.get(
        `/workspace/logs/requests/${encodeURIComponent(id)}`
      );
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load curriculum request.'
      );
    }
  }
);

const initialState = {
  course: null,
  modules: [],
  pendingRequest: null,
  dirty: false,
  loading: false,
  saving: false,
  uploading: false,
  error: '',
  saveError: '',
  saveSuccessMessage: '',
  moduleRequests: createResourceState([]),
  loggedRequest: createResourceState(null),
  decisionBusy: false,
  decisionError: '',
};

const curriculumSlice = createSlice({
  name: 'curriculum',
  initialState,
  reducers: {
    resetEditor: (state) => {
      state.course = null;
      state.modules = [];
      state.pendingRequest = null;
      state.dirty = false;
      state.loading = true;
      state.error = '';
      state.saveError = '';
      state.saveSuccessMessage = '';
    },
    addModule: (state) => {
      state.modules.push({
        id: crypto.randomUUID(),
        title: `Module ${state.modules.length + 1}: New Module`,
        description: '',
        objectives: [],
        items: [],
      });
      state.dirty = true;
      state.saveSuccessMessage = '';
    },
    updateModule: (state, action) => {
      const updated = action.payload;
      state.modules = state.modules.map((m) =>
        m.id === updated.id ? updated : m
      );
      state.dirty = true;
      state.saveSuccessMessage = '';
    },
    deleteModule: (state, action) => {
      state.modules = state.modules.filter((m) => m.id !== action.payload);
      state.dirty = true;
      state.saveSuccessMessage = '';
    },
    applyUploadedItem: (state, action) => {
      const updatedItem = action.payload;
      state.modules = state.modules.map((mod) => ({
        ...mod,
        items: (Array.isArray(mod.items) ? mod.items : []).map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        ),
      }));
      state.dirty = true;
    },
    clearCurriculumNotices: (state) => {
      state.saveError = '';
      state.saveSuccessMessage = '';
      state.decisionError = '';
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(
      builder,
      fetchModuleRequests,
      (s) => s.moduleRequests
    );
    bindResourceLifecycle(
      builder,
      fetchLoggedModuleRequest,
      (s) => s.loggedRequest,
      { resetOnPending: true }
    );

    builder
      .addCase(fetchCourseEditor.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchCourseEditor.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload;
        if (!data) return;
        state.course = data;
        state.pendingRequest = data.pendingModuleRequest || null;
        if (!state.dirty) {
          state.modules = normalizeEditorModules(data.modules);
        }
      })
      .addCase(fetchCourseEditor.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || action.error?.message || 'Unable to load course.';
      })

      .addCase(uploadLessonMedia.pending, (state) => {
        state.uploading = true;
      })
      .addCase(uploadLessonMedia.fulfilled, (state) => {
        state.uploading = false;
      })
      .addCase(uploadLessonMedia.rejected, (state) => {
        state.uploading = false;
      })

      .addCase(saveCurriculumDraft.pending, (state) => {
        state.saving = true;
        state.saveError = '';
        state.saveSuccessMessage = '';
      })
      .addCase(saveCurriculumDraft.fulfilled, (state) => {
        state.saving = false;
        state.dirty = false;
        state.saveSuccessMessage = 'Draft saved. Learner content is unchanged.';
      })
      .addCase(saveCurriculumDraft.rejected, (state, action) => {
        state.saving = false;
        state.saveError =
          action.payload || action.error?.message || 'Unable to save draft.';
      })

      .addCase(submitModuleRequest.pending, (state) => {
        state.saving = true;
        state.saveError = '';
        state.saveSuccessMessage = '';
      })
      .addCase(submitModuleRequest.fulfilled, (state, action) => {
        state.saving = false;
        state.dirty = false;
        state.pendingRequest = action.payload || { status: 'Pending' };
        state.saveSuccessMessage = 'Changes submitted to your organization.';
      })
      .addCase(submitModuleRequest.rejected, (state, action) => {
        state.saving = false;
        state.saveError =
          action.payload ||
          action.error?.message ||
          'Unable to submit curriculum changes.';
      })

      .addCase(createModuleAndSaveDraft.pending, (state) => {
        state.saving = true;
        state.saveError = '';
      })
      .addCase(createModuleAndSaveDraft.fulfilled, (state, action) => {
        state.saving = false;
        state.modules = normalizeEditorModules(action.payload);
        state.dirty = false;
      })
      .addCase(createModuleAndSaveDraft.rejected, (state, action) => {
        state.saving = false;
        state.saveError =
          action.payload || action.error?.message || 'Unable to save module.';
      })

      .addCase(createLessonAndSaveDraft.pending, (state) => {
        state.saving = true;
        state.saveError = '';
      })
      .addCase(createLessonAndSaveDraft.fulfilled, (state, action) => {
        state.saving = false;
        state.modules = normalizeEditorModules(action.payload);
        state.dirty = false;
      })
      .addCase(createLessonAndSaveDraft.rejected, (state, action) => {
        state.saving = false;
        state.saveError =
          action.payload || action.error?.message || 'Unable to save lesson.';
      })

      .addCase(linkQuizToCurriculumItem.fulfilled, (state, action) => {
        if (action.payload) {
          state.modules = normalizeEditorModules(action.payload);
          state.dirty = false;
        }
      })

      .addCase(decideModuleRequest.pending, (state) => {
        state.decisionBusy = true;
        state.decisionError = '';
      })
      .addCase(decideModuleRequest.fulfilled, (state, action) => {
        state.decisionBusy = false;
        const { requestId, decision, note, updated } = action.payload;
        if (Array.isArray(state.moduleRequests.data)) {
          state.moduleRequests.data = state.moduleRequests.data.map((req) =>
            req.id === requestId
              ? updated?.id
                ? updated
                : {
                    ...req,
                    status: decision === 'approve' ? 'Approved' : 'Rejected',
                    note,
                  }
              : req
          );
        }
      })
      .addCase(decideModuleRequest.rejected, (state, action) => {
        state.decisionBusy = false;
        state.decisionError =
          action.payload || action.error?.message || 'Unable to save decision.';
      })

      .addCase(clearSession, () => initialState);
  },
});

export const {
  resetEditor,
  addModule,
  updateModule,
  deleteModule,
  applyUploadedItem,
  clearCurriculumNotices,
} = curriculumSlice.actions;

export default curriculumSlice.reducer;
