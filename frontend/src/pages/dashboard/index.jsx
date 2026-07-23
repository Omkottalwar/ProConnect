import { getAboutUser, getAllUsers } from '@/config/redux/action/authAction';
import { getAllComments, getAllPosts, incrementPostLikes, postComment, createPost, deletePost } from '@/config/redux/action/postAction';
import DashboardLayout from '@/layout/DashboardLayout';
import UserLayout from '@/layout/UserLayout';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from "./index.module.css";
import { BASE_URL } from '@/config';
import { resetPostId } from '@/config/redux/reducer/postReducer';
import { PostSkeleton } from '@/Components/Skeleton';
import Toast from '@/Components/Toast';

function Dashboard() {
  const router = useRouter();
  const dispatch = useDispatch();

  const authState = useSelector((state) => state.auth);
  const postState = useSelector((state) => state.posts);

  const [postContent, setPostContent] = useState("");
  const [fileContent, setFileContent] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [sharePost, setSharePost] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Toast Helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (authState.isTokenThere) {
      dispatch(getAllPosts());
      dispatch(getAboutUser({ token: localStorage.getItem("token") }));
    }
    if (!authState.all_profiles_fetched) {
      dispatch(getAllUsers());
    }
  }, [authState.isTokenThere]);

  const handleUpload = async () => {
    if (!postContent.trim() && !fileContent) return;
    setIsPosting(true);
    try {
      await dispatch(createPost({ body: postContent, file: fileContent }));
      setFileContent(null);
      setPostContent("");
      addToast("Post published successfully! 🚀", "success");
      dispatch(getAllPosts());
    } catch (e) {
      addToast("Failed to create post. Please try again.", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId) => {
    const res = await dispatch(incrementPostLikes({ post_id: postId }));
    if (res.payload?.liked === true) {
      addToast("Post liked! ❤️", "success");
    } else if (res.payload?.liked === false) {
      addToast("Post unliked.", "info");
    } else {
      addToast("Updated like!", "success");
    }
    dispatch(getAllPosts());
  };

  const handleDelete = async (postId) => {
    await dispatch(deletePost({ post_id: postId }));
    addToast("Post deleted.", "info");
    dispatch(getAllPosts());
  };

  if (!authState.user) {
    return (
      <UserLayout>
        <DashboardLayout>
          <div className={styles.container}>
            <PostSkeleton />
            <PostSkeleton />
          </div>
        </DashboardLayout>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <DashboardLayout>
        <div className={styles.container}>
          {/* Toast Notification Container */}
          <Toast toasts={toasts} onClose={removeToast} />

          {/* Create Post Card */}
          <div className={styles.createPostCard}>
            <div className={styles.createPostTop}>
              {authState.user.userId?.profilePicture ? (
                <img
                  className={styles.userProfile}
                  src={`${BASE_URL}/${authState.user.userId.profilePicture}`}
                  alt="avatar"
                />
              ) : (
                <div className={styles.userProfilePlaceholder}>
                  {authState.user.userId?.name?.charAt(0) || 'U'}
                </div>
              )}
              <textarea
                onChange={(e) => setPostContent(e.target.value)}
                value={postContent}
                placeholder="What's on your mind? Share an update with the community..."
                className={styles.textAreaOfContent}
              />
            </div>

            {fileContent && (
              <div className={styles.fileSelectedBadge}>
                <span>📎 Attachment: {fileContent.name}</span>
                <button type="button" onClick={() => setFileContent(null)}>✕</button>
              </div>
            )}

            <div className={styles.createPostBottom}>
              <label htmlFor="fileUpload" className={styles.attachFileBtn}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
                <span>Add Photo / Media</span>
              </label>
              <input
                onChange={(e) => setFileContent(e.target.files[0])}
                type="file"
                hidden
                id="fileUpload"
              />

              {(postContent.trim().length > 0 || fileContent) && (
                <button
                  onClick={handleUpload}
                  disabled={isPosting}
                  className={styles.uploadButton}
                >
                  {isPosting ? "Posting..." : "Publish Post"}
                </button>
              )}
            </div>
          </div>

          {/* Posts Feed / Skeleton */}
          <div className={styles.postFeed}>
            {postState.posts.length === 0 ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : (
              postState.posts.map((post) => {
                const isOwner = post.userId?._id === authState.user?.userId?._id;
                const currentUserId = authState.user?.userId?._id?.toString();
                const isLikedByMe = Array.isArray(post.likedBy) && post.likedBy.some(id => 
                  (typeof id === 'object' ? id._id || id.id : id).toString() === currentUserId
                );

                return (
                  <article key={post._id} className={styles.singleCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.authorInfo}>
                        {post.userId?.profilePicture ? (
                          <img
                            onClick={() => router.push(`/view_profile/${post.userId?.username}`)}
                            className={styles.authorAvatar}
                            src={`${BASE_URL}/${post.userId.profilePicture}`}
                            alt={post.userId?.name}
                          />
                        ) : (
                          <div
                            onClick={() => router.push(`/view_profile/${post.userId?.username}`)}
                            className={styles.authorAvatarPlaceholder}
                          >
                            {post.userId?.name?.charAt(0) || 'U'}
                          </div>
                        )}

                        <div className={styles.authorDetails}>
                          <h4
                            onClick={() => router.push(`/view_profile/${post.userId?.username}`)}
                            className={styles.authorName}
                          >
                            {post.userId?.name}
                          </h4>
                          <span className={styles.authorHandle}>@{post.userId?.username}</span>
                        </div>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleDelete(post._id)}
                          className={styles.deletePostBtn}
                          title="Delete Post"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <p className={styles.postBody}>{post.body}</p>

                    {post.media && post.media !== "" && (
                      <div className={styles.postMediaWrapper}>
                        <img
                          className={styles.postMedia}
                          src={`${BASE_URL}/${post.media}`}
                          alt="attachment"
                        />
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className={styles.optionsContainer}>
                      <button
                        onClick={() => handleLike(post._id)}
                        className={`${styles.actionBtn} ${isLikedByMe ? styles.likedActionBtn : ""}`}
                      >
                        {isLikedByMe ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                          </svg>
                        )}
                        <span>{post.likes || 0} {isLikedByMe ? "Liked" : "Likes"}</span>
                      </button>

                      <button
                        onClick={() => dispatch(getAllComments({ post_id: post._id }))}
                        className={styles.actionBtn}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                        </svg>
                        <span>Comments</span>
                      </button>

                      <button
                        onClick={() => setSharePost(post)}
                        className={styles.actionBtn}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                        </svg>
                        <span>Share</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Comments Modal Overlay */}
          {postState.postId !== "" && (
            <div
              onClick={() => dispatch(resetPostId())}
              className={styles.commentsContainer}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className={styles.allCommentsContainer}
              >
                <div className={styles.modalHeader}>
                  <h3>Discussion & Comments</h3>
                  <button onClick={() => dispatch(resetPostId())}>✕</button>
                </div>

                <div className={styles.commentsList}>
                  {postState.comments.length === 0 ? (
                    <div className={styles.noComments}>
                      <p>No comments yet. Be the first to share your thoughts!</p>
                    </div>
                  ) : (
                    postState.comments.map((comment) => (
                      <div key={comment._id} className={styles.singleComment}>
                        {comment.userId?.profilePicture ? (
                          <img
                            src={`${BASE_URL}/${comment.userId.profilePicture}`}
                            alt="avatar"
                            className={styles.commentAvatar}
                          />
                        ) : (
                          <div className={styles.commentAvatarPlaceholder}>
                            {comment.userId?.name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div className={styles.commentContent}>
                          <div className={styles.commentAuthorRow}>
                            <span className={styles.commentAuthorName}>{comment.userId?.name}</span>
                            <span className={styles.commentAuthorHandle}>@{comment.userId?.username}</span>
                          </div>
                          <p className={styles.commentBodyText}>{comment.body}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.postCommentContainer}>
                  <input
                    value={commentText}
                    type="text"
                    placeholder="Write a constructive comment..."
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && commentText.trim()) {
                        await dispatch(postComment({ post_id: postState.postId, body: commentText }));
                        await dispatch(getAllComments({ post_id: postState.postId }));
                        setCommentText("");
                        addToast("Comment posted!", "success");
                      }
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (!commentText.trim()) return;
                      await dispatch(postComment({ post_id: postState.postId, body: commentText }));
                      await dispatch(getAllComments({ post_id: postState.postId }));
                      setCommentText("");
                      addToast("Comment posted!", "success");
                    }}
                    className={styles.postCommentBtn}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Share Modal Overlay */}
          {sharePost && (
            <div onClick={() => setSharePost(null)} className={styles.commentsContainer}>
              <div onClick={(e) => e.stopPropagation()} className={styles.shareModalContent}>
                <div className={styles.modalHeader}>
                  <h3>Share Post</h3>
                  <button onClick={() => setSharePost(null)}>✕</button>
                </div>

                <div className={styles.sharePreviewCard}>
                  <p>"{sharePost.body}"</p>
                </div>

                <div className={styles.shareGrid}>
                  {/* WhatsApp */}
                  <button
                    className={`${styles.shareOptionBtn} ${styles.shareWhatsapp}`}
                    onClick={() => {
                      const text = encodeURIComponent(`Check out this post on ProConnect:\n"${sharePost.body}"\n${window.location.origin}/dashboard`);
                      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                      addToast("Opening WhatsApp...", "info");
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </button>

                  {/* Instagram / Copy for Stories */}
                  <button
                    className={`${styles.shareOptionBtn} ${styles.shareInstagram}`}
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/dashboard`;
                      navigator.clipboard.writeText(`"${sharePost.body}" - Read on ProConnect: ${shareUrl}`);
                      window.open("https://www.instagram.com/", '_blank');
                      addToast("Copied post for Instagram! Opening Instagram...", "success");
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span>Instagram</span>
                  </button>

                  {/* Twitter (X) */}
                  <button
                    className={`${styles.shareOptionBtn} ${styles.shareTwitter}`}
                    onClick={() => {
                      const text = encodeURIComponent(`"${sharePost.body}"`);
                      const url = encodeURIComponent(`${window.location.origin}/dashboard`);
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                      addToast("Opening Twitter...", "info");
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Twitter (X)</span>
                  </button>

                  {/* LinkedIn */}
                  <button
                    className={`${styles.shareOptionBtn} ${styles.shareLinkedin}`}
                    onClick={() => {
                      const url = encodeURIComponent(`${window.location.origin}/dashboard`);
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
                      addToast("Opening LinkedIn...", "info");
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                    </svg>
                    <span>LinkedIn</span>
                  </button>
                </div>

                <div className={styles.copyLinkRow}>
                  <input
                    readOnly
                    type="text"
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`}
                    className={styles.copyLinkInput}
                  />
                  <button
                    className={styles.copyLinkBtn}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/dashboard`);
                      addToast("Link copied to clipboard! 📋", "success");
                    }}
                  >
                    Copy Link
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

export default Dashboard;