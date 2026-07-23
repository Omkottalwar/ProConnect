import { configureStore } from "@reduxjs/toolkit";
import postReducer from "./reducer/postReducer"

import authReducer from "./reducer/authReducer"
/**
 * STEPS for State Management
 * Submit Action
 * Handle action in it's reducer
 * Register Here -> Reducer
 */



export const store =configureStore({
    reducer:{
        auth: authReducer,
        posts:postReducer,
    }
})