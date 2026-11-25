import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { storeSession, clearSession } from './authSlice';
import { bindResourceLifecycle, createResourceState } from '../utils';

export const fetchAdminSession = createAsyncThunk(
  'users/fetchAdminSession',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/admin/session');
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load admin session.');
    }
  }
);

export const updateAdminProfile = createAsyncThunk(
  'users/updateAdminProfile',
  async (form, { dispatch, rejectWithValue }) => {
    try {
      const updated = await api.patch('/admin/profile', form);
      dispatch(
        storeSession({
          user_name: updated?.name ?? form.name,
          user_email: updated?.email ?? form.email,
          nexuspay_user_email: updated?.email ?? form.email,
        })
      );
      return updated;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to update admin profile.');
    }
  }
);

export const fetchWorkspaceSession = createAsyncThunk(
  'users/fetchWorkspaceSession',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/workspace/session');
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load workspace session.'
      );
    }
  }
);

export const fetchWorkspaceAccount = createAsyncThunk(
  'users/fetchWorkspaceAccount',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/workspace/account');
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load account details.');
    }
  }
);

export const updateWorkspaceAccount = createAsyncThunk(
  'users/updateWorkspaceAccount',
  async (form, { dispatch, rejectWithValue }) => {
    try {
      const updated = await api.patch('/workspace/account', form);
      if (updated?.name) {
        dispatch(storeSession({ user_name: updated.name }));
      }
      return updated;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to update account.');
    }
  }
);

export const fetchAccounts = createAsyncThunk(
  'users/fetchAccounts',
  async (role = 'Learner', { rejectWithValue }) => {
    try {
      return await api.get(`/admin/accounts?role=${encodeURIComponent(role)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load accounts.');
    }
  }
);

export const fetchAccountById = createAsyncThunk(
  'users/fetchAccountById',
  async (userId, { rejectWithValue }) => {
    try {
      return await api.get(`/admin/accounts/${encodeURIComponent(userId)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load account details.');
    }
  }
);

export const verifyOrganizationAccount = createAsyncThunk(
  'users/verifyOrganizationAccount',
  async ({ userId, decision, reason }, { dispatch, rejectWithValue }) => {
    try {
      await api.post(
        `/admin/accounts/${encodeURIComponent(userId)}/verification`,
        {
          decision,
          reason,
        }
      );
      const refreshed = await api.get(
        `/admin/accounts/${encodeURIComponent(userId)}`
      );
      return refreshed;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to verify organization.');
    }
  }
);

export const toggleAccountAccess = createAsyncThunk(
  'users/toggleAccountAccess',
  async ({ userId, status }, { rejectWithValue }) => {
    try {
      await api.patch(`/admin/accounts/${encodeURIComponent(userId)}`, {
        status,
      });
      return await api.get(`/admin/accounts/${encodeURIComponent(userId)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to update account status.');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'users/deleteAccount',
  async (userId, { rejectWithValue }) => {
    try {
      await api.delete(`/admin/accounts/${encodeURIComponent(userId)}`);
      return userId;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to delete account.');
    }
  }
);

const initialState = {
  adminSession: createResourceState(null),
  workspaceSession: createResourceState(null),
  workspaceAccount: createResourceState(null),
  directory: createResourceState({ items: [], counts: {} }),
  selectedAccount: createResourceState(null),
  saving: false,
  actionError: '',
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearAdminSession: (state) => {
      state.adminSession = createResourceState(null);
    },
    clearSelectedAccount: (state) => {
      state.selectedAccount = createResourceState(null);
      state.actionError = '';
    },
    clearUsersActionError: (state) => {
      state.actionError = '';
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(builder, fetchAdminSession, (s) => s.adminSession);
    bindResourceLifecycle(
      builder,
      fetchWorkspaceSession,
      (s) => s.workspaceSession
    );
    bindResourceLifecycle(
      builder,
      fetchWorkspaceAccount,
      (s) => s.workspaceAccount
    );
    bindResourceLifecycle(builder, fetchAccounts, (s) => s.directory);
    bindResourceLifecycle(builder, fetchAccountById, (s) => s.selectedAccount, {
      resetOnPending: true,
    });

    const startSaving = (state) => {
      state.saving = true;
      state.actionError = '';
    };
    const failSaving = (state, action) => {
      state.saving = false;
      state.actionError =
        action.payload || action.error?.message || 'Action failed.';
    };

    builder
      .addCase(updateAdminProfile.pending, startSaving)
      .addCase(updateAdminProfile.fulfilled, (state, action) => {
        state.saving = false;
        if (state.adminSession.data) {
          state.adminSession.data = {
            ...state.adminSession.data,
            profile: {
              ...state.adminSession.data.profile,
              ...action.payload,
            },
          };
        }
        if (state.workspaceSession.data) {
          state.workspaceSession.data = {
            ...state.workspaceSession.data,
            name: action.payload?.name ?? state.workspaceSession.data.name,
            email: action.payload?.email ?? state.workspaceSession.data.email,
          };
        }
      })
      .addCase(updateAdminProfile.rejected, failSaving)

      .addCase(updateWorkspaceAccount.pending, startSaving)
      .addCase(updateWorkspaceAccount.fulfilled, (state, action) => {
        state.saving = false;
        state.workspaceAccount.data = {
          ...(state.workspaceAccount.data || {}),
          ...action.payload,
        };
        if (state.workspaceSession.data && action.payload?.name) {
          state.workspaceSession.data.name = action.payload.name;
        }
      })
      .addCase(updateWorkspaceAccount.rejected, failSaving)

      .addCase(verifyOrganizationAccount.pending, startSaving)
      .addCase(verifyOrganizationAccount.fulfilled, (state, action) => {
        state.saving = false;
        state.selectedAccount.data = action.payload;
        if (state.directory.data?.items) {
          state.directory.data.items = state.directory.data.items.map((item) =>
            item.id === action.payload?.id
              ? { ...item, status: action.payload.status }
              : item
          );
        }
      })
      .addCase(verifyOrganizationAccount.rejected, failSaving)

      .addCase(toggleAccountAccess.pending, startSaving)
      .addCase(toggleAccountAccess.fulfilled, (state, action) => {
        state.saving = false;
        state.selectedAccount.data = action.payload;
        if (state.directory.data?.items) {
          state.directory.data.items = state.directory.data.items.map((item) =>
            item.id === action.payload?.id
              ? { ...item, status: action.payload.status }
              : item
          );
        }
      })
      .addCase(toggleAccountAccess.rejected, failSaving)

      .addCase(deleteAccount.pending, startSaving)
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.saving = false;
        state.selectedAccount.data = null;
        if (state.directory.data?.items) {
          state.directory.data.items = state.directory.data.items.filter(
            (item) => item.id !== action.payload
          );
        }
      })
      .addCase(deleteAccount.rejected, failSaving)

      .addCase(clearSession, () => initialState);
  },
});

export const {
  clearAdminSession,
  clearSelectedAccount,
  clearUsersActionError,
} = usersSlice.actions;

export default usersSlice.reducer;
