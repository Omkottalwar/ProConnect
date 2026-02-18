import { BASE_URL, clientServer } from '@/config';
import UserLayout from '@/layout/UserLayout';
import { useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Dashboard from '../dashboard';
import { useRouter } from 'next/router';
import DashboardLayout from '@/layout/DashboardLayout';
import { useSelector } from 'react-redux';
import styles from "./styles.module.css"
import { useDispatch } from 'react-redux';
import { getAllPosts } from '@/config/redux/action/postAction';
import { getConnectionRequests, getMyConnectionRequests, sendConnectionRequest } from '@/config/redux/action/authAction';
import { combineSlices, current } from '@reduxjs/toolkit';
function ViewProfilePage({userProfile}) {
    console.log("heeloo",userProfile)
    const router =useRouter();
    const postReducer=useSelector((state)=>state.posts)
    const dispatch=useDispatch();
    const authState=useSelector((state)=>state.auth)
    const [userPosts,setUserPosts]=useState([]);
    const [isCurrentUserInConnections,setIsCurrentUserInConnections]=useState(false);
    const [isConnectionNull,setIsConnectionNull]=useState(true);
  useEffect(()=>{
    let post =postReducer.posts.filter((post)=>{
        return post.userId.username===router.query.username
    })
    setUserPosts(post);
  },[postReducer.posts])
useEffect(()=>{
    console.log(authState.connections,userProfile.userId._id)
    if(authState.connections.some(user=>user.connectionId._id===userProfile.userId._id)){
        setIsCurrentUserInConnections(true);
        if(authState.connections.find(user=>user.connectionId._id===userProfile.userId._id).Status_accepted===true){
           setIsConnectionNull(false);
        }

}
 if(authState.connectionRequest.some(user=>user.userId._id===userProfile.userId._id)){
    setIsCurrentUserInConnections(true);
    if(authState.connectionRequest.find(user=>user.userId._id===userProfile.userId._id).Status_accepted===true){
       setIsConnectionNull(false);
    }

} 

},[authState.connections,authState.connectionRequest])
useEffect(  ()=>{
     dispatch(getAllPosts());
     dispatch(getConnectionRequests({token:localStorage.getItem("token")}))
    dispatch(getMyConnectionRequests({token:localStorage.getItem("token")}) )
},[])

    useEffect(()=>{
        console.log("view profile")
    },[])


    return (
        <UserLayout>
      <DashboardLayout>
     <div className={styles.container}>
        <div className={styles.backDropContainer}>
            <img src={`${BASE_URL}/${userProfile.userId.profilePicture}`} alt={userProfile.userId.name} />
             </div>
     </div>
     <div className={styles.profileContainer_details}>
        <div className={styles.profileContainer__flex}>
            <div style={{flex:"0.8"}}>
                <div style={{display:"flex",width:"fit-content",alignItems:"center",gap:"1.2rem"}}>
                    <h2>{userProfile.userId.name}</h2>
                    <p style={{color:"grey"}}>@{userProfile.userId.username}</p>
                </div>
                <div style={{display:"flex" , alignItems:"center",gap:"1rem",marginBlock:"1rem"}}>
                {isCurrentUserInConnections? 
                <button className={styles.connectedButton}>{ isConnectionNull? "Pending" : "Connected"}</button>
                :
                <button onClick={()=>{
                    dispatch(sendConnectionRequest( {token: localStorage.getItem("token"),user_id:userProfile.userId._id}));
                    
                }} className={styles.connectBtn}>Connect</button>
                }
                <div onClick={ async ()=>{
                    const resposne =await clientServer.get(`/user/download_resume?id=${userProfile.userId._id}`);
                    window.open(`${BASE_URL}/${resposne.data.message}`, '_blank');
                }} style={{cursor:"pointer"}}>
                <svg style={{width:"1.2em"}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
</svg>



                </div>
                </div>
                <div>
                    <p>{userProfile.bio}</p>
                </div>
      
            </div>
            <div style={{flex:"0.2"}}>
                <h3>Recent Activity</h3>
                {userPosts.map((post)=>{
                    return(
                        <div key={post._id} className={styles.postCard}>
                           <div className={styles.card}></div>
                           <div className={styles.card_profileContainer}>
                            {post.media !== "" ? <img src={`${BASE_URL}/${post.media}`} alt=''></img> :
                            <div style={{width:"3.4rem" ,height:"3.4rem"}}></div>}
                            <p>{post.body}</p>
                           </div>
                        </div>
                    )
                })}
            </div>
        </div>
     </div>
     <div className={styles.workHistory}>
        <h4>Work History</h4>
        <div className={styles.workHistoryConatiner}>
            {
                userProfile.pastWork.map((work,index)=>{
                    return(
                        <div key={index} className={styles.workHistoryCard}>
                         <p style={{fontWeight:"bold ", display:"flex" , alignItems:"center" , gap:"0.8rem"}}>{work.company} - {work.position} </p>
                       <p>{work.years}</p>
                        </div>
                    )
                })
            }

        </div>
     </div>
    </DashboardLayout>
    </UserLayout>
    );
}

export default ViewProfilePage;
export async function getServerSideProps(context){
    console.log(context.query.username);
    const request=await clientServer.get("/user/get_profile_based_on_username",{
        params:{
            username:context.query.username
        }
    })
    const resposne= await request.data;
    console.log(resposne);
    return{props: {userProfile:request.data.profile}}
}  
