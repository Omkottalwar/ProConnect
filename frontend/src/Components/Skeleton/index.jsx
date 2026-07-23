import React from 'react';
import styles from './styles.module.css';

export function PostSkeleton() {
  return (
    <div className={styles.skeletonPostCard}>
      <div className={styles.skeletonHeader}>
        <div className={`skeleton ${styles.skeletonAvatar}`} />
        <div className={styles.skeletonMeta}>
          <div className={`skeleton ${styles.skeletonLine} ${styles.titleLine}`} />
          <div className={`skeleton ${styles.skeletonLine} ${styles.subtitleLine}`} />
        </div>
      </div>
      <div className={`skeleton ${styles.contentLine}`} />
      <div className={`skeleton ${styles.shortLine}`} />
      <div className={`skeleton ${styles.skeletonMedia}`} />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className={styles.skeletonPostCard}>
      <div className={`skeleton ${styles.skeletonMedia}`} style={{ height: '140px' }} />
      <div className={styles.skeletonHeader} style={{ marginTop: '-30px' }}>
        <div className={`skeleton ${styles.skeletonAvatar}`} style={{ width: '80px', height: '80px' }} />
      </div>
      <div className={`skeleton ${styles.contentLine}`} style={{ width: '50%' }} />
      <div className={`skeleton ${styles.shortLine}`} style={{ width: '30%' }} />
    </div>
  );
}
