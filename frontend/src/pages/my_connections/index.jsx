import { AcceptConnection, getMyConnectionRequests } from '@/config/redux/action/authAction';
import DashboardLayout from '@/layout/DashboardLayout';
import UserLayout from '@/layout/UserLayout';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import styles from "./styles.module.css"
import { BASE_URL } from '@/config';
import { useRouter } from 'next/router';
import { connection } from 'next/server';
function MyConnectionsPage() {
  const dispatch=useDispatch();
  const router=useRouter();
  const authState=useSelector((state)=>state.auth)
  useEffect(()=>{
    dispatch(getMyConnectionRequests({token:localStorage.getItem("token")}))
   
  },[])
  useEffect(()=>{
    if(authState.connectionRequest.length != 0){
      console.log( authState.connectionRequest);
    }
  },[authState.connectionRequest])
    return ( 
        <UserLayout>
        <DashboardLayout>
          <h4>My Connections </h4>

          <div style={{display:"flex",flexDirection:"column",gap:"1.7rem"}} className={styles.myConnections}>
            {authState.connectionRequest.length==0 && <h2>No Connection Requests Pending</h2>}
            
            
          { authState.connectionRequest.length !=0 && authState.connectionRequest.filter((connection)=>connection.Status_accepted === null).map((user,index)=>{
            return(
             
             <div onClick={()=>{
              router.push(`/view_profile/${user.userId.username.connectionId}`)

             }} className={styles.userCard} key={index}>
              <div style={{display:"flex",alignItems:"center", gap:"1rem"}}>
                <div className={styles.profilePicture}>
                  <img src={`${BASE_URL}/${user.userId.profilePicture}`}></img>
                </div>
                <div className={styles.userInfo}>
                  <h3>{user.userId.name}</h3>
                  <p>{user.userId.username}</p>
                </div>
                <button onClick={(e)=>{
                  e.stopPropagation();
                  dispatch(AcceptConnection({token:localStorage.getItem("token"),connectionId:user._id,action:"accept"}))
                }} className={styles.connectedButton}>Accept</button>
              </div>
              
             </div>
            )
          })}
          <h4>My Network</h4>
          { authState.connectionRequest.filter((connection)=>connection.Status_accepted != null).map((user,index)=>{
            return(
             <div onClick={()=>{
              router.push(`/view_profile/${user.userId.username}`)

             }} className={styles.userCard} key={index}>
              <div style={{display:"flex",alignItems:"center", gap:"1rem"}}>
                <div className={styles.profilePicture}>
                  <img src={`${BASE_URL}/${user.userId.profilePicture}`}></img>
                </div>
                <div className={styles.userInfo}>
                  <h3>{user.userId.name}</h3>
                  <p>{user.userId.username}</p>
                </div>
               
              </div>
              
             </div>)
          })}
        
          </div>
          
      
        </DashboardLayout>
      </UserLayout>
     );
}

export default MyConnectionsPage;