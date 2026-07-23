import { BASE_URL } from '@/config';
import { getAllUsers, getAboutUser } from '@/config/redux/action/authAction';
import DashboardLayout from '@/layout/DashboardLayout';
import UserLayout from '@/layout/UserLayout';
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from "./index.module.css";
import { useRouter } from 'next/router';
import { getAllPosts } from '@/config/redux/action/postAction';

function Discoverpage() {
  const authState = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!authState.all_profiles_fetched) {
      dispatch(getAllUsers());
      dispatch(getAllPosts());
      dispatch(getAboutUser({ token: localStorage.getItem("token") }));
    }
  }, [authState.all_profiles_fetched, dispatch]);

  /* Live filter */
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return [];
    return authState.all_users.filter((user) =>
      user.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, authState.all_users]);

  const handleSearch = () => {
    setSearchResults(filteredUsers);
    setShowSuggestions(false);
  };

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.discoverContainer}>
          <div className={styles.discoverHeader}>
            <div>
              <h1 className={styles.discoverTitle}>Discover Professionals</h1>
              <p className={styles.discoverSubtitle}>
                Search and connect with genuine industry peers across the network.
              </p>
            </div>
          </div>

          {/* Search Bar Container */}
          <div className={styles.searchWrapper}>
            <div className={styles.searchInputGroup}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.searchIcon}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>

              <input
                className={styles.searchInput}
                placeholder="Search by name, username, or role..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />

              {searchTerm && (
                <button
                  className={styles.clearSearchBtn}
                  onClick={() => {
                    setSearchTerm("");
                    setSearchResults([]);
                  }}
                >
                  ✕
                </button>
              )}

              <button className={styles.searchButton} onClick={handleSearch}>
                Search
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && searchTerm && (
              <div className={styles.suggestionBox}>
                {filteredUsers.length === 0 ? (
                  <div className={styles.noResult}>No matching profiles found</div>
                ) : (
                  filteredUsers.slice(0, 5).map((user) => (
                    <div
                      key={user._id}
                      className={styles.suggestionItem}
                      onClick={() => router.push(`/view_profile/${user.userId?.username}`)}
                    >
                      {user.userId?.profilePicture ? (
                        <img src={`${BASE_URL}/${user.userId.profilePicture}`} alt="avatar" />
                      ) : (
                        <div className={styles.suggestionAvatarPlaceholder}>
                          {user.userId?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <p>{user.userId?.name}</p>
                        <span>@{user.userId?.username}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Search Results Display */}
          {searchResults.length > 0 && (
            <div className={styles.sectionBlock}>
              <h2 className={styles.resultHeading}>Search Results ({searchResults.length})</h2>
              <div className={styles.userGrid}>
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    className={styles.userCard}
                    onClick={() => router.push(`/view_profile/${user.userId?.username}`)}
                  >
                    <div className={styles.userCardHeader}>
                      {user.userId?.profilePicture ? (
                        <img
                          className={styles.userCardImage}
                          src={`${BASE_URL}/${user.userId.profilePicture}`}
                          alt="profile"
                        />
                      ) : (
                        <div className={styles.userCardAvatarPlaceholder}>
                          {user.userId?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className={styles.userCardBody}>
                      <h4>{user.userId?.name}</h4>
                      <p>@{user.userId?.username}</p>
                      <button className={styles.viewProfileBtn}>View Profile</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Users Grid */}
          {searchResults.length === 0 && (
            <div className={styles.sectionBlock}>
              <h2 className={styles.resultHeading}>Explore Members</h2>
              <div className={styles.userGrid}>
                {authState.all_profiles_fetched &&
                  authState.all_users.map((user) => (
                    <div
                      key={user._id}
                      className={styles.userCard}
                      onClick={() => router.push(`/view_profile/${user.userId?.username}`)}
                    >
                      <div className={styles.userCardHeader}>
                        {user.userId?.profilePicture ? (
                          <img
                            className={styles.userCardImage}
                            src={`${BASE_URL}/${user.userId.profilePicture}`}
                            alt="profile"
                          />
                        ) : (
                          <div className={styles.userCardAvatarPlaceholder}>
                            {user.userId?.name?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className={styles.userCardBody}>
                        <h4>{user.userId?.name}</h4>
                        <p>@{user.userId?.username}</p>
                        <button className={styles.viewProfileBtn}>View Profile →</button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}

export default Discoverpage;