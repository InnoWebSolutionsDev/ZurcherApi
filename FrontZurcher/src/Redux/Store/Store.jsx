import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import toastMiddleware from '../../utils/toastMiddleware';
import authReducer from '../Reducer/authReducer';
import pdfReducer from '../Reducer/pdfReducer';
import BudgetReducer from '../Reducer/BudgetReducer';
import adminReducer from '../Reducer/adminReducer';
import inspectionReducer from '../Reducer/inspectionReducer';
import materialReducer from '../Reducer/materialReducer';
import permitReducer from '../Reducer/permitReducer';
import workReducer from '../Reducer/workReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  pdf: pdfReducer,
   admin: adminReducer,
   Budget: BudgetReducer,
   inspection: inspectionReducer,
   material: materialReducer,
  permit: permitReducer,
   work: workReducer

  // agrega otros reducers aquí
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, 
    }).concat(toastMiddleware), 
});