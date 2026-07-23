
import { createSlice } from "@reduxjs/toolkit";
import { getAboutUser, getAllUsers, getConnectionRequests, getMyConnectionRequests, loginUser, registerUser } from "../../action/authAction/index.js";

const initialState={
    user:undefined,
    isError:false,
    isSuccess:false,
    isLoading:false,
    loggedIn:false,
    isloggedIn:false,
    message:"",
    isTokenThere:false,
    profileFetched:false,
    connections:[],
    all_users:[],
    connectionRequest:[],
    all_profiles_fetched:false
}
const authSlice =createSlice(
    {
        name:"auth",
        initialState,
        reducers:{
            reset:()=>initialState,
            handleLoginUser:(state)=>{
                state.message=""
        },
        emptyMessage:(state)=>{
            state.message=""
        },
        setTokenIsThere:(state,action)=>{
            state.isTokenThere=true;

        },
        setTokenIsNotThere:(state,action)=>{
            state.isTokenThere=false;
        }


        },
        extraReducers:(builder)=>{
            builder
            .addCase(loginUser.pending,(state)=>{
                state.isLoading=true
                state.isError=false
                state.message="Signing in..."
            })
            .addCase(loginUser.fulfilled,(state,action)=>{
                 state.isLoading=false
                 state.isError=false
                 state.isSuccess=true
                 state.loggedIn=true
                 state.isloggedIn=true
                 state.message="Login is successful"

             
            })
            .addCase(loginUser.rejected,(state,action)=>{
                state.isLoading=false;
                state.isError=true;
                state.loggedIn=false;
                state.isloggedIn=false;
                state.message=typeof action.payload === 'string' ? action.payload : (action.payload?.message || "Login failed");


            })
            .addCase(registerUser.pending,(state)=>{
                state.isLoading=true
                state.isError=false
                state.message="Registering user..."
            })
            .addCase(registerUser.fulfilled,(state,action)=>{
                state.isLoading=false
                 state.isError=false
                 state.isSuccess=true
                 state.loggedIn=false
                 state.isloggedIn=false
                 state.message="Registration successful! Please sign in."
            })
            .addCase(registerUser.rejected,(state,action)=>{
                state.isLoading=false;
                state.isError=true;
                state.message=typeof action.payload === 'string' ? action.payload : (action.payload?.message || "Registration failed");

            })
            .addCase(getAboutUser.fulfilled,(state,action)=>{
                state.isLoading=false;
                state.isError=false;
                state.profileFetched=true;
                state.user=action.payload.profile;
            })
            .addCase(getAllUsers.fulfilled,(state,action)=>{
                state.isLoading=false;
                state.isError=false;
                state.all_profiles_fetched=true;
                state.all_users=action.payload.profiles;
            })
            .addCase(getConnectionRequests.fulfilled,(state,action)=>{
            
               state.connections=action.payload;
               
            })
            .addCase(getConnectionRequests.rejected,(state,action)=>{
                state.message=action.payload;
            })
            .addCase(getMyConnectionRequests.fulfilled,(state,action)=>{
            state.connectionRequest=action.payload;
            })
            .addCase(getMyConnectionRequests.rejected,(state,action)=>{
                state.message=action.payload;
            })
        }
    }
)
export const {reset,emptyMessage,setTokenIsNotThere,setTokenIsThere}=authSlice.actions;
export default authSlice.reducer;