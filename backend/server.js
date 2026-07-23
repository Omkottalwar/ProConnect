import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose  from "mongoose";
import postRoutes from "./routes/posts.routes.js"
import userRoutes from "./routes/user.routes.js"

dotenv.config();

const app=express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(cors({
  origin: ["http://localhost:3000", "https://pro-connect-17.vercel.app", "https://pro-connect-17.vercel.app/"], 
  credentials: true
}));

app.use(postRoutes);
app.use(userRoutes);
app.use(express.static("uploads"))
const start=async()=>{
    const connectDB= await mongoose.connect(process.env.MONGO_URL)
    console.log(process.env.MONGO_URL)
    const port = process.env.PORT || 9080;
    app.listen(port, ()=>{
        console.log(`Server is running on port ${port}`)
        console.log("Connected to DB")
    })
}
start();

