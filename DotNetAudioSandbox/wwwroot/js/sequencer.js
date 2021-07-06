// ! You should just be able to do 
// const audioCtx = new AudioContext();
// but this allows for Safari support !
const audioCtx = window.AudioContext ? new AudioContext() : new webkitAudioContext();

// TODO make all frequencies like each other, one day

// Before we do anything more, let's grab our checkboxes from the interface. We want to keep them in the groups they are in as each row represents a different sound or _voice_.
const pads = document.querySelectorAll('.pads');
const allPadButtons = document.querySelectorAll('#tracks button');

// switch aria attribute on click
allPadButtons.forEach(el => {
  el.addEventListener('click', () => {
    if (el.getAttribute('aria-checked') === 'false') {
      el.setAttribute('aria-checked', 'true');
    } else {
      el.setAttribute('aria-checked', 'false');
    }
  }, false)
})

const wave = audioCtx.createPeriodicWave(wavetable.real, wavetable.imag);

// let noteTime = 1;
let attackTime = 0.2;
const attackControl = document.querySelector('#attack');
attackControl.addEventListener('input', ev => {
  attackTime = Number(ev.target.value);
}, false);

let releaseTime = 0.5;
const releaseControl = document.querySelector('#release');
releaseControl.addEventListener('input', ev => {
  releaseTime = Number(ev.target.value);
}, false);

const sweepLength = 2;
// expose attack time & release time
function playSweep(time) {
  const osc = audioCtx.createOscillator();
  osc.setPeriodicWave(wave);
  osc.frequency.value = 380;

  const sweepEnv = audioCtx.createGain();
  sweepEnv.gain.cancelScheduledValues(time);
  sweepEnv.gain.setValueAtTime(0, time);
  sweepEnv.gain.linearRampToValueAtTime(1, time + attackTime);
  sweepEnv.gain.linearRampToValueAtTime(0, time + sweepLength - releaseTime);

  osc.connect(sweepEnv).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + sweepLength);
}


// expose frequency & frequency modulation
let pulseHz = 880;
const hzControl = document.querySelector('#hz');
hzControl.addEventListener('input', ev => {
  pulseHz = Number(ev.target.value);
}, false);

let lfoHz = 30;
const lfoControl = document.querySelector('#lfo');
lfoControl.addEventListener('input', ev => {
  lfoHz = Number(ev.target.value);
}, false);

const pulseTime = 1;
function playPulse(time) {
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = pulseHz;

  const amp = audioCtx.createGain();
  amp.gain.value = 1;

  const lfo = audioCtx.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = lfoHz;

  lfo.connect(amp.gain);
  osc.connect(amp).connect(audioCtx.destination);
  lfo.start();
  osc.start(time);
  osc.stop(time + pulseTime);
}


// expose noteDuration & band frequency
let noiseDuration = 1;
const durControl = document.querySelector('#duration');
durControl.addEventListener('input', ev => {
  noiseDuration = Number(ev.target.value);
}, false);

let bandHz = 1000;
const bandControl = document.querySelector('#band');
bandControl.addEventListener('input', ev => {
  bandHz = Number(ev.target.value);
}, false);

function playNoise(time) {
  const bufferSize = audioCtx.sampleRate * noiseDuration; // set the time of the note
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); // create an empty buffer
  const data = buffer.getChannelData(0); // get data

  // fill the buffer with noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  // create a buffer source for our created data
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = bandHz;

  // connect our graph
  noise.connect(bandpass).connect(audioCtx.destination);
  noise.start(time);
}

// Loading ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// fetch the audio file and decode the data
async function getFile(audioContext, filepath) {
  const response = await fetch(filepath);
  const arrayBuffer = await response.arrayBuffer();
  // ! A callback has been added here as a second param for Safari only !
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer, function() {return});
  return audioBuffer;
}

let playbackRate = 1;
const rateControl = document.querySelector('#rate');
rateControl.addEventListener('input', ev => {
  playbackRate = Number(ev.target.value);
}, false);

// create a buffer, plop in data, connect and play -> modify graph here if required
function playSample(audioContext, audioBuffer, time) {
  const sampleSource = audioContext.createBufferSource();
  sampleSource.buffer = audioBuffer;
  sampleSource.playbackRate.value = playbackRate;
  sampleSource.connect(audioContext.destination)
  sampleSource.start(time);
  return sampleSource;
}

async function setupSample() {
  const filePath = 'dtmf.mp3';
  // Here we're `await`ing the async/promise that is `getFile`.
  // To be able to use this keyword we need to be within an `async` function
  const sample = await getFile(audioCtx, filePath);
  return sample;
}


// Scheduling ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
let tempo = 60.0;
const bpmControl = document.querySelector('#bpm');
const bpmValEl = document.querySelector('#bpmval');

bpmControl.addEventListener('input', ev => {
  tempo = Number(ev.target.value);
  bpmValEl.innerText = tempo;
}, false);

const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

let currentNote = 0; // The note we are currently playing
let nextNoteTime = 0.0; // when the next note is due.
function nextNote() {
  const secondsPerBeat = 60.0 / tempo;

  nextNoteTime += secondsPerBeat; // Add beat length to last beat time

  // Advance the beat number, wrap to zero
  currentNote++;
  if (currentNote === 4) {
    currentNote = 0;
  }

}

// Create a queue for the notes that are to be played, with the current time that we want them to play:
const notesInQueue = [];
let dtmf;

function scheduleNote(beatNumber, time) {
  // push the note on the queue, even if we're not playing.
  notesInQueue.push({note: beatNumber, time: time});
  // console.log(beatNumber, time);

  if (pads[0].querySelectorAll('button')[beatNumber].getAttribute('aria-checked') === 'true') {
    playSweep(time);
  }
  if (pads[1].querySelectorAll('button')[beatNumber].getAttribute('aria-checked') === 'true') {
    playPulse(time);
  }
  if (pads[2].querySelectorAll('button')[beatNumber].getAttribute('aria-checked') === 'true') {
    playNoise(time);
  }
  if (pads[3].querySelectorAll('button')[beatNumber].getAttribute('aria-checked') === 'true') {
    playSample(audioCtx, dtmf, time);
  }

}

let timerID;
function scheduler() {
  // while there are notes that will need to play before the next interval,
  // schedule them and advance the pointer.
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime ) {
      scheduleNote(currentNote, nextNoteTime);
      nextNote();
  }
  timerID = window.setTimeout(scheduler, lookahead);
}

// We also need a draw function to update the UI, so we can see when the beat progresses.

let lastNoteDrawn = 3;
function draw() {
  let drawNote = lastNoteDrawn;
  const currentTime = audioCtx.currentTime;

  while (notesInQueue.length && notesInQueue[0].time < currentTime) {
    drawNote = notesInQueue[0].note;
    notesInQueue.splice(0,1);   // remove note from queue
  }

  // We only need to draw if the note has moved.
  if (lastNoteDrawn !== drawNote) {
    pads.forEach(el => {
      el.children[lastNoteDrawn].style.borderColor = 'hsla(0, 0%, 10%, 1)';
      el.children[drawNote].style.borderColor = 'hsla(49, 99%, 50%, 1)';
    });

    lastNoteDrawn = drawNote;
  }
  // set up to draw again
  requestAnimationFrame(draw);
}

// when the sample has loaded allow play
const loadingEl = document.querySelector('.loading');
const playButton = document.querySelector('[data-playing]');
let isPlaying = false;
setupSample()
  .then((sample) => {
    loadingEl.style.display = 'none';

    dtmf = sample; // to be used in our playSample function

    playButton.addEventListener('click', ev => {
      isPlaying = !isPlaying;

      if (isPlaying) { // start playing

        // check if context is in suspended state (autoplay policy)
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        currentNote = 0;
        nextNoteTime = audioCtx.currentTime;
        scheduler(); // kick off scheduling
        requestAnimationFrame(draw); // start the drawing loop.
        ev.target.dataset.playing = 'true';
      } else {
        window.clearTimeout(timerID);
        ev.target.dataset.playing = 'false';
      }
    })
  });
