"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import styles from "./index.module.css";
import axios from "axios";
import { useRouter } from "next/router";

export default function ResetPassword() {
  const router=useRouter();
  const params = useParams();
  const token = params?.token; // ✅ SAFE

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [messageError, setMessageError] = useState("");

  if (!token) {
    return <p>Invalid reset link</p>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await axios.post(
      `https://proconnect-a390.onrender.com/reset-password/${token}`,
      { password }
    );
    setMessage(res.data.message);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Reset Password</h2>

        <div className={styles.form}>
          <input
            type="password"
            placeholder="New Password"
            className={styles.input}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
             <input
            type="password"
            placeholder="Confirm Password"
            className={styles.input}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button onClick={(e)=>{
            if(password!==confirmPassword){
              setMessageError("Passwords do not match");
            }else{
              handleSubmit(e)
              router.push("/login")
            }
          }} className={styles.button}>Reset Password</button>
        </div>

        {messageError && <p className={styles.messageError}>{messageError}</p>}
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  );
}
