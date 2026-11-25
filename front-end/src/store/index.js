import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import toast from './slices/toastSlice';
import users from './slices/usersSlice';
import organizations from './slices/organizationsSlice';
import instructors from './slices/instructorsSlice';
import instructorRequests from './slices/instructorRequestsSlice';
import learners from './slices/learnersSlice';
import courses from './slices/coursesSlice';
import curriculum from './slices/curriculumSlice';
import enrollments from './slices/enrollmentsSlice';
import quizzes from './slices/quizzesSlice';
import reviews from './slices/reviewsSlice';
import disputes from './slices/disputesSlice';
import payments from './slices/paymentsSlice';
import certificates from './slices/certificatesSlice';
import notifications from './slices/notificationsSlice';
import analytics from './slices/analyticsSlice';
import settings from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth,
    toast,
    users,
    organizations,
    instructors,
    instructorRequests,
    learners,
    courses,
    curriculum,
    enrollments,
    quizzes,
    reviews,
    disputes,
    payments,
    certificates,
    notifications,
    analytics,
    settings,
  },
});
