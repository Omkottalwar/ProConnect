import { BASE_URL, clientServer } from '@/config';
import UserLayout from '@/layout/UserLayout';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/layout/DashboardLayout';
import { useSelector, useDispatch } from 'react-redux';
import styles from "./styles.module.css";
import { getAllPosts } from '@/config/redux/action/postAction';
import {
  getConnectionRequests,
  getMyConnectionRequests,
  sendConnectionRequest
} from '@/config/redux/action/authAction';

function ViewProfilePage({ userProfile }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const postReducer = useSelector((state) => state.posts);
  const authState = useSelector((state) => state.auth);

  const [userPosts, setUserPosts] = useState([]);
  const [isCurrentUserInConnections, setIsCurrentUserInConnections] = useState(false);
  const [isConnectionNull, setIsConnectionNull] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false); // 🔥 loading state

  // Filter posts
  useEffect(() => {
    const post = postReducer.posts.filter(
      (post) => post.userId.username === router.query.username
    );
    setUserPosts(post);
  }, [postReducer.posts, router.query.username]);

  // Check connection status
  useEffect(() => {
    if (
      authState.connections.some(
        (user) => user.connectionId._id === userProfile.userId._id
      )
    ) {
      setIsCurrentUserInConnections(true);
      if (
        authState.connections.find(
          (user) => user.connectionId._id === userProfile.userId._id
        ).Status_accepted
      ) {
        setIsConnectionNull(false);
      }
    }

    if (
      authState.connectionRequest.some(
        (user) => user.userId._id === userProfile.userId._id
      )
    ) {
      setIsCurrentUserInConnections(true);
      if (
        authState.connectionRequest.find(
          (user) => user.userId._id === userProfile.userId._id
        ).Status_accepted
      ) {
        setIsConnectionNull(false);
      }
    }
  }, [authState.connections, authState.connectionRequest, userProfile.userId._id]);

  // Initial data load
  useEffect(() => {
    dispatch(getAllPosts());
    dispatch(getConnectionRequests({ token: localStorage.getItem("token") }));
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
  }, [dispatch]);

  return (
    <UserLayout>
      <DashboardLayout>
        {/* Cover Image */}
        <div className={styles.container}>
          <div className={styles.backDropContainer}>
            <img
              src={`${BASE_URL}/${userProfile.userId.profilePicture}`}
              alt={userProfile.userId.name}
            />
          </div>
        </div>

        {/* Profile Details */}
        <div className={styles.profileContainer_details}>
          <div className={styles.profileContainer__flex}>
            <div style={{ flex: "0.8" }}>
              <div style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
                <h2>{userProfile.userId.name}</h2>
                <p style={{ color: "grey" }}>@{userProfile.userId.username}</p>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "1rem", marginBlock: "1rem" }}>
                {isCurrentUserInConnections ? (
                  <button className={styles.connectedButton}>
                    {isConnectionNull ? "Pending" : "Connected"}
                  </button>
                ) : (
                  <button
                    className={`${styles.connectBtn} ${
                      connectLoading ? styles.loadingBtn : ""
                    }`}
                    disabled={connectLoading}
                    onClick={async () => {
                      try {
                        setConnectLoading(true);
                        await dispatch(
                          sendConnectionRequest({
                            token: localStorage.getItem("token"),
                            user_id: userProfile.userId._id,
                          })
                        );
                      } finally {
                        setConnectLoading(false);
                      }
                    }}
                  >
                    {connectLoading ? "Connecting..." : "Connect"}
                  </button>
                )}

                {/* Resume Download */}
                <div
                  style={{ cursor: "pointer" }}
                  onClick={async () => {
                    const response = await clientServer.get(
                      `/user/download_resume?id=${userProfile.userId._id}`
                    );
                    window.open(`${BASE_URL}/${response.data.message}`, "_blank");
                  }}
                >
                  <svg
                    style={{ width: "1.2em" }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                </div>
              </div>

              <p>{userProfile.bio}</p>
            </div>

            {/* Recent Activity */}
            <div style={{ flex: "0.2" }}>
              <h3>Recent Activity</h3>
              {userPosts.map((post) => (
                <div key={post._id} className={styles.postCard}>
                  <div className={styles.card}></div>
                  <div className={styles.card_profileContainer}>
                    {post.media ? (
                      <img src={`${BASE_URL}/${post.media}`} alt="" />
                    ) : (
                      <div style={{ width: "3.4rem", height: "3.4rem" }} />
                    )}
                    <p>{post.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Work History */}
        <div className={styles.workHistory}>
          <h4>Work History</h4>
          <div className={styles.workHistoryConatiner}>
            {userProfile.pastWork.map((work, index) => (
              <div key={index} className={styles.workHistoryCard}>
                <p style={{ fontWeight: "bold" }}>
                  {work.company} - {work.position}
                </p>
                <p>{work.years}</p>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}

export default ViewProfilePage;

export async function getServerSideProps(context) {
  const request = await clientServer.get(
    "/user/get_profile_based_on_username",
    {
      params: { username: context.query.username },
    }
  );

  return {
    props: { userProfile: request.data.profile },
  };
}
