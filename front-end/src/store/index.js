import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import toast from './slices/toastSlice';
import student from './slices/studentSlice';
import instructor from './slices/instructorSlice';
import org from './slices/orgSlice';
import adminSession from './slices/adminSessionSlice';
import remoteData from './slices/remoteDataSlice';

export const store = configureStore({
  reducer: { auth, toast, student, instructor, org, adminSession, remoteData },
});
