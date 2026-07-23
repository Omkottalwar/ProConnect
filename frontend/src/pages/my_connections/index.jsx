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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    dispatch(getMyConnectionRequests({ token }));
    dispatch(getAboutUser({ token }));
    dispatch(getAllUsers());
  }, [authState.connections, authState.connectionRequest]);

  const connectionRequests = Array.isArray(authState?.connectionRequest)
    ? authState.connectionRequest
    : [];

  const currentUserId = authState?.user?.userId?._id;

  if (!currentUserId) {
    return (
      <UserLayout>
        <DashboardLayout>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading connections...</p>
          </div>
        </DashboardLayout>
      </UserLayout>
    );
  }

  /* Pending Requests */
  const pendingRequests = connectionRequests.filter(
    (c) => c?.Status_accepted === null && c?.userId?._id !== currentUserId
  );

  /* Accepted Connections */
  const acceptedConnections = connectionRequests.filter(
    (c) => c?.Status_accepted === true
  );

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.connectionsContainer}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>My Network & Connections</h1>
            <p className={styles.pageSubtitle}>
              Manage your pending requests and interact with your professional network.
            </p>
          </div>

          {/* Pending Section */}
          <section className={styles.sectionBlock}>
            <h3 className={styles.sectionTitle}>
              Pending Connection Requests ({pendingRequests.length})
            </h3>

            {pendingRequests.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No pending connection requests at this time.</p>
              </div>
            ) : (
              <div className={styles.cardsList}>
                {pendingRequests.map((user, index) => (
                  <div
                    key={index}
                    className={styles.userCard}
                    onClick={() => router.push(`/view_profile/${user.userId?.username}`)}
                  >
                    <div className={styles.cardLeft}>
                      {user.userId?.profilePicture ? (
                        <img
                          src={`${BASE_URL}/${user.userId.profilePicture}`}
                          alt={user.userId?.name}
                          className={styles.profilePicture}
                        />
                      ) : (
                        <div className={styles.profileAvatarPlaceholder}>
                          {user.userId?.name?.charAt(0) || 'U'}
                        </div>
                      )}

                      <div className={styles.userInfo}>
                        <h4>{user.userId?.name}</h4>
                        <p>@{user.userId?.username}</p>
                      </div>
                    </div>

                    <button
                      className={styles.acceptBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(
                          AcceptConnection({
                            token: localStorage.getItem("token"),
                            connectionId: user._id,
                            action: "accept",
                          })
                        );
                        dispatch(getMyConnectionRequests({ token: localStorage.getItem("token") }));
                      }}
                    >
                      Accept Connection
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Accepted Network Section */}
          <section className={styles.sectionBlock}>
            <h3 className={styles.sectionTitle}>
              Connected Network ({acceptedConnections.length})
            </h3>

            {acceptedConnections.length === 0 ? (
              <div className={styles.emptyState}>
                <p>You haven't added any connections yet. Head to Discover to expand your network!</p>
              </div>
            ) : (
              <div className={styles.cardsList}>
                {acceptedConnections.map((connection, index) => {
                  const isCurrentUser = connection?.userId?._id === currentUserId;
                  const otherUser = isCurrentUser ? connection.connectionId : connection.userId;

                  if (!otherUser) return null;

                  return (
                    <div
                      key={index}
                      className={styles.userCard}
                      onClick={() => router.push(`/view_profile/${otherUser.username}`)}
                    >
                      <div className={styles.cardLeft}>
                        {otherUser.profilePicture ? (
                          <img
                            src={`${BASE_URL}/${otherUser.profilePicture}`}
                            alt={otherUser.name}
                            className={styles.profilePicture}
                          />
                        ) : (
                          <div className={styles.profileAvatarPlaceholder}>
                            {otherUser.name?.charAt(0) || 'U'}
                          </div>
                        )}

                        <div className={styles.userInfo}>
                          <h4>{otherUser.name}</h4>
                          <p>@{otherUser.username}</p>
                        </div>
                      </div>

                      <button className={styles.viewBtn}>
                        View Profile →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </DashboardLayout>
    </UserLayout>
  );
}

export default MyConnectionsPage;