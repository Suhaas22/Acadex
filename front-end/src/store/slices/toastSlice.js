import { createSlice } from '@reduxjs/toolkit';

const toastSlice = createSlice({
  name: 'toast',
  initialState: [],
  reducers: {
    added: (state, action) => {
      state.push(action.payload);
    },
    removed: (state, action) =>
      state.filter((toast) => toast.id !== action.payload),
  },
});

export const { added, removed } = toastSlice.actions;

/** Dispatch a toast notification and automatically clear it after duration ms. */
export const showToast =
  (message, type = 'success', duration = 3000) =>
  (dispatch) => {
    const id = Date.now() + Math.random();
    dispatch(added({ id, message, type }));
    setTimeout(() => {
      dispatch(removed(id));
    }, duration);
    return id;
  };

export default toastSlice.reducer;
