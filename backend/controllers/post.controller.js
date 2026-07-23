import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comments.model.js";
import { getUserFromToken } from "./user.controller.js";

export const activeCheck=async (req,res)=>{
    return res.status(200).json({message: "RUNNING SUCCESSFULLY"})

}

export const createPost=async(req,res)=>{
    const{token} =req.body;
    try{

        const user=await getUserFromToken(token);
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        const post =new Post({
            userId:user._id,
            body:req.body.body,
            media:req.file !=undefined ? req.file.filename :"",
            fileType:req.file !=undefined? req.file.mimetype.split("/")[1]:""

        })
     await post.save();
     return res.status(200).json({message:"Post Created"})

    }catch(error){
        res.status(500).json({message:error.message})
    }
}
export const getAllPosts =async (req,res)=>{
    try{
        const posts= await Post.find().populate("userId","name username email profilePicture")
        return res.json({posts})
    }catch(error){
        return res.status(500).json({message:error.message})
    }
}
export const  deletePost=async (req,res)=>{
    const{token,post_id}=req.body;
    try{
        const user=await getUserFromToken(token);
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        const post=await Post.findOne({_id:post_id});
        if(!post){
            return res.status(404).json({message:"Post not found"})
        }
        if(post.userId.toString() !== user._id.toString()){
            return res.status(404).json({message:"Unauthorised "})
        }
        await Post.deleteOne({_id:post_id})
        return res.json({message:"Post Deleted"})

    }catch(error){
        res.status(500).json({message:error.message})
    }
}
export const commentPost =async (req,res)=>{
    const {token,post_id,commentBody}=req.body;
    try{
        const user=await getUserFromToken(token);
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
      const post=await Post.findOne({_id:post_id});
      if(!post){
        return res.status(404).json({message:"Post not found"})
      }
      const comment=new Comment({
        userId:user._id,
        postId:post._id,
        body:commentBody

      })
      await comment.save();
      return res.status(200).json({message:"Comment Added"})
    }catch(error){
        return res.status(500).json({message:error.message})

    }
}
export const get_comments_by_post=async (req,res)=>{
    const {post_id}=req.query;
    try{
        const post=await Post.findOne({_id:post_id});
      if(!post){
        return res.status(404).json({message:"Post not found"})
      }
      const comments=await Comment.find({postId:post_id}).populate("userId","name username email profilePicture");
       return res.json(comments.reverse())
       
    }catch(error){
        return res.status(500).json({message:error.message})
    }
}
export const delete_comment_of_user=async (req,res)=>{
    const {token,comment_id}=req.body;
    try{
        const user=await getUserFromToken(token);
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        const comment=await Comment.findOne({_id:comment_id});
      if(!comment){
        return res.status(404).json({message:"Comment not found"})
      }
      if(comment.userId.toString() !== user._id.toString()){
        return res.status(404).json({message:"Unauthorized "})
      }


    await Comment.deleteOne({"_id":comment_id});
    return res.json({message:"Comment Delete"})

    }catch(error){
        res.status(500).json({message:error.message})
    }
}
export const increment_likes=async(req,res)=>{
    const {post_id, token}=req.body;
    try{
        const user = await getUserFromToken(token);
        const post=await Post.findOne({_id:post_id})
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (!Array.isArray(post.likedBy)) {
            post.likedBy = [];
        }

        if (user) {
            const userIdStr = user._id.toString();
            const hasLiked = post.likedBy.some((id) => id.toString() === userIdStr);

            if (hasLiked) {
                // Unlike
                post.likedBy = post.likedBy.filter((id) => id.toString() !== userIdStr);
                post.likes = post.likedBy.length;
                await post.save();
                return res.json({ message: "Post Unliked", likes: post.likes, liked: false, likedBy: post.likedBy });
            } else {
                // Like
                post.likedBy.push(user._id);
                post.likes = post.likedBy.length;
                await post.save();
                return res.json({ message: "Post Liked", likes: post.likes, liked: true, likedBy: post.likedBy });
            }
        } else {
            post.likes = (post.likes || 0) + 1;
            await post.save();
            return res.json({ message: "Likes Incremented", likes: post.likes });
        }
    }catch(error){
        res.status(500).json({message:error.message})
    }
}
