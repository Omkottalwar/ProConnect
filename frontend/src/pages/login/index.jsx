import UserLayout from '@/layout/UserLayout';
import React, { useState, useEffect } from 'react';
import styles from "./styles.module.css";
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser } from '@/config/redux/action/authAction';
import { useRouter } from 'next/router';
import { reset } from '@/config/redux/reducer/authReducer';

function LoginComponent() {
  const authState = useSelector((state) => state.auth);
  const router = useRouter();
  const dispatch = useDispatch();

  const [userState, setUserState] = useState(0); // 0: Login, 1: Register
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (authState.loggedIn || authState.isloggedIn || localStorage.getItem("token")) {
      router.push("/dashboard");
    }
  }, [authState.loggedIn, authState.isloggedIn]);

  useEffect(() => {
    dispatch(reset());
  }, [userState, dispatch]);

  const handleRegister = () => {
    if (!name || !username || !email || !password) return;
    dispatch(registerUser({ name, username, email, password }));
  };

  const handleLogin = () => {
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userState === 0) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  return (
    <UserLayout>
      <div className={styles.container}>
        <div className={styles.cardContainer}>
          {/* Left Form Section */}
          <div className={styles.cardLeft}>
            <h2>{userState === 0 ? "Welcome Back" : "Create Account"}</h2>
            <p className={styles.subtitle}>
              {userState === 0
                ? "Sign in to access your editorial professional network"
                : "Join ProConnect to connect with elite industry leaders"}
            </p>

            {authState.message && authState.message !== "" && (
              <div className={authState.isError ? styles.errorBanner : styles.successBanner}>
                {typeof authState.message === 'string'
                  ? authState.message
                  : authState.message?.message || "Action completed"}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              {userState === 1 && (
                <>
                  <div className={styles.inputGroup}>
                    <label>Full Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      type="text"
                      placeholder="Full Name"
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Username</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      type="text"
                      placeholder="Username"
                      required
                    />
                  </div>
                </>
              )}

              <div className={styles.inputGroup}>
                <label>Email Address</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Email Address"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.eyeBtn}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.eyeIcon}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.eyeIcon}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.573 16.49 16.638 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authState.isLoading}
                className={styles.submitBtn}
              >
                {authState.isLoading
                  ? "Processing..."
                  : userState === 0
                  ? "Sign In to Network"
                  : "Create Free Account"}
              </button>
            </form>

            <div className={styles.toggleText}>
              {userState === 0 ? (
                <>
                  Don't have an account?{" "}
                  <span onClick={() => setUserState(1)}>Sign up now</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span onClick={() => setUserState(0)}>Sign in</span>
                </>
              )}
            </div>
          </div>

          {/* Right Editorial Brand Panel */}
          <div className={styles.cardRight}>
            <div className={styles.brandInfo}>
              <h3>ProConnect</h3>
              <p>Where industry authority meets genuine professional collaboration. Zero noise, high trust.</p>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}

export default LoginComponent;