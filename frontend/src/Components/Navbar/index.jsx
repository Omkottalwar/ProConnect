import React, { useState, useEffect } from 'react';
import styles from "./styles.module.css";
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { reset } from '@/config/redux/reducer/authReducer';
import { getAboutUser } from '@/config/redux/action/authAction';
import { BASE_URL } from '@/config';

function Navbar() {
  const router = useRouter();
  const authState = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [showNotifications, setShowNotifications] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem("token");
      if (token && !authState.profileFetched) {
        dispatch(getAboutUser({ token }));
      }
    }
  }, [dispatch, authState.profileFetched]);

  const hasToken = isMounted && typeof window !== 'undefined' && Boolean(localStorage.getItem("token"));
  const isLoggedIn = isMounted && (hasToken || authState.user || authState.loggedIn || authState.isloggedIn);

  return (
    <div className={styles.container}>
      <nav className={styles.navBar}>
        {/* Editorial Brand Logo */}
        <div className={styles.logoGroup} onClick={() => router.push("/")}>
          <div className={styles.logoIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 11V6a4 4 0 0 0-4-4H7v16h4a4 4 0 0 0 4-4v-2" />
              <path d="M11 12h5a3 3 0 0 0 3-3v0a3 3 0 0 0-3-3h-5" />
              <circle cx="18" cy="18" r="2.5" fill="#c9a961" stroke="none" />
            </svg>
          </div>
          <span className={styles.logoText}>ProConnect</span>
        </div>

        {/* Right Action Section */}
        <div className={styles.navBarOptionContainer}>
          {isLoggedIn ? (
            <div className={styles.userSection}>
              {/* Notification Bell */}
              <div className={styles.notificationWrapper}>
                <button
                  className={styles.iconBtn}
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Notifications"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  <span className={styles.notificationDot}></span>
                </button>

                {showNotifications && (
                  <div className={styles.notificationDropdown}>
                    <div className={styles.dropdownHeader}>
                      <h4>Notifications</h4>
                      <span className={styles.unreadTag}>2 New</span>
                    </div>
                    <div className={styles.dropdownList}>
                      <div className={styles.dropdownItem}>
                        <span className={styles.itemIcon}>✨</span>
                        <div>
                          <p>Welcome to ProConnect Editorial Network.</p>
                          <span>Just now</span>
                        </div>
                      </div>
                      <div className={styles.dropdownItem}>
                        <span className={styles.itemIcon}>🎖️</span>
                        <div>
                          <p>Your executive profile is live.</p>
                          <span>1 hour ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Badge */}
              <div className={styles.userInfoBadge} onClick={() => router.push("/profile")}>
                {authState.user?.userId?.profilePicture ? (
                  <img
                    src={`${BASE_URL}/${authState.user.userId.profilePicture}`}
                    alt="avatar"
                    className={styles.navAvatar}
                  />
                ) : (
                  <div className={styles.navAvatarPlaceholder}>
                    {authState.user?.userId?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className={styles.welcomeMessage}>
                  {authState.user?.userId?.name || 'Member'}
                </span>
              </div>

              <button
                onClick={() => router.push("/profile")}
                className={styles.profileButton}
              >
                Profile
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  dispatch(reset());
                  router.push("/login");
                }}
                className={styles.logoutButton}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              className={styles.buttonJoin}
              onClick={() => router.push("/login")}
            >
              Get Started
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export default Navbar;