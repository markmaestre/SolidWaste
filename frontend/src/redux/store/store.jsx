import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSlice";
import wasteReportReducer from "../slices/wasteReportSlice";
import notificationReducer from "../slices/notificationSlice";
import messageReducer from "../slices/messageSlice";
import classifyReducer from "../slices/classifySlice";
import postReducer from "../slices/postSlice";

export default configureStore({
  reducer: {
    auth: authReducer,
    wasteReport: wasteReportReducer,
    notification: notificationReducer,
    message: messageReducer,
    classify: classifyReducer,
    posts: postReducer,
    
  },
});