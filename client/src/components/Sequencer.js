import React, { useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { IconButton, Box, Button, TextField, Modal } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useNavigate, useParams } from 'react-router-dom';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';

import '../App.css'; // TODO change name or refactor all styles
import PadRow from './PadRow';
import Controls from './Controls';
import { dbRef, getBankRefList, getSampleList } from '../firebase/firebaseService';
import { DarkModeContext, LoopContext, UserContext } from '../contexts';
import { child, get, remove, update } from 'firebase/database';

async function getLoop (ref) {
  const snapshot = await get(ref);
  return snapshot.val();
}

function Sequencer () {

  const navigate = useNavigate();
  let params = useParams();

  const userRef = useRef(child(dbRef, params.uid));
  const loopRef = useRef(child(userRef.current, params.loopid));


  // Loop status
  const { loop, setLoop } = useContext(LoopContext);

  // Dark mode
  const {useDarkMode, setUseDarkMode} = useContext(DarkModeContext);

  // User info
  const { user } = useContext(UserContext);

  // Categories from DB
  const [sampleList, setSampleList] = useState([]); // TODO CHECK Do we need this here?
  const [bankList, setBanklist] = useState([]); // TODO CHECK Do we need this here? Probably better in App and passed as context

  // Audio playback control
  const [pos, setPos] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [activeRows, setActiveRows] = useState([]); // Tells all tracks if they should play or not
  const [isLooped, setIsLooped] = useState(false); // Necessary for fixing visual delay

  // Modal status
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getLoop(loopRef.current).then(data => {
      setLoop(data);
    });
  }, [setLoop]);

  useEffect(() => {
    getSampleList().then(list => {
      setSampleList(list);
    });

    getBankRefList().then(list => {
      setBanklist(list);
    });
  }, []);

  function useInterval (callback, delay) {
    const intervalRef = React.useRef();
    const callbackRef = React.useRef(callback);

    // Remember the latest callback:
    //
    // Without this, if you change the callback, when setInterval ticks again, it
    // will still call your old callback.
    //
    // If you add `callback` to useEffect's deps, it will work fine but the
    // interval will be reset.

    React.useEffect(() => {
      callbackRef.current = callback;
    }, [callback]);

    // Set up the interval:

    React.useEffect(() => {
      if (typeof delay === 'number') {
        intervalRef.current = window.setInterval(() => callbackRef.current(), delay);

        // Clear interval if the components is unmounted or the delay changes:
        return () => window.clearInterval(intervalRef.current);
      }
    }, [delay]);

    // Returns a ref to the interval ID in case you want to clear it manually:
    return intervalRef;
  }

  function togglePlaying () {
    Tone.start();
    if (loop?.trackList) {
      if (isPlaying) {
        clearInterval(timerId);
        setPos(0);
        setActiveRows(Array(Object.keys(loop.trackList).length).fill(false));
        setIsLooped(false);
      }
      setIsPlaying(!isPlaying);
    }
  }

  const timerId = useInterval(tick, isPlaying ? calculateTempo(loop.bpm) * loop.precision : null);
  // ?? Any way to do this without useInterval hook?
  // If we use tone js we don't need intervals

  function tick () {
    let currentPos = pos;
    currentPos++;

    if (currentPos > (loop.gridSize / loop.precision) - 1) {
      currentPos = 0;
      setIsLooped(true);
    }

    setPos(currentPos);
    checkPad();
  }

  function checkPad () {
    const activeRowsAux = Array(Object.keys(loop.trackList).length).fill(false);

    loop.pads.forEach((row, rowIndex) => {
      row.forEach((pad, index) => {
        if (index === pos && pad === 1) {
          activeRowsAux[rowIndex] = true;
        }
      });
    });
    setActiveRows(activeRowsAux);
  }

  function calculateTempo (bpm) {
    return 60000 / bpm;
  }

  function changeBpm (event) {
    const newBpm = Number(event.target.value);

    setLoop({...loop, bpm: newBpm});
    update(loopRef.current, { bpm: newBpm });
  }

  function changeGridSize (event) {
    const newSize = Number(event.target.value);
    if (isPlaying && newSize < loop.gridSize && pos > newSize) togglePlaying();

    setLoop({...loop, gridSize: newSize});
    update(loopRef.current, { gridSize: newSize });
  }

  function changePrecision (event) {
    const newPrecision = Number(event.target.value);
    if (isPlaying) togglePlaying();
    const padsCopy = [...loop.pads];
    const factor = loop.precision / newPrecision;
    let newPads;

    if (factor > 1) {
      newPads = padsCopy.map(padRow => padRow.map(pad => {
        const splitPadArr = Array(factor - 1).fill(0);
        splitPadArr.unshift(pad);
        return splitPadArr;
      }).flat());

    } else if (factor < 1) {
      newPads = padsCopy.map(padRow => {
        const joinedPadArr = [];
        for ( let i = 0; i < padRow.length; i += (1 / factor) ) {
          joinedPadArr.push(padRow[i]);
        }
        return joinedPadArr;
      });
    } else {
      return;
    }

    setLoop({...loop, pads: newPads, precision: newPrecision});
    update(loopRef.current, { pads: newPads, precision: newPrecision });
  }

  function toggleActive (rowIndex, id) {
    let padsCopy = [...loop.pads];
    let padState = padsCopy[rowIndex][id];
    if (padState === 1) {
      loop.pads[rowIndex][id] = 0; // ???? DO WE NEED TO CHANGE THIS FOR PADSCOPY??
    } else {
      loop.pads[rowIndex][id] = 1;
    }

    setLoop({...loop, pads: padsCopy});
    update(loopRef.current, { pads: padsCopy });
  }

  async function handleClickNewTrack () {

    const updatedLoop = await getLoop(loopRef.current);

    setLoop(updatedLoop);

    let updatedTrackList;
    if (updatedLoop.trackList) {
      updatedTrackList = updatedLoop.trackList;
    } else {
      updatedTrackList = {};
    }

    const newTrackId = `Track${(loop.trackCounter + 1).toString().padStart(4, '0')}`;

    const newTrack = {
      id: newTrackId,
      sampleName: 'No sample',
      sampleUrl: '',
      samplePath: '',
      bankPath: '',
      bankName: '',
      trackVolume: -6,
      trackPanning: 0,
    };
    updatedTrackList[newTrackId] = newTrack;

    let padsCopy;
    if (loop.pads) {
      padsCopy = [...loop.pads];
    } else {
      padsCopy = [];
    }
    padsCopy.push(Array(32 / loop.precision).fill(0));

    setLoop({...loop, trackList: updatedTrackList, trackCounter: loop.trackCounter + 1, pads: padsCopy});
    update(loopRef.current, { trackList: updatedTrackList, trackCounter: loop.trackCounter + 1, pads: padsCopy });
  }

  function handleClickDelete (trackId, rowIndex) {
    const trackListCopy = {...loop.trackList};

    delete trackListCopy[trackId];

    const padsCopy = [...loop.pads];
    padsCopy.splice(rowIndex, 1);

    setLoop({...loop, trackList: trackListCopy, pads: padsCopy});

    // const padsRef = child(loopRef, `pads/${rowIndex}`)
    // remove(padsRef);
    update(loopRef.current, { pads: padsCopy });

    const trackRef = child(loopRef.current, `trackList/${trackId}`);
    remove(trackRef);
  }

  function handleNameChange (event) {
    const newName = event.target.value;
    setLoop({...loop, name: newName});
    update(loopRef.current, { name: newName });
  }

  function handleModalClose () {
    setIsModalOpen(false);
  }

  function handleModalOpen () {
    setIsModalOpen(true);
  }

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 500,
    height: 200,
    bgcolor: useDarkMode ? '#212121' : 'background.paper',
    border: '2px solid #d81b60',
    boxShadow: 24,
    pt: 2,
    px: 4,
    pb: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 5,
  };

  return (
    <div className='sequencer'>

      <div className='modal-container'>
        <Modal
          open={isModalOpen}
          onClose={handleModalClose}
        >
          <Box sx={modalStyle}>
            <h3
              style={{
                fontSize: 25,
                margin: '10px 0 0 0',
              }}
            >
              Beet name
            </h3>
            <form autoComplete='off' onSubmit={() => setIsModalOpen(false)}>
              <TextField
                onFocus={event => {
                  event.target.select();
                }}
                onChange={handleNameChange}
                value={loop?.name}
                inputProps={{
                  style: {
                    fontSize: 24
                  }
                }}
              />
            </form>
          </Box>
        </Modal>
      </div>

      <IconButton
        aria-label="dark-mode"
        onClick={() => setUseDarkMode(!useDarkMode) }
        sx={{
          position: 'absolute',
          top: 10,
          right: 37
        }}
      >
        <DarkModeIcon />
      </IconButton>

      <Button
        onClick={() => navigate(user ? `/${user.uid}` : '/')}
        variant='contained'
        size='small'
        sx={{
          backgroundColor: useDarkMode ? 'rgb(60 60 60)' : 'rgb(101 101 101)',
          position: 'absolute',
          top: 15,
          right: 120,
          width: 200
        }}
      >
        {user ? 'DASHBOARD' : 'LOG IN'}
      </Button>


      <div className='navbar'
        style={{
          backgroundColor: useDarkMode ? 'rgb(35, 35, 35)' : 'rgb(220 220 220)',
        }}
      >
        <h1 className='title'>
          BEETBOX
        </h1>
        <div className='loop-name-container'>
          <h4
            style={{
              color: useDarkMode ? 'rgb(180 180 180)' : 'rgb(70, 70, 70)',
              backgroundColor: useDarkMode ? 'rgb(57 57 57)' : 'rgb(190 190 190)'
            }}
          >
            {loop?.name}
          </h4>
          <IconButton
            size="small"
            onClick={handleModalOpen}
          >
            <DriveFileRenameOutlineIcon
              style={{ fill: 'rgb(129 128 128)' }}
            />
          </IconButton>
        </div>

      </div>

      <div>
        <div
          style={{
            backgroundColor: useDarkMode ? 'rgb(40, 40, 40)' : 'rgb(230 230 230)'
          }}
        >
          { loop && <Controls
            playing={isPlaying}
            togglePlaying={togglePlaying}
            handleTempoChange={changeBpm}
            bpm={loop?.bpm}
            gridSize={loop?.gridSize}
            handleGridSizeChange={changeGridSize}
            precision={loop?.precision}
            handlePrecisionChange={changePrecision}
          />}
        </div>

        <div className='pads-container'>
          { loop?.trackList && Object.keys(loop.trackList)?.map((trackId, index) => {
            return <PadRow
              trackRef={child(loopRef.current, `trackList/${trackId}`)}
              trackId={trackId}
              key={trackId}
              pos={pos}
              pads={loop?.pads[index]}
              toggleActive={ toggleActive }
              handleClickDelete={ handleClickDelete }
              rowIndex={index}
              isTriggering={activeRows[index]}
              isLooped={isLooped}
              sampleList={sampleList}
              bankList={bankList}
              gridSize={loop?.gridSize}
              precision={loop?.precision}
            />;
          }) }
        </div>

        <Box ml={7.2} mt={2} className='new-track-container'>
          <Button
            sx={{
              border:'1.7px solid #d81a60',
              fontSize: '20px',
              fontWeight: 'bold',
              backgroundColor: useDarkMode && 'rgb(179 20 78 / 14%)',
              color: useDarkMode && 'white',
              ':hover': {
                border:'1.7px solid #d81a60',
                backgroundColor: useDarkMode ? 'rgb(179 20 78 / 40%)' : 'rgb(231 60 123 / 20%)'
              }
            }}
            variant={useDarkMode ? 'contained' : 'outlined'}
            className='new-track-button'
            onClick={handleClickNewTrack}
          >
              NEW TRACK
          </Button>
        </Box>

      </div>
    </div>
  );
}

export default Sequencer;