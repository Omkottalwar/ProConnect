import Head from "next/head";
import Image from "next/image";
import styles from "@/styles/Home.module.css";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";
import UserLayout from "@/layout/UserLayout";
const inter=Inter({subsets:["latin"]})
import Head from "next/head";


export default function Home() {
  const router=useRouter();
  return (
   
        <Head>
    <meta name="google-site-verification" content="PQ0RMPeXEJYGOYSWRddbw_7aMUgIu8z4bF_2dvdXEA4" />
      </Head>
      <UserLayout>
   
    <div className={styles.container}>
      <div className={styles.mainContainer}>
        <div className={styles.mainContainer__left}>
          <p>Connnect with Friends without  Exaggeration </p>
          <p>A True social media platform, with stories no blufs  </p>
          <div onClick={()=>{
            router.push("/login")
          }} className={styles.buttonJoin}
          > <p>Join Now</p></div>

        </div>
        <div className={styles.mainContainer__right}>
          <img style={{width:"90%"}} src="images/linkedin-network.jpg" alt="/" />

        </div>

      </div>
    </div>
    
    </UserLayout>
  );
}
