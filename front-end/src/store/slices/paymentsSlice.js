import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import { fetchStudentEnrollments } from './enrollmentsSlice';
import { fetchStudentProfile } from './learnersSlice';
import { bindResourceLifecycle, createResourceState } from '../utils';

export const fetchStudentBilling = createAsyncThunk(
  'payments/fetchStudentBilling',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      return await api.get(`/student/billing${query ? `?${query}` : ''}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load billing records.');
    }
  }
);

export const fetchStudentPaymentById = createAsyncThunk(
  'payments/fetchStudentPaymentById',
  async (paymentId, { rejectWithValue }) => {
    try {
      return await api.get(
        `/student/payments/${encodeURIComponent(paymentId)}`
      );
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load payment details.');
    }
  }
);

export const checkoutCourse = createAsyncThunk(
  'payments/checkoutCourse',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const result = await api.student.checkout(payload);
      await Promise.allSettled([
        dispatch(fetchStudentEnrollments()),
        dispatch(fetchStudentProfile()),
      ]);
      return result;
    } catch (err) {
      return rejectWithValue(err.message || 'Payment failed.');
    }
  }
);

export const fetchAdminPayments = createAsyncThunk(
  'payments/fetchAdminLedger',
  async (
    { search = '', status = '', type = 'Payment', page = 1, limit = 12 } = {},
    { rejectWithValue }
  ) => {
    try {
      const query = new URLSearchParams({ search, status, type, page, limit });
      return await api.get(`/admin/payments?${query}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load payment ledger.');
    }
  }
);

export const fetchAdminFinance = createAsyncThunk(
  'payments/fetchAdminFinance',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/admin/finance');
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load finance summary.');
    }
  }
);

export const recordAdminPayout = createAsyncThunk(
  'payments/recordAdminPayout',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const result = await api.post('/admin/payouts', payload);
      await dispatch(fetchAdminFinance());
      return result;
    } catch (err) {
      await dispatch(fetchAdminFinance());
      return rejectWithValue(err.message || 'Unable to record payout.');
    }
  }
);

export const fetchOrgPayments = createAsyncThunk(
  'payments/fetchOrgPayments',
  async (_, { rejectWithValue }) => {
    try {
      return await api.get('/workspace/organization/payments');
    } catch (err) {
      return rejectWithValue(
        err.message || 'Unable to load received payments.'
      );
    }
  }
);

const initialState = {
  studentBilling: createResourceState(null),
  selectedReceipt: createResourceState(null),
  adminLedger: createResourceState(null),
  adminFinance: createResourceState(null),
  orgPayments: createResourceState(null),
  checkout: {
    result: null,
    processing: false,
    error: '',
  },
  payoutBusy: false,
  payoutError: '',
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearPayoutError: (state) => {
      state.payoutError = '';
    },
    resetCheckout: (state) => {
      state.checkout = { result: null, processing: false, error: '' };
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(
      builder,
      fetchStudentBilling,
      (s) => s.studentBilling
    );
    bindResourceLifecycle(
      builder,
      fetchStudentPaymentById,
      (s) => s.selectedReceipt,
      { resetOnPending: true }
    );
    bindResourceLifecycle(builder, fetchAdminPayments, (s) => s.adminLedger);
    bindResourceLifecycle(builder, fetchAdminFinance, (s) => s.adminFinance);
    bindResourceLifecycle(builder, fetchOrgPayments, (s) => s.orgPayments);

    builder
      .addCase(checkoutCourse.pending, (state) => {
        state.checkout.processing = true;
        state.checkout.error = '';
      })
      .addCase(checkoutCourse.fulfilled, (state, action) => {
        state.checkout.processing = false;
        state.checkout.result = action.payload;
      })
      .addCase(checkoutCourse.rejected, (state, action) => {
        state.checkout.processing = false;
        state.checkout.error =
          action.payload || action.error?.message || 'Payment failed.';
      })

      .addCase(recordAdminPayout.pending, (state) => {
        state.payoutBusy = true;
        state.payoutError = '';
      })
      .addCase(recordAdminPayout.fulfilled, (state) => {
        state.payoutBusy = false;
      })
      .addCase(recordAdminPayout.rejected, (state, action) => {
        state.payoutBusy = false;
        state.payoutError =
          action.payload || action.error?.message || 'Unable to record payout.';
      })

      .addCase(clearSession, () => initialState);
  },
});

export const { clearPayoutError, resetCheckout } = paymentsSlice.actions;

export default paymentsSlice.reducer;
