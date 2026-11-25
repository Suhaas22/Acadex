import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { clearSession } from './authSlice';
import {
  bindResourceLifecycle,
  createResourceState,
  extractItems,
} from '../utils';

export const fetchStudentCertificates = createAsyncThunk(
  'certificates/fetchStudent',
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.student.getCertificates();
      return Array.isArray(list) ? list : [];
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load certificates.');
    }
  }
);

export const fetchAllCertificates = createAsyncThunk(
  'certificates/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return extractItems(await api.certificates.list());
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load certificates.');
    }
  }
);

export const fetchCertificateById = createAsyncThunk(
  'certificates/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      return await api.get(`/certificates/${encodeURIComponent(id)}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to load certificate.');
    }
  }
);

export const verifyCertificate = createAsyncThunk(
  'certificates/verify',
  async (credentialId, { rejectWithValue }) => {
    try {
      return await api.certificates.verify(encodeURIComponent(credentialId));
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to verify certificate.');
    }
  }
);

export const downloadCertificatePdf = createAsyncThunk(
  'certificates/downloadPdf',
  async ({ certificate, administrator = false }, { rejectWithValue }) => {
    try {
      const file = await api.get(
        `/${administrator ? 'certificates' : 'student/certificates'}/${encodeURIComponent(certificate.id)}/download`
      );
      if (file?.mimeType !== 'application/pdf' || !file?.content) {
        throw new Error('The server did not return a certificate PDF.');
      }
      const bytes = Uint8Array.from(atob(file.content), (character) =>
        character.charCodeAt(0)
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: file.mimeType })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return certificate.id;
    } catch (err) {
      return rejectWithValue(err.message || 'Unable to download certificate.');
    }
  }
);

const initialState = {
  studentItems: createResourceState([]),
  adminItems: createResourceState([]),
  selected: createResourceState(null),
  verification: createResourceState(null),
  downloadingId: '',
  downloadError: '',
};

const certificatesSlice = createSlice({
  name: 'certificates',
  initialState,
  reducers: {
    setSelectedCertificate: (state, action) => {
      state.selected.data = action.payload;
      state.selected.error = '';
    },
    clearVerification: (state) => {
      state.verification = createResourceState(null);
    },
    clearDownloadError: (state) => {
      state.downloadError = '';
    },
  },
  extraReducers: (builder) => {
    bindResourceLifecycle(
      builder,
      fetchStudentCertificates,
      (s) => s.studentItems
    );
    bindResourceLifecycle(builder, fetchAllCertificates, (s) => s.adminItems);
    bindResourceLifecycle(builder, fetchCertificateById, (s) => s.selected);
    bindResourceLifecycle(builder, verifyCertificate, (s) => s.verification, {
      resetOnPending: true,
    });

    builder
      .addCase(downloadCertificatePdf.pending, (state, action) => {
        state.downloadingId = action.meta.arg?.certificate?.id || 'pending';
        state.downloadError = '';
      })
      .addCase(downloadCertificatePdf.fulfilled, (state) => {
        state.downloadingId = '';
      })
      .addCase(downloadCertificatePdf.rejected, (state, action) => {
        state.downloadingId = '';
        state.downloadError =
          action.payload ||
          action.error?.message ||
          'Unable to download certificate.';
      })
      .addCase(clearSession, () => initialState);
  },
});

export const { setSelectedCertificate, clearVerification, clearDownloadError } =
  certificatesSlice.actions;

export default certificatesSlice.reducer;
