import { BASE_URL } from '@/config';
import { getAllUsers } from '@/config/redux/action/authAction';
import DashboardLayout from '@/layout/DashboardLayout';
import UserLayout from '@/layout/UserLayout';
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from "./index.module.css"
import { useRouter } from 'next/router';
import { getAllPosts } from '@/config/redux/action/postAction';
import { getAboutUser } from '@/config/redux/action/authAction';

function Discoverpage() {
  const authState = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!authState.all_profiles_fetched ) {
      dispatch(getAllUsers());
       dispatch(getAllPosts())
                  dispatch(getAboutUser({token:localStorage.getItem("token")}))
      
    }
  }, [authState.all_profiles_fetched, dispatch]);

  /* 🔍 Live filter */
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return [];
    return authState.all_users.filter((user) =>
      user.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, authState.all_users]);

  /* 🔎 Search button */
  const handleSearch = () => {
    setSearchResults(filteredUsers);
    setShowSuggestions(false);
  };

  return (
    <UserLayout>
      <DashboardLayout>

        {/* 🔍 Search Section */}
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            placeholder="Search for people"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />

          <button className={styles.searchButton} onClick={handleSearch}>
            Search
          </button>

          {/* 🔹 Suggestions */}
          {showSuggestions && searchTerm && (
            <div className={styles.suggestionBox}>
              {filteredUsers.slice(0, 5).map((user) => (
                <div
                  key={user._id}
                  className={styles.suggestionItem}
                  onClick={() =>
                    router.push(`/view_profile/${user.userId.username}`)
                  }
                >
                  <img src={`${BASE_URL}/${user.userId.profilePicture}`} />
                  <div>
                    <p>{user.userId.name}</p>
                    <span>@{user.userId.username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 📌 Search Results */}
        {searchResults.length > 0 && (
          <>
            <h2 className={styles.resultHeading}>
              Search Results
            </h2>

            <div className={styles.resultList}>
              {searchResults.map((user) => (
                <div
                  key={user._id}
                  className={styles.resultItem}
                  onClick={() =>
                    router.push(`/view_profile/${user.userId.username}`)
                  }
                >
                  <img
                    src={`${BASE_URL}/${user.userId.profilePicture}`}
                    alt={user.userId.username}
                  />
                  <div>
                    <h4>{user.userId.name}</h4>
                    <p>@{user.userId.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h1 className={styles.h1}>Discover</h1>

        {/* 👥 Default User Grid */}
        {searchResults.length === 0 && (
          <div className={styles.allUserProfile}>
            {authState.all_profiles_fetched &&
              authState.all_users.map((user) => (
                <div
                  key={user._id}
                  className={styles.userCard}
                  onClick={() =>
                    router.push(`/view_profile/${user.userId.username}`)
                  }
                >
                  <img
                    className={styles.userCard__image}
                    src={`${BASE_URL}/${user.userId.profilePicture}`}
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h1 style={{ fontSize: "10px" }}>{user.userId.name}</h1>
                    <p>@{user.userId.username}</p>
                  </div>
                </div>
              ))}
          </div>
        )}

      </DashboardLayout>
    </UserLayout>
  );
}

export default Discoverpage;