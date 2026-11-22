import { createSlice } from '@reduxjs/toolkit';
import { api } from '../../utils/api';

export const initialRemoteData = { data: null, loading: true, error: '' };
const slice = createSlice({
  name: 'remoteData',
  initialState: {},
  reducers: {
    replaced: (state, { payload: { key, value } }) => {
      state[key] = value;
    },
    removed: (state, { payload }) => {
      delete state[payload];
    },
  },
});
export const { replaced, removed } = slice.actions;
export default slice.reducer;
// Separate subscriptions intentionally keep separate requests and lifetimes.
export const fetchRemoteData =
  (key, path, isActive) => (dispatch, getState) => {
    const previous = getState().remoteData[key] || initialRemoteData;
    dispatch(
      replaced({ key, value: { ...previous, loading: true, error: '' } })
    );
    return api
      .get(path)
      .then((data) => {
        if (isActive())
          dispatch(
            replaced({ key, value: { data, loading: false, error: '' } })
          );
      })
      .catch((e) => {
        if (isActive())
          dispatch(
            replaced({
              key,
              value: {
                data: null,
                loading: false,
                error: e.message || 'Unable to load records.',
              },
            })
          );
      });
  };
