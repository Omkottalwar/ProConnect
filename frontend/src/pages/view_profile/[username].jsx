import { BASE_URL, clientServer } from '@/config';
import UserLayout from '@/layout/UserLayout';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/layout/DashboardLayout';
import { useSelector, useDispatch } from 'react-redux';
import styles from "./styles.module.css";
import { getAllPosts } from '@/config/redux/action/postAction';
import { getConnectionRequests, getMyConnectionRequests, sendConnectionRequest, getAboutUser, getAllUsers } from '@/config/redux/action/authAction';

function ViewProfilePage({ userProfile }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const postReducer = useSelector((state) => state.posts);
  const authState = useSelector((state) => state.auth);

  const [userPosts, setUserPosts] = useState([]);
  const [isCurrentUserInConnections, setIsCurrentUserInConnections] = useState(false);
  const [isConnectionNull, setIsConnectionNull] = useState(true);

  useEffect(() => {
    if (userProfile?.userId?.username && postReducer.posts) {
      const posts = postReducer.posts.filter(
        (p) => p.userId?.username === userProfile.userId.username
      );
      setUserPosts(posts);
    }
  }, [postReducer.posts, userProfile]);

  useEffect(() => {
    dispatch(getAllPosts());
    dispatch(getAboutUser({ token: localStorage.getItem("token") }));

    if (userProfile?.userId?._id) {
      if (authState.connections.some((u) => u.connectionId?._id === userProfile.userId._id)) {
        setIsCurrentUserInConnections(true);
        if (authState.connections.find((u) => u.connectionId?._id === userProfile.userId._id)?.Status_accepted === true) {
          setIsConnectionNull(false);
        }
      }

      if (authState.connectionRequest.some((u) => u.userId?._id === userProfile.userId._id)) {
        setIsCurrentUserInConnections(true);
        if (authState.connectionRequest.find((u) => u.userId?._id === userProfile.userId._id)?.Status_accepted === true) {
          setIsConnectionNull(false);
        }
      }
    }
  }, [authState.connections, authState.connectionRequest, userProfile]);

  useEffect(() => {
    dispatch(getAllPosts());
    dispatch(getConnectionRequests({ token: localStorage.getItem("token") }));
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
    dispatch(getAllUsers());
  }, []);

  if (!userProfile || !userProfile.userId) {
    return (
      <UserLayout>
        <DashboardLayout>
          <div className={styles.loadingState}>
            <p>Profile not found.</p>
          </div>
        </DashboardLayout>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.profileWrapper}>
          {/* Backdrop Banner */}
          <div className={styles.coverBanner}>
            <div className={styles.avatarWrapper}>
              {userProfile.userId.profilePicture ? (
                <img
                  src={`${BASE_URL}/${userProfile.userId.profilePicture}`}
                  alt={userProfile.userId.name}
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {userProfile.userId.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className={styles.mainGrid}>
            <div className={styles.leftCol}>
              {/* Profile Header Box */}
              <div className={styles.profileHeaderBox}>
                <div>
                  <h2 className={styles.userName}>{userProfile.userId.name}</h2>
                  <p className={styles.userHandle}>@{userProfile.userId.username}</p>
                </div>

                <div className={styles.actionRow}>
                  {isCurrentUserInConnections ? (
                    <button className={styles.connectedBtn} disabled>
                      {isConnectionNull ? "Pending Request" : "Connected ✓"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        dispatch(sendConnectionRequest({ token: localStorage.getItem("token"), user_id: userProfile.userId._id }));
                        dispatch(getConnectionRequests({ token: localStorage.getItem("token") }));
                        dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
                      }}
                      className={styles.connectBtn}
                    >
                      + Connect
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      try {
                        const response = await clientServer.get(`/user/download_resume?id=${userProfile.userId._id}`);
                        if (response.data?.message) {
                          window.open(`${BASE_URL}/${response.data.message}`, '_blank');
                        }
                      } catch (e) {
                        console.error("Resume download error", e);
                      }
                    }}
                    className={styles.resumeBtn}
                  >
                    📄 Resume
                  </button>
                </div>
              </div>

              {/* Bio Box */}
              <div className={styles.bioCard}>
                <h4>About</h4>
                <p>{userProfile.bio || "No bio available."}</p>
              </div>

              {/* Work Experience */}
              <div className={styles.workCard}>
                <h4>Work History</h4>
                <div className={styles.workList}>
                  {userProfile.pastWork && userProfile.pastWork.length > 0 ? (
                    userProfile.pastWork.map((work, index) => (
                      <div key={index} className={styles.workItem}>
                        <div className={styles.workIcon}>🏢</div>
                        <div>
                          <h5>{work.position || "Role"}</h5>
                          <p className={styles.companyName}>{work.company || "Company"}</p>
                          <span className={styles.duration}>{work.years || "Years"}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={styles.noWork}>No work experience listed.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Activity Sidebar */}
            <div className={styles.rightCol}>
              <div className={styles.activityCard}>
                <h4>Recent Activity ({userPosts.length})</h4>
                <div className={styles.activityList}>
                  {userPosts.length === 0 ? (
                    <p className={styles.noActivity}>No public posts.</p>
                  ) : (
                    userPosts.map((post) => (
                      <div key={post._id} className={styles.activityItem}>
                        <p>{post.body}</p>
                        {post.media && post.media !== "" && (
                          <img src={`${BASE_URL}/${post.media}`} alt="post attachment" className={styles.activityMedia} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}

export default ViewProfilePage;

export async function getServerSideProps(context) {
  try {
    const request = await clientServer.get("/user/get_profile_based_on_username", {
      params: { username: context.query.username }
    });
    return { props: { userProfile: request.data.profile } };
  } catch (e) {
    return { props: { userProfile: null } };
  }
}