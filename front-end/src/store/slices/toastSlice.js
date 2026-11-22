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
export default toastSlice.reducer;
