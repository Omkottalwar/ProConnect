import DashboardLayout from '@/layout/DashboardLayout';
import UserLayout from '@/layout/UserLayout';
import React, { use, useState } from 'react';
import styles from "./index.module.css"
import { useDispatch } from 'react-redux';
import { getAboutUser } from '@/config/redux/action/authAction';
import { BASE_URL, clientServer } from '@/config';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import { getAllPosts } from '@/config/redux/action/postAction';
function ProfilePage() {
    const authState=useSelector((state)=>state.auth);
    const postReducer=useSelector((state)=>state.posts);
    const [userProfile,setUserProfile]=useState({});  
    const [userPosts,setUserPosts]=useState([]);   
    const [isModalOpen,setIsModalOpen]=useState(false);
    const [inputData,setInputData]=useState({company:"",position:"",years:""});
    const dispatch=useDispatch();
    const handleWorkInputChange=(e)=>{
        const {name,value}=e.target;
        setInputData({...inputData,[name]:value});
    }
    useEffect(()=>{
        dispatch(getAboutUser({token:localStorage.getItem("token")}));
        dispatch(getAllPosts());
    },[])
    useEffect(()=>{
        if(authState.user){
            setUserProfile(authState.user);
            let post=postReducer.posts.filter((post)=>{
                return post.userId.username===authState.user.userId.username;
            })
            setUserPosts(post);
            console.log(post)
        }
      
    },[authState.user,postReducer.posts])
    const updateProfilePicture= async (file)=>{
        
        const formData=new FormData();
        formData.append('profile_picture',file);
        formData.append("token",localStorage.getItem("token"));
        const response =await clientServer.post("update_profile_picture",formData,{
            headers:{
                "Content-Type":"multipart/form-data"
            }

        });
        dispatch(getAboutUser({token:localStorage.getItem("token")}));
    }
    const updateProfileData=async ()=>{
        const request=await clientServer.post("/user_update",{
            token:localStorage.getItem("token"),
            name: userProfile.userId.name
    })
    const resposne= await clientServer.post("/update_profile_data",{
        token:localStorage.getItem("token"),
        bio: userProfile.bio,
        currentWork: userProfile.currentWork,
        pastWork: userProfile.pastWork,
        education: userProfile.education
    })
    dispatch(getAboutUser({token:localStorage.getItem("token")}));

}

    return ( 
        
        <UserLayout>
            <DashboardLayout>

{authState.user && userProfile.userId &&  (  
    <>          
              
            <div className={styles.container}>
        <div className={styles.backDropContainer}>
            <label htmlFor='ProfilePictureUpload' className={styles.backDrop_overlay}> 
                <p>Edit</p>
            </label>
            <input onChange={(e)=>{
                updateProfilePicture(e.target.files[0])
            }} type="file" id='ProfilePictureUpload' hidden/>
            <img src={`${BASE_URL}/${userProfile.userId.profilePicture}`} alt={userProfile.userId.name} />
            
             </div>
     </div>
     <div className={styles.profileContainer_details}>
        <div style={{display:"flex ", gap:"0.7rem"}}>
            <div style={{flex:"0.8"}}>
                <div style={{display:"flex",width:"fit-content",alignItems:"center",gap:"1.2rem"}}>
                   
                   <input className={styles.nameEdit} type="text" value={userProfile.userId.name}  onChange={(e)=>{
                    setUserProfile({...userProfile,userId:{...userProfile.userId,name:e.target.value}})
                   }} ></input>
                    <p style={{color:"grey"}}>@{userProfile.userId.username}</p>
                </div>
            
                <div>
                    <textarea value={userProfile.bio}
                    onChange={(e)=>{
                        setUserProfile({...userProfile,bio:e.target.value})
                    }}
                    rows={Math.max(3,userProfile.bio.length/80)}
                    style={{width:"100%"}}
                    >
                        
                    </textarea>
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
     <div style={{marginLeft:"10px"}} className={styles.workHistory}>
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
         <button className={styles.addWorkBtn}
         onClick={()=>{
            setIsModalOpen(true);
         }}
         >Add Work</button>
        </div>

        {userProfile != authState.user && 
        <div onClick={()=>{
            updateProfileData();
        }} className={styles.connectionButton}>
            Update Profile
        </div>
        }
     </div>
     </> 

    )


}
{
               isModalOpen && 
              <div onClick={()=>{
                setIsModalOpen(false);
              }} className={styles.commentsContainer}>
                <div onClick={(e)=>{
                  e.stopPropagation();
                }} className={styles.allCommentsContainer}>
                <input onChange={handleWorkInputChange} name='company'  className={styles.inputField} type='text' placeholder='Enter Company'></input>
                <input onChange={handleWorkInputChange} name='position'   className={styles.inputField} type='text' placeholder='Enter Position'></input>
                <input onChange={handleWorkInputChange}  name='years'  className={styles.inputField} type='text' placeholder='Years'></input>
                <div onClick={()=>{
                    setUserProfile({...userProfile,pastWork:[...userProfile.pastWork,inputData]});
                    setIsModalOpen(false);
                }} className={styles.addWorkButton}> Add Work</div>
                </div>

              </div>
            
            }
            </DashboardLayout>

        </UserLayout>
       
     );
}

export default ProfilePage;