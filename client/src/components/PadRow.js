import { useEffect, useState } from 'react';
import useSound from 'use-sound';

// Material UI Imports
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';

import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';

import { getSampleName, getSampleUrl, getRefByPath } from '../audio-service';
import Pad from './Pad';



function PadRow ({pads, pos, toggleActive, isTriggering, rowIndex, isLooped, sampleList, handleClickDelete, trackId}) {

  const placeholderUrl = 'https://firebasestorage.googleapis.com/v0/b/jb-drum-sequencer.appspot.com/o/Samples%2FPlaceholder.wav?alt=media&token=07570a97-669a-4968-96e5-53f37a6210db';

  const previousConfig = JSON.parse(localStorage.getItem(`${trackId}`));

  const [url, setUrl] = useState(previousConfig ? previousConfig.url : placeholderUrl);
  const [samplePath, setSamplePath] = useState(previousConfig ? previousConfig.path : '')
  const [sampleName, setSampleName] = useState(previousConfig ? previousConfig.name : 'No sample');

  // TODO change this for howlerjs lib
  const [playSound] = useSound(url);

  useEffect(() => {
    if (isTriggering) {
      playSound();
    }
  }, [pos, isTriggering, playSound]);

  async function handleClickList (event) {
    const newPath = event.target.value;

    const newRef = getRefByPath (newPath);
    const newName = getSampleName(newRef);
    const newUrl = await getSampleUrl(newRef);

    setSampleName(newName);
    setUrl(newUrl);
    setSamplePath(newRef.fullPath);

    localStorage.setItem(`${trackId}`, JSON.stringify({
      name: newName,
      url: newUrl,
      path: newRef.fullPath
    }));
  }



  return (
    <div className='row-container'>
      <IconButton aria-label="delete" size="small" onClick={() => handleClickDelete(rowIndex) }>
        <DeleteIcon fontSize="inherit" />
      </IconButton>
      {sampleList &&
        <Box sx={{ minWidth: 120 }} className='select-container'>
          <FormControl fullWidth >
          <InputLabel shrink id="demo-simple-select-label">Sample</InputLabel>
          <Select notched className='select' displayEmpty value={samplePath} onChange={handleClickList} labelId="demo-simple-select-label" id="demo-simple-select" label='Sample'>
            <MenuItem style={{ display: "none" }} disabled value={samplePath}>{sampleName}</MenuItem>
            { sampleList.map(ref => {
              return <MenuItem key={ref.name} value={ref.fullPath} >{ getSampleName(ref) }</MenuItem>
            })}
          </Select>
          </FormControl>
        </Box>
      }

      <div className='row'>
        {samplePath && pads.map((pad, index) => {
          return <Pad
            key={index}
            rowIndex={rowIndex}
            id={index}
            state={pad}
            pos={ pos === 0 && isLooped ? 15 : pos - 1 } // Fixes visual delay
            toggleActive={() => toggleActive(rowIndex, index)} />
        })}
      </div>
    </div>

  )
}

export default PadRow;