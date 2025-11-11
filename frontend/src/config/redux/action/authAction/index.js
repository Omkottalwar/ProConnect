import { clientServer } from "@/config";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const loginUser=createAsyncThunk(
    "user/login",
    async(user,thunkAPI)=>{
        console.log(user)
        try{
            const response=await clientServer.post("/login",{
                email:user.email,
                password:user.password
            }
        );

      console.log("✅ LOGIN RESPONSE:", response.data);
            if(response.data.token){
                localStorage.setItem("token",response.data.token)
                return response.data; 
            }else{
                return thunkAPI.rejectWithValue(
                    {
                        message:"Token not provided"
                    }
                )
            }

        }catch(err){
            console.error("❌ LOGIN ERROR:", err.response?.data || err.message);
            return thunkAPI.rejectWithValue(err.response?.data || { message: err.message });
        }

    }
)
export const registerUser=createAsyncThunk(
    "user/register",
    async(user,thunkAPI)=>{
        try{
            const request=await clientServer.post("/register",{
                username:user.username,
                name:user.name,
                email:user.email,
                password:user.password
            })

        }catch(err){
            return thunkAPI.rejectWithValue(err.response.data)
        }
    }
)
export const getAboutUser=createAsyncThunk(
    "user/getAboutUser",
    async(user,thunkAPI)=>{
        try{
            const response=await clientServer.get("/get_user_and_profile",{
                params:{
                    token:user.token
                }
            });
           
            return thunkAPI.fulfillWithValue(response.data);
           
        }catch(err){
            return thunkAPI.rejectWithValue(err.response.data)
        }
    }
)
export const getAllUsers=createAsyncThunk( 
    "user/getAllUsers",
    async(_,thunkAPI)=>{
        try{
            const response=await clientServer.get("/all_users_profiles");
            return thunkAPI.fulfillWithValue(response.data);
        }catch(err){
            return thunkAPI.rejectWithValue(err.response.data)
        }
    }
 )
 export const sendConnectionRequest=createAsyncThunk(
    "user/sendConnectionRequest",
    async(user,thunkAPI)=>{
        try{
            console.log(user);
            const response=await clientServer.post("/user/send_connection_request",{
                token:user.token,
                connectionId:user.user_id
            });
            thunkAPI.dispatch(getMyConnectionRequests({token:user.token}));
            return thunkAPI.fulfillWithValue(response.data);
        }catch(err){
            return thunkAPI.rejectWithValue(err.response.data.message)
        }
    }
 )
 export const getConnectionRequests=createAsyncThunk(
    "user/getConnectionRequests",
    async(user,thunkAPI)=>{
        console.log("Fetching connection requests for user:", user);
        try{
            const response=await clientServer.get("/user/getConnectionRequests",{
                params:{
                    token:user.token
                }
            });
            return thunkAPI.fulfillWithValue(response.data.conections);
        }catch(err){
            console.log(err);
            return thunkAPI.rejectWithValue(err.response.data.message)
        }
    }
 )
 export const getMyConnectionRequests=createAsyncThunk(
    "user/getMyConnectionRequests",
    async(user,thunkAPI)=>{
        try{
            const response=await clientServer.get("/user/user_connection_request",{
                params:{
                    token:user.token
                }
            });
            return thunkAPI.fulfillWithValue(response.data);
        }catch(err){
            console.log(err);
            return thunkAPI.rejectWithValue(err.response.data.message)
        }
    }
 )
export const AcceptConnection= createAsyncThunk(
    "user/AcceptConnection",
    async(user,thunkAPI)=>{
        try{
            const response=await clientServer.post("/user/accept_connection_request",{
                token:user.token,
                requestId:user.connectionId,
                action_type:user.action
            });
            return thunkAPI.fulfillWithValue(response.data);
        }catch(err){
            console.log(err);
            return thunkAPI.rejectWithValue(err.response.data.message)
        }
    }
)