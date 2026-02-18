import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";

import DashboardLayout from "@/layout/DashboardLayout";
import UserLayout from "@/layout/UserLayout";
import styles from "./styles.module.css";

import {
  AcceptConnection,
  getMyConnectionRequests,
  getAboutUser,
  getAllUsers,
} from "@/config/redux/action/authAction";

import { BASE_URL } from "@/config";

function MyConnectionsPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const { connectionRequest = [], user = {} } = useSelector(
    (state) => state.auth
  );

  // 🔹 Initial data fetch (runs only once)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    dispatch(getMyConnectionRequests({ token }));
    dispatch(getAboutUser({ token }));
    dispatch(getAllUsers());
  }, [dispatch]);

  return (
    <UserLayout>
      <DashboardLayout>
        <h4>My Connections</h4>

        <div
          className={styles.myConnections}
          style={{ display: "flex", flexDirection: "column", gap: "1.7rem" }}
        >
          {/* 🔹 No pending requests */}
          {connectionRequest.length === 0 && (
            <h2>No Connection Requests Pending</h2>
          )}

          {/* 🔹 Pending Requests */}
          {connectionRequest
            ?.filter((c) => c?.Status_accepted === null)
            ?.map((connection, index) => {
              if (!connection?.userId || !user?.userId) return null;

              // avoid showing self
              if (connection.userId._id === user.userId._id) return null;

              return (
                <div
                  key={index}
                  className={styles.userCard}
                  onClick={() =>
                    router.push(`/view_profile/${connection.userId.username}`)
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div className={styles.profilePicture}>
                      <img
                        src={`${BASE_URL}/${connection.userId.profilePicture}`}
                        alt="profile"
                      />
                    </div>

                    <div className={styles.userInfo}>
                      <h3>{connection.userId.name}</h3>
                      <p>{connection.userId.username}</p>
                    </div>

                    <button
                      className={styles.connectedButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(
                          AcceptConnection({
                            token: localStorage.getItem("token"),
                            connectionId: connection._id,
                            action: "accept",
                          })
                        );
                      }}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              );
            })}

          {/* 🔹 My Network */}
          <h4>My Network</h4>

          {connectionRequest
            ?.filter((c) => c?.Status_accepted === true)
            ?.map((connection, index) => {
              if (!connection?.userId || !connection?.connectionId) return null;

              const isMe =
                user?.userId?.name === connection.connectionId?.name;

              const profileUser = isMe
                ? connection.userId
                : connection.connectionId;

              return (
                <div
                  key={index}
                  className={styles.userCard}
                  onClick={() =>
                    router.push(`/view_profile/${profileUser.username}`)
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div className={styles.profilePicture}>
                      <img
                        src={`${BASE_URL}/${profileUser.profilePicture}`}
                        alt="profile"
                      />
                    </div>

                    <div className={styles.userInfo}>
                      <h3>{profileUser.name}</h3>
                      <p>{profileUser.username}</p>
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
