import UserLayout from '@/layout/UserLayout';
import React, { useEffect, useState } from 'react';
import styles from "./styles.module.css"
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router';
import { loginUser, registerUser } from '@/config/redux/action/authAction';
import { emptyMessage } from '@/config/redux/reducer/authReducer';
function LoginComponent() {
    const authState=useSelector((state)=>state.auth)
    const router=useRouter();
    const dispatch=useDispatch();
    const [email,setEmailAddress]=useState("")
    const [password,setPassword]=useState("")
    const [username,setUsername]=useState("")
    const [name,setName]=useState("")

    const [userLoginMethod,setUserLoginMethod]= useState(false);
    useEffect(() => {
        if (authState.isloggedIn) {
          router.push("/dashboard");
        }
      }, [authState.isloggedIn]);
    useEffect(()=>{
        dispatch(emptyMessage())
    },[userLoginMethod])
    useEffect(()=>{
        if(localStorage.getItem("token")){
            router.push("/dashboard")
        }
    },[])
    const handleRegister=()=>{
        console.log("registerd")
        dispatch(registerUser({username,name,email,password}))
    }
    const handleLogin=()=>{
        console.log(email,password)
        console.log("logined")
        dispatch(loginUser({email,password}))
    }

    return ( 
        <UserLayout>
            <div className={styles.container}>
                <div className={styles.cardContainer}>

      <div className={styles.cardContainer__left}>
        <p className={styles.cardleft_heading}>{userLoginMethod? "Sing In": "Sign Up" }</p>
        <p style={{color: authState.isError? "red" : "green"}}>{authState.message.message}</p>
      <div className={styles.inputContainer}>
         {!userLoginMethod &&      <div className={styles.inputRow}>
            <input onChange={(e)=>{
                setUsername(e.target.value)
            }} className={styles.inputField} type='text' placeholder='Username'></input>
            <input onChange={(e)=>{
                setName(e.target.value)
            }} className={styles.inputField} type='text' placeholder='Name'></input>
        </div>}
   
        <input onChange={(e)=>{
            setEmailAddress(e.target.value)
        }} className={styles.inputField} type='text' placeholder='email'></input>
        <input onChange={(e)=>{
            setPassword(e.target.value)
        }} className={styles.inputField} type='text' placeholder='Password'></input>
        <div onClick={()=>{
            if(userLoginMethod){
                handleLogin();

            }else{
                handleRegister();
            }
        }
        } className={styles.buttonWithOutline}>
            <p>{userLoginMethod? "Sing In": "Sign Up" }</p>
        </div>
      </div>
     
      </div>

      <div className={styles.cardContainer__right}>
        <div>
            {userLoginMethod? <p>Don't Have an Account </p> : <p>Already have an account</p> }
        
            < div onClick={()=>{
                setUserLoginMethod(!userLoginMethod)

            }} style={{color:"black",textAlign:"center",marginTop:"15px"}} className={styles.buttonWithOutline} >
            <p>{userLoginMethod? "Sing Up" : "Sign In"}</p>
            </div>
        </div>

      </div>
      </div>
            </div>

        </UserLayout>
     
     );
}

export default LoginComponent;