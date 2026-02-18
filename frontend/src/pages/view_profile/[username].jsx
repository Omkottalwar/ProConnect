import { BASE_URL, clientServer } from '@/config';
import UserLayout from '@/layout/UserLayout';
import DashboardLayout from '@/layout/DashboardLayout';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

  const intervalRef = useRef(null);

  /* ---------------- LOAD POSTS ---------------- */
  useEffect(() => {
    const post = postReducer.posts.filter(
      (post) => post.userId.username === router.query.username
    );
    setUserPosts(post);
  }, [postReducer.posts, router.query.username]);

  /* ---------------- FETCH INITIAL DATA ---------------- */
  useEffect(() => {
    dispatch(getAllPosts());
    dispatch(getConnectionRequests({ token: localStorage.getItem("token") }));
    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
  }, [dispatch]);

  /* ---------------- START POLLING ---------------- */
  const startPolling = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      dispatch(getConnectionRequests({ token: localStorage.getItem("token") }));
      dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
    }, 3000);
  };

  /* ---------------- CHECK CONNECTION STATUS ---------------- */
  useEffect(() => {
    if (!userProfile?.userId?._id) return;

    const connected =
      authState.connections.some(
        (u) =>
          u.connectionId._id === userProfile.userId._id &&
          u.Status_accepted === true
      ) ||
      authState.connectionRequest.some(
        (u) =>
          u.userId._id === userProfile.userId._id &&
          u.Status_accepted === true
      );

    const pending =
      authState.connections.some(
        (u) => u.connectionId._id === userProfile.userId._id
      ) ||
      authState.connectionRequest.some(
        (u) => u.userId._id === userProfile.userId._id
      );

    if (pending) {
      setIsCurrentUserInConnections(true);
    }

    if (connected) {
      setIsConnectionNull(false);

      // stop polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [authState.connections, authState.connectionRequest, userProfile]);

  /* ---------------- CLEANUP ---------------- */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <UserLayout>
      <DashboardLayout>

        {/* COVER IMAGE */}
        <div className={styles.container}>
          <div className={styles.backDropContainer}>
            <img
              src={`${BASE_URL}/${userProfile.userId.profilePicture}`}
              alt={userProfile.userId.name}
            />
          </div>
        </div>

        {/* PROFILE DETAILS */}
        <div className={styles.profileContainer_details}>
          <div className={styles.profileContainer__flex}>

            {/* LEFT */}
            <div style={{ flex: "0.8" }}>
              <div style={{ display: "flex", gap: "1.2rem" }}>
                <h2>{userProfile.userId.name}</h2>
                <p style={{ color: "grey" }}>@{userProfile.userId.username}</p>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginBlock: "1rem" }}>
                {isCurrentUserInConnections ? (
                  <button className={styles.connectedButton}>
                    {isConnectionNull ? "Pending" : "Connected"}
                  </button>
                ) : (
                  <button
                    className={styles.connectBtn}
                    onClick={() => {
                      dispatch(
                        sendConnectionRequest({
                          token: localStorage.getItem("token"),
                          user_id: userProfile.userId._id
                        })
                      );
                      startPolling();
                    }}
                  >
                    Connect
                  </button>
                )}

                {/* RESUME DOWNLOAD */}
                <div
                  style={{ cursor: "pointer" }}
                  onClick={async () => {
                    const response = await clientServer.get(
                      `/user/download_resume?id=${userProfile.userId._id}`
                    );
                    window.open(`${BASE_URL}/${response.data.message}`, "_blank");
                  }}
                >
                  📄
                </div>
              </div>

              <p>{userProfile.bio}</p>
            </div>

            {/* RIGHT */}
            <div style={{ flex: "0.2" }}>
              <h3>Recent Activity</h3>
              {userPosts.map((post) => (
                <div key={post._id} className={styles.postCard}>
                  {post.media && (
                    <img src={`${BASE_URL}/${post.media}`} alt="" />
                  )}
                  <p>{post.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WORK HISTORY */}
        <div className={styles.workHistory}>
          <h4>Work History</h4>
          <div className={styles.workHistoryConatiner}>
            {userProfile.pastWork.map((work, index) => (
              <div key={index} className={styles.workHistoryCard}>
                <p><b>{work.company}</b> — {work.position}</p>
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

/* ---------------- SERVER SIDE ---------------- */
export async function getServerSideProps(context) {
  const request = await clientServer.get(
    "/user/get_profile_based_on_username",
    { params: { username: context.query.username } }
  );

  return {
    props: { userProfile: request.data.profile }
  };
}
