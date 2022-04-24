import { signOut } from 'firebase/auth';
import { child, get, push, remove } from 'firebase/database';
import { React, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, IconButton, Paper } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DeleteIcon from '@mui/icons-material/Delete';
import logoIcon from '../assets/images/radish.png';



import { DarkModeContext, LoopContext, UserContext } from '../contexts';
import { auth, dbRef } from '../firebase/firebaseService';

async function getLoopList (ref) { // TODO export this to db service
  const snapshot = await get(ref);
  return snapshot.val();
}

async function getLoopByKey (loopKey, userRef) {
  const loopRef = child(userRef, loopKey);
  const snapshot = await get(loopRef);
  return snapshot.val();
}

function Dashboard () {

  const navigate = useNavigate();
  const params = useParams();

  const [loopList, setLoopList] = useState({});

  const { user } = useContext(UserContext);
  const {useDarkMode, setUseDarkMode} = useContext(DarkModeContext);
  const { setLoop } = useContext(LoopContext);

  const [userRef, setUserRef] = useState(null);

  useEffect(() => {
    if (userRef) {
      getLoopList(userRef).then(data => {
        setLoopList(data);
      });
    }
  }, [userRef]);

  useEffect(() => {
    if (user) {
      setUserRef(child(dbRef, params.uid));
    }
  }, [user, params.uid]);


  function handleLogoutClick () {
    signOut(auth).then(() => {
      navigate('/');
    });
  }

  function handleLoopCardClick (loopKey) {
    getLoopByKey(loopKey, userRef).then((data) => {
      setLoop(data);
      navigate(`/${params.uid}/sequencer/${loopKey}`);
    });
  }

  function handleNewLoopClick () {
    const newLoop = {
      name: 'Untitled Beet',
      bpm: 220,
      gridSize: 16,
      precision: 1,
      pads: [],
      trackList: {},
      trackCounter: 0,
    };
    const loopRef = push(userRef, newLoop);

    setLoop({...newLoop, ref: loopRef});
    navigate(`sequencer/${loopRef.key}`);
  }

  function handleClickDelete (e, loopKey) {
    e.preventDefault();
    e.stopPropagation();
    const loopRef = child(userRef, loopKey);
    remove(loopRef).then(() => {
      const loopListCopy = Object.assign({}, loopList);
      delete loopListCopy[loopKey];
      setLoopList(loopListCopy);
    });
  }


  return (
    <div>

      <Button
        onClick={handleLogoutClick}
        variant='contained'
        size='small'
        sx={{
          backgroundColor: useDarkMode ? 'rgb(60 60 60)' : 'rgb(101 101 101)',
          position: 'fixed',
          top: 15,
          right: 120,
          width: 99,
          zIndex: 3
        }}
      >
        LOG OUT
      </Button>

      <IconButton
        aria-label="dark-mode"
        size="small"
        onClick={() => setUseDarkMode(!useDarkMode) }
        sx={{
          position: 'fixed',
          top: 13,
          right: 40,
          zIndex: 3
        }}
      >
        <DarkModeIcon/>
      </IconButton>

      <div
        style={{
          backgroundColor: useDarkMode ? 'rgb(35, 35, 35)' : 'rgb(220 220 220)',
          zIndex: 1,
          position: 'sticky',
          top: 0,
          minHeight: 100
        }}
      >

        <div
          className='title-container'
          style={{ padding: '0 0 40px 10px' }}
          onClick={() => navigate(user ? `/${user.uid}` : '/')}
        >
          <img
            src={logoIcon}
            alt=''
            height={28}
          />
          <h1 className='title' >BEETBOX</h1>
        </div>

        <div
          style={{
            display: 'flex',
            height: 100,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Button
            variant='contained'
            onClick={handleNewLoopClick}
            sx={{
              height: 40,
              width: 300,
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
          NEW BEET
          </Button>
        </div>
      </div>

      <div className='loop-list-container'>
        <ul className='loop-list'>
          {loopList ? Object.keys(loopList).map(loopKey => {
            return (
              <li key={loopKey}>
                <Paper
                  onClick={() => handleLoopCardClick(loopKey)}
                  className='loop-list-item'
                  elevation={1}
                  sx={{
                    height: 170,
                    width: 700,
                    transition: '0.4s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    '&:hover': {
                      color: 'white',
                      backgroundColor: 'rgb(216 26 96)',
                    }
                  }}
                >
                  <IconButton
                    className='loop-delete-button'
                    aria-label="delete"
                    size="small"
                    onClick={(e) => handleClickDelete(e, loopKey)}
                    sx={{
                      position: 'absolute',
                      top: 15,
                      right: 15,
                      opacity: 0,
                      transition: '0.6s ease',
                      fill: 'white'
                    }}
                  >
                    <DeleteIcon fontSize="inherit" style={{ color: 'white' }} />
                  </IconButton>

                  <div className='loop-info-container'>
                    <h2>{loopList[loopKey].name}</h2>
                    <div className='loop-details-container'>
                      <p>Bpm: {loopList[loopKey].bpm}</p>
                      <p>Duration: {Math.trunc(100 * loopList[loopKey].gridSize / loopList[loopKey].bpm)}s
                      </p>
                    </div>
                  </div>
                </Paper>
              </li>
            );
          }) : <div className='no-loops-message-container'>
            <h1>You have no beets yet</h1>
            <h1>Make a new beet and bless the world with your rythm!</h1>
          </div>}
        </ul>
      </div>


    </div>
  );
}



export default Dashboard;