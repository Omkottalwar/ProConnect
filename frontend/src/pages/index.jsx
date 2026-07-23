import Head from "next/head";
import styles from "@/styles/Home.module.css";
import { useRouter } from "next/router";
import UserLayout from "@/layout/UserLayout";

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>ProConnect - Authentic Professional Networking</title>
        <meta name="description" content="Connect with real professionals without noise or exaggeration." />
      </Head>

      <UserLayout>
        <div className={styles.container}>
          {/* Background Glows */}
          <div className={styles.glowTop}></div>
          <div className={styles.glowBottom}></div>

          <div className={styles.heroSection}>
            <div className={styles.heroLeft}>
              <h1 className={styles.heroHeading}>
                Connect with Professionals <span className={styles.gradientText}>Without Exaggeration</span>
              </h1>

              <p className={styles.heroSubheading}>
                A true social media platform engineered for genuine careers, real stories, and meaningful industry connections.
              </p>

              <div className={styles.ctaGroup}>
                <button
                  onClick={() => router.push("/login")}
                  className={styles.primaryCta}
                >
                  Join ProConnect Now
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </button>

                <button
                  onClick={() => router.push("/login")}
                  className={styles.secondaryCta}
                >
                  Explore Dashboard
                </button>
              </div>

              {/* Stats Bar */}
              <div className={styles.statsBar}>
                <div className={styles.statItem}>
                  <h4>100%</h4>
                  <p>Verified Stories</p>
                </div>
                <div className={styles.statDivider}></div>
                <div className={styles.statItem}>
                  <h4>Zero</h4>
                  <p>Algorithmic Noise</p>
                </div>
                <div className={styles.statDivider}></div>
                <div className={styles.statItem}>
                  <h4>Direct</h4>
                  <p>Peer Connections</p>
                </div>
              </div>
            </div>

            {/* Right Interactive Mock Card */}
            <div className={styles.heroRight}>
              <div className={styles.mockCardWrapper}>
                <div className={styles.mockHeader}>
                  <div className={styles.mockUser}>
                    <div className={styles.mockAvatar}>AS</div>
                    <div>
                      <h5>Aarav Sharma</h5>
                      <p>Lead Systems Architect</p>
                    </div>
                  </div>
                  <span className={styles.statusTag}>Connected</span>
                </div>

                <p className={styles.mockBody}>
                  Just deployed our new high-throughput microservices architecture with 99.99% uptime. Excited to share insights with the community! 🚀
                </p>

                <div className={styles.mockMetrics}>
                  <div className={styles.metric}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904" />
                    </svg>
                    <span>142 Endorsements</span>
                  </div>
                  <div className={styles.metric}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 007.5 20.25h4.5z" />
                    </svg>
                    <span>38 Comments</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UserLayout>
    </>
  );
}

