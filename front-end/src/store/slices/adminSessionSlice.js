import { createSlice } from '@reduxjs/toolkit';
import { api } from '../../utils/api';

export const initialAdminSession = { data: null, loading: true, error: '' };
const slice = createSlice({
  name: 'adminSession',
  initialState: initialAdminSession,
  reducers: { replaced: (_state, action) => action.payload },
});
export const { replaced: replaceAdminSession } = slice.actions;
export default slice.reducer;
export const fetchAdminSession = (isActive) => (dispatch, getState) => {
  dispatch(
    replaceAdminSession({
      ...getState().adminSession,
      loading: true,
      error: '',
    })
  );
  return api
    .get('/admin/session')
    .then((data) => {
      if (isActive())
        dispatch(replaceAdminSession({ data, loading: false, error: '' }));
    })
    .catch((e) => {
      if (isActive())
        dispatch(
          replaceAdminSession({
            data: null,
            loading: false,
            error: e.message || 'Unable to load records.',
          })
        );
    });
};
