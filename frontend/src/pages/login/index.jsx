import React, { useEffect, useState } from "react";
import styles from "./styles.module.css";
import { useRouter } from "next/router";

function LoginComponent() {
  const router = useRouter();

  const [email, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [visible, setVisible] = useState(true);
  const [userLoginMethod, setUserLoginMethod] = useState(false);

  // ✅ loading state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token")) {
      router.push("/dashboard");
    }
  }, []);

  const fakeApiCall = () =>
    new Promise((resolve) =>
      setTimeout(() => resolve(true), 1500)
    );

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      await fakeApiCall();
      setMessage("Registration successful");
    } catch {
      setIsError(true);
      setMessage("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      await fakeApiCall();
      localStorage.setItem("token", "dummy-token");
      setMessage("Login successful");
      router.push("/dashboard");
    } catch {
      setIsError(true);
      setMessage("Login failed");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.cardContainer}>
        <div className={styles.cardContainer__left}>
          <p className={styles.cardleft_heading}>
            {userLoginMethod ? "Sign In" : "Sign Up"}
          </p>

          <p style={{ color: isError ? "red" : "green" }}>{message}</p>

          <div className={styles.inputContainer}>
            {!userLoginMethod && (
              <div className={styles.inputRow}>
                <input
                  className={styles.inputField}
                  placeholder="Username"
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  className={styles.inputField}
                  placeholder="Name"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <input
              className={styles.inputField}
              placeholder="Email"
              onChange={(e) => setEmailAddress(e.target.value)}
            />

            <input
              className={styles.inputField}
              type={visible ? "password" : "text"}
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className={styles.eyeBall}>
              <div onClick={() => setVisible(!visible)}>👁</div>
            </div>

            {/* ✅ LOADING BUTTON */}
            <div
              onClick={() => {
                if (!loading) {
                  userLoginMethod ? handleLogin() : handleRegister();
                }
              }}
              className={`${styles.buttonWithOutline1} ${
                loading ? styles.disabled : ""
              }`}
            >
              {loading ? (
                <div className={styles.spinner}></div>
              ) : (
                <p>{userLoginMethod ? "Sign In" : "Sign Up"}</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.cardContainer__right}>
          <p>
            {userLoginMethod
              ? "Don't have an account?"
              : "Already have an account?"}
          </p>

          <div
            onClick={() => !loading && setUserLoginMethod(!userLoginMethod)}
            className={styles.buttonWithOutline}
          >
            <p>{userLoginMethod ? "Sign Up" : "Sign In"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginComponent;
