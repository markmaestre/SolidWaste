import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import wasteReportReducer from "../slices/wasteReportSlice";
import notificationReducer from "../slices/notificationSlice";


export default configureStore({
  reducer: {
    auth: authReducer,
    wasteReport: wasteReportReducer,
    notification: notificationReducer
    
  },
});