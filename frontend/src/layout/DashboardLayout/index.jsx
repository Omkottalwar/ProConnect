import React, { useEffect } from 'react';
import styles from "./index.module.css";
import { useRouter } from 'next/router';
import { setTokenIsThere } from '@/config/redux/reducer/authReducer';
import { useDispatch, useSelector } from 'react-redux';
import { BASE_URL } from '@/config';

function DashboardLayout({ children }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);

  useEffect(() => {
    if (localStorage.getItem("token") === null) {
      router.push("/login");
    }
    dispatch(setTokenIsThere());
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.homeContainer}>
        {/* Left Sidebar */}
        <aside className={styles.homeContainer__leftBar}>
          <div
            onClick={() => router.push("/dashboard")}
            className={`${styles.sideBarOption} ${router.pathname === "/dashboard" ? styles.activeOption : ""}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span>Feed & Stories</span>
          </div>

          <div
            onClick={() => router.push("/discover")}
            className={`${styles.sideBarOption} ${router.pathname === "/discover" ? styles.activeOption : ""}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <span>Discover People</span>
          </div>

          <div
            onClick={() => router.push("/my_connections")}
            className={`${styles.sideBarOption} ${router.pathname === "/my_connections" ? styles.activeOption : ""}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <span>My Connections</span>
          </div>
        </aside>

        {/* Main Feed Container */}
        <main className={styles.homeContainer__feedContainer}>
          {children}
        </main>

        {/* Right Sidebar - Top Profiles */}
        <aside className={styles.homecontainer__extraContainer}>
          <div className={styles.sidebarHeader}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.headerIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <h3>Top Profiles</h3>
          </div>

          <div className={styles.profilesList}>
            {authState.all_profiles_fetched &&
              authState.all_users
                .slice(0, 5)
                .map((profile) => (
                  <div
                    onClick={() => router.push(`/view_profile/${profile.userId?.username}`)}
                    key={profile._id}
                    className={styles.topProfileItem}
                  >
                    {profile.userId?.profilePicture ? (
                      <img
                        src={`${BASE_URL}/${profile.userId.profilePicture}`}
                        alt="profile"
                        className={styles.sidebarAvatar}
                      />
                    ) : (
                      <div className={styles.sidebarAvatarPlaceholder}>
                        {profile.userId?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className={styles.sidebarUserInfo}>
                      <p className={styles.sidebarName}>{profile.userId?.name}</p>
                      <span className={styles.sidebarHandle}>@{profile.userId?.username}</span>
                    </div>
                  </div>
                ))}
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={styles.mobileNavBar}>
        <div
          onClick={() => router.push("/dashboard")}
          className={`${styles.mobileNavItem} ${router.pathname === "/dashboard" ? styles.mobileActive : ""}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        <div
          onClick={() => router.push("/discover")}
          className={`${styles.mobileNavItem} ${router.pathname === "/discover" ? styles.mobileActive : ""}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <div
          onClick={() => router.push("/my_connections")}
          className={`${styles.mobileNavItem} ${router.pathname === "/my_connections" ? styles.mobileActive : ""}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
      </nav>
    </div>
  );
}

export default DashboardLayout;