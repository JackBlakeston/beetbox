import { Paper, Tab, Tabs, TextField } from "@mui/material";
import { Box } from "@mui/system";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { auth } from "../FirebaseService";

function AuthScreen () {

  const navigate = useNavigate(); // TODO use this for navigating after login

  const [tabIndex, setTabIndex] = useState(0);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  // const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPass, setRegisterPass] = useState('');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      navigate('/dashboard');
    }
  });

  function handleTabChange (event, newTabIndex) {
    setTabIndex(newTabIndex);
  }

  function handleLoginSubmit (event) {
    event.preventDefault();
    // TODO Check validity ?? Does firebase do this maybe¿?¿

    // LOGIN with firebase
    signInWithEmailAndPassword(auth, loginEmail, loginPass)
      .catch((error) => {
        console.error('LOGIN FAILED: ' + error);
      });
  }

  function handleRegisterSubmit (event) {
    event.preventDefault();
    // TODO Check validity ?? Does firebase do this maybe¿?¿

    // REGISTER with firebase
    createUserWithEmailAndPassword(auth, registerEmail, registerPass)
      .catch((error) => {
        console.error('REGISTER FAILED: ' + error);
      });
  }

  function handleInputChange (event) {
    const inputName = event.target.name;
    const value = event.target.value;

    if (inputName === 'loginEmail') {
      setLoginEmail(value);
    }
    if (inputName === 'loginPass') {
      setLoginPass(value);
    }
    if (inputName === 'registerEmail') {
      setRegisterEmail(value);
    }
    // if (inputName === 'registerUsername') {
    //   setRegisterUsername(value);
    // }
    if (inputName === 'registerPass') {
      setRegisterPass(value);
    }
  }

  return (
    <div className='auth-container'>
      <Paper
        sx={{
          height: 500,
          width: 500
        }}
      >
        <Box sx={{ borderBottom: 0.5, borderColor: 'divider' }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
          >
            <Tab sx={{ width: 250 }} label="Login" />
            <Tab sx={{ width: 250 }} label="Register" />
          </Tabs>
        </Box>

        { tabIndex === 0 &&
          <div className='auth-form-container'>
            <form autoComplete='off' onSubmit={handleLoginSubmit} className='auth-form'>
              <TextField onChange={handleInputChange} value={loginEmail} name='loginEmail' label='Email' variant='outlined' />
              <TextField onChange={handleInputChange} value={loginPass} name='loginPass' label='Password' variant='outlined' type='password'/>

              <button type='submit' disabled={loginEmail.length < 3} // TODO Add more conditions
              >
                LOG IN
              </button>
            </form>
          </div>
        }

        { tabIndex === 1 &&
          <div className='auth-form-container'>
          <form autoComplete='off' onSubmit={handleRegisterSubmit} className='auth-form'>
            <TextField onChange={handleInputChange} value={registerEmail} name='registerEmail' label='Email' variant='outlined' />
            {/* <TextField onChange={handleInputChange} value={registerUsername} name='registerUsername' label='Username' variant='outlined' /> */}
            <TextField onChange={handleInputChange} value={registerPass} name='registerPass' label='Password' variant='outlined' type='password'/>

            <button type='submit' disabled={registerEmail.length < 3} // TODO Add more conditions OR check if firebase does
            >
              REGISTER
            </button>
          </form>
        </div>
        }

      </Paper>
    </div>
  )
}


export default AuthScreen;