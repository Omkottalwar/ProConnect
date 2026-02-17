
import { useState } from "react";
import styles from "./index.module.css";
import axios from "axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
    const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await axios.post(
      "http://localhost:9080/forgot-password",
      { email }
    );
    setMessage(res.data.message);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Forgot Password</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Enter your email"
            className={styles.input}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className={styles.button}>Send Reset Link</button>
        </form>

        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  );
}