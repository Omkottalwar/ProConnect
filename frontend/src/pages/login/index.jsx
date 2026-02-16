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
    const [visible,setVisible]=useState(true)
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
        }} className={styles.inputField} type={visible ? "password" : "text"} placeholder='Password'>
        
        </input>
    <div className={styles.eyeBall} onClick={()=>{
        
            setVisible(!visible)

    }}> 
        {visible? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg> :
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
</svg> }</div>

        <div onClick={()=>{
            if(userLoginMethod){
                handleLogin();

            }else{
                handleRegister();
            }
        }
        } className={styles.buttonWithOutline1}>
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