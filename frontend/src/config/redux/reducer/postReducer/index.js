import { createSlice } from "@reduxjs/toolkit"
import { getAllComments, getAllPosts } from "../../action/postAction"

const initialState={
    posts: [],
    isLoading: false,
    isError: false,
    message: "",
    loggedIn: false,
    postFetched: false,
    comments: [],
    postId:""

}
const postSlice=createSlice({
    name:"post",
    initialState,
    reducers:{
        reset:()=>initialState,
        resetPostId:(state)=>{
            state.postId="" 
               }
    },
   extraReducers:(builder)=>{
    builder
    .addCase(getAllPosts.pending,(state)=>{
        state.isLoading=true
        state.message="Fetching posts..."
    })
    .addCase(getAllPosts.fulfilled,(state,action)=>{
        state.isLoading=false
         state.isError=false
         state.posts=action.payload.posts.reverse();
         state.postFetched=true
    })
    .addCase(getAllPosts.rejected,(state,action)=>{
        state.isLoading=false;
        state.isError=true;
        state.message=action.payload;
   }) 
   .addCase(getAllComments.fulfilled,(state,action)=>{
    state.postId=action.payload.post_id;
    state.comments=action.payload.comments;
    

   })
    }
})
export const{resetPostId}=postSlice.actions;
export default postSlice.reducer;