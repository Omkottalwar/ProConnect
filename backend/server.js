import express from "express";
import cors from "cors";

import mongoose  from "mongoose";
import postRoutes from "./routes/posts.routes.js"
import userRoutes from "./routes/user.routes.js"


const app=express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(cors({
  origin: "https://pro-connect-zeta-flame.vercel.app", 
  credentials: true
}));

app.use(postRoutes);
app.use(userRoutes);
app.use(express.static("uploads"))
const start=async()=>{
    const connectDB= await mongoose.connect("mongodb+srv://kottalwarom_db_user:Kottalwar1234@linkedinclone.m1ap5p7.mongodb.net/?appName=LinkedinClone")
    app.listen(9080,()=>{
        console.log("Server is running on port 9080")
        console.log("Connected to DB")
    })
}
start();
