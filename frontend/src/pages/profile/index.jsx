import DashboardLayout from '@/layout/DashboardLayout';
import UserLayout from '@/layout/UserLayout';
import React, { useState, useEffect } from 'react';
import styles from "./index.module.css";
import { useDispatch, useSelector } from 'react-redux';
import { getAboutUser } from '@/config/redux/action/authAction';
import { BASE_URL, clientServer } from '@/config';
import { getAllPosts } from '@/config/redux/action/postAction';
import { getAllUsers } from '@/config/redux/action/authAction';
import Toast from '@/Components/Toast';
import { ProfileSkeleton } from '@/Components/Skeleton';

function ProfilePage() {
  const authState = useSelector((state) => state.auth);
  const postReducer = useSelector((state) => state.posts);

  const [userProfile, setUserProfile] = useState({});
  const [userPosts, setUserPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputData, setInputData] = useState({ company: "", position: "", years: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [toasts, setToasts] = useState([]);

  const dispatch = useDispatch();

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const handleWorkInputChange = (e) => {
    const { name, value } = e.target;
    setInputData({ ...inputData, [name]: value });
  };

  useEffect(() => {
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));
    dispatch(getAllPosts());
    dispatch(getAllUsers());
  }, [dispatch]);

  useEffect(() => {
    if (authState.user) {
      setUserProfile(authState.user);
      const post = postReducer.posts.filter((p) => {
        return p.userId?.username === authState.user.userId?.username;
      });
      setUserPosts(post);
    }
  }, [authState.user, postReducer.posts]);

  const updateProfilePicture = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('profile_picture', file);
    formData.append("token", localStorage.getItem("token"));

    await clientServer.post("update_profile_picture", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    addToast("Profile picture updated!", "success");
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));
  };

  const updateProfileData = async () => {
    await clientServer.post("/user_update", {
      token: localStorage.getItem("token"),
      name: userProfile.userId.name
    });

    await clientServer.post("/update_profile_data", {
      token: localStorage.getItem("token"),
      bio: userProfile.bio,
      currentWork: userProfile.currentWork,
      pastWork: userProfile.pastWork,
      education: userProfile.education
    });

    addToast("Profile saved successfully!", "success");
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));
    setIsEditing(false);
  };

  if (!authState.user || !userProfile.userId) {
    return (
      <UserLayout>
        <DashboardLayout>
          <ProfileSkeleton />
        </DashboardLayout>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.profileWrapper}>
          <Toast toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

          {/* Backdrop Cover Banner */}
          <div className={styles.coverBanner}>
            <label htmlFor="ProfilePictureUpload" className={styles.avatarWrapper}>
              {userProfile.userId?.profilePicture ? (
                <img
                  src={`${BASE_URL}/${userProfile.userId.profilePicture}`}
                  alt={userProfile.userId?.name}
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {userProfile.userId?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className={styles.avatarOverlay}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0c-.693.04-1.336.425-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </div>
            </label>
            <input
              onChange={(e) => updateProfilePicture(e.target.files[0])}
              type="file"
              id="ProfilePictureUpload"
              hidden
            />
          </div>

          {/* Profile Details Header Box */}
          <div className={styles.profileHeaderCard}>
            <div className={styles.headerTopRow}>
              <div>
                <input
                  className={`${styles.nameInput} ${isEditing ? styles.editable : ""}`}
                  type="text"
                  value={userProfile.userId.name}
                  disabled={!isEditing}
                  onChange={(e) => {
                    setUserProfile({
                      ...userProfile,
                      userId: { ...userProfile.userId, name: e.target.value }
                    });
                  }}
                />
                <p className={styles.usernameHandle}>@{userProfile.userId.username}</p>
              </div>

              <button
                className={`${styles.editProfileBtn} ${isEditing ? styles.saveActive : ""}`}
                onClick={() => {
                  if (isEditing) {
                    updateProfileData();
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                {isEditing ? "Save Changes" : "Edit Profile"}
              </button>
            </div>

            {/* Stats Bar */}
            <div className={styles.statsRow}>
              <div className={styles.statCell}>
                <span className={styles.statVal}>{userPosts.length}</span>
                <span className={styles.statLbl}>Posts</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statVal}>{authState.connections?.length || 0}</span>
                <span className={styles.statLbl}>Connections</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statVal}>Verified</span>
                <span className={styles.statLbl}>Status</span>
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className={styles.tabNav}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'posts' ? styles.activeTab : ""}`}
                onClick={() => setActiveTab('posts')}
              >
                Published Posts ({userPosts.length})
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'work' ? styles.activeTab : ""}`}
                onClick={() => setActiveTab('work')}
              >
                Work Experience
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'about' ? styles.activeTab : ""}`}
                onClick={() => setActiveTab('about')}
              >
                About & Bio
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className={styles.tabContentArea}>
            {activeTab === 'posts' && (
              <div className={styles.postsTabList}>
                {userPosts.length === 0 ? (
                  <div className={styles.emptyTabState}>
                    <p>No posts published yet.</p>
                  </div>
                ) : (
                  userPosts.map((post) => (
                    <article key={post._id} className={styles.profilePostCard}>
                      <p className={styles.postText}>{post.body}</p>
                      {post.media && post.media !== "" && (
                        <img
                          src={`${BASE_URL}/${post.media}`}
                          alt="post media"
                          className={styles.postMediaImage}
                        />
                      )}
                    </article>
                  ))
                )}
              </div>
            )}

            {activeTab === 'work' && (
              <div className={styles.workTabSection}>
                <div className={styles.workHeaderRow}>
                  <h4>Professional Career & History</h4>
                  {isEditing && (
                    <button
                      className={styles.addWorkBtn}
                      onClick={() => setIsModalOpen(true)}
                    >
                      + Add Position
                    </button>
                  )}
                </div>

                <div className={styles.workGrid}>
                  {userProfile.pastWork && userProfile.pastWork.length > 0 ? (
                    userProfile.pastWork.map((work, index) => (
                      <div key={index} className={styles.workCardItem}>
                        <div className={styles.workIconBox}>🏢</div>
                        <div>
                          <h5>{work.position || "Title"}</h5>
                          <p className={styles.companyName}>{work.company || "Company"}</p>
                          <span className={styles.workYears}>{work.years || "Years"}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyTabState}>
                      <p>No work history added yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className={styles.aboutTabCard}>
                <h4>Career Bio & Summary</h4>
                <textarea
                  value={userProfile.bio || ""}
                  placeholder={isEditing ? "Write a short bio about your background..." : "No bio specified."}
                  disabled={!isEditing}
                  onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })}
                  className={styles.bioTextArea}
                />
              </div>
            )}
          </div>

          {/* Add Work Modal */}
          {isModalOpen && (
            <div onClick={() => setIsModalOpen(false)} className={styles.modalOverlay}>
              <div onClick={(e) => e.stopPropagation()} className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h3>Add Work Experience</h3>
                  <button onClick={() => setIsModalOpen(false)}>✕</button>
                </div>

                <div className={styles.modalBody}>
                  <input
                    onChange={handleWorkInputChange}
                    name="company"
                    className={styles.modalInput}
                    type="text"
                    placeholder="Company Name"
                  />
                  <input
                    onChange={handleWorkInputChange}
                    name="position"
                    className={styles.modalInput}
                    type="text"
                    placeholder="Role / Position"
                  />
                  <input
                    onChange={handleWorkInputChange}
                    name="years"
                    className={styles.modalInput}
                    type="text"
                    placeholder="Duration"
                  />

                  <button
                    onClick={() => {
                      setUserProfile({
                        ...userProfile,
                        pastWork: [...(userProfile.pastWork || []), inputData]
                      });
                      setIsModalOpen(false);
                      addToast("Experience added to draft! Click Save Changes.", "info");
                    }}
                    className={styles.modalSubmitBtn}
                  >
                    Add Position
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}

export default ProfilePage;