import {
  AcceptConnection,
  getMyConnectionRequests,
  getAboutUser,
  getAllUsers,
} from '@/config/redux/action/authAction';

import DashboardLayout from '@/layout/DashboardLayout';
import UserLayout from '@/layout/UserLayout';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from "./styles.module.css";
import { BASE_URL } from '@/config';
import { useRouter } from 'next/router';

function MyConnectionsPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const authState = useSelector((state) => state.auth);

  /* ---------------- API CALLS (RUN ONCE) ---------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    dispatch(getMyConnectionRequests({ token }));
    dispatch(getAboutUser({ token }));
    dispatch(getAllUsers());
  }, [authState.connections, authState.connectionRequest]);

  /* ---------------- SAFETY GUARDS ---------------- */
  const connectionRequests = Array.isArray(authState?.connectionRequest)
    ? authState.connectionRequest
    : [];

  const currentUserId = authState?.user?.userId?._id;

  if (!currentUserId) {
    return (
      <UserLayout>
        <DashboardLayout>
          <p style={{ padding: "2rem" }}>Loading connections...</p>
        </DashboardLayout>
      </UserLayout>
    );
  }

  /* ---------------- PENDING REQUESTS ---------------- */
  const pendingRequests = connectionRequests.filter(
    (c) => c?.Status_accepted === null && c?.userId?._id !== currentUserId
  );

  /* ---------------- ACCEPTED CONNECTIONS ---------------- */
  const acceptedConnections = connectionRequests.filter(
    (c) => c?.Status_accepted === true
  );

  /* ---------------- JSX ---------------- */
  return (
    <UserLayout>
      <DashboardLayout>

        <h4 className={styles.myConnectionsHeading}>My Connections</h4>

        <div
          className={styles.myConnections}
          style={{ display: "flex", flexDirection: "column", gap: "1.7rem" }}
        >
          {/* ---------------- NO PENDING ---------------- */}
          {pendingRequests.length === 0 && (
            <h2 className={styles.myConnectionsHeading}>No Connection Requests Pending</h2>
          )}

          {/* ---------------- PENDING REQUESTS ---------------- */}
          {pendingRequests.map((user, index) => (
            <div
              key={index}
              className={styles.userCard}
              onClick={() =>
                router.push(`/view_profile/${user.userId.username}`)
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div className={styles.profilePicture}>
                  <img
                    src={`${BASE_URL}/${user.userId.profilePicture}`}
                    alt={user.userId.name}
                  />
                </div>

                <div className={styles.userInfo}>
                  <h3>{user.userId.name}</h3>
                  <p>{user.userId.username}</p>
                </div>

                <button
                  className={styles.connectedButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(
                      AcceptConnection({
                        token: localStorage.getItem("token"),
                        connectionId: user._id,
                        action: "accept",
                      })
                    )
                    dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
                    ;
                  }}
                >
                  Accept
                </button>
              </div>
            </div>
          ))}

          {/* ---------------- MY NETWORK ---------------- */}
          <h4 className={styles.myConnectionsHeading}>My Network</h4>

          {acceptedConnections.map((connection, index) => {
            const isCurrentUser =
              connection?.userId?._id === currentUserId;

            const otherUser = isCurrentUser
              ? connection.connectionId
              : connection.userId;

            if (!otherUser) return null;

            return (
              <div
                key={index}
                className={styles.userCard}
                onClick={() =>
                  router.push(`/view_profile/${otherUser.username}`)
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div className={styles.profilePicture}>
                    <img
                      src={`${BASE_URL}/${otherUser.profilePicture}`}
                      alt={otherUser.name}
                    />
                  </div>

                  <div className={styles.userInfo}>
                    <h3>{otherUser.name}</h3>
                    <p>{otherUser.username}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </DashboardLayout>
    </UserLayout>
  );
}

export default MyConnectionsPage;