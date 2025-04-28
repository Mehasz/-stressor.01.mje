const soundCtx = new AudioContext();
//------------------------AUDIO DECODING & STOP/START FUNCTION--------------------
let source = null;
let audioBuffer;
document.getElementById("file").addEventListener("change", async (event) => {
  let file = event.target.files[0];
  let arraybuf = await file.arrayBuffer();
  audioBuffer = await soundCtx.decodeAudioData(arraybuf);
});
const playAudio = function () {
  if (audioBuffer) {
    if (source) {
      source.stop();
      source = null;
    }
    source = soundCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(inputGain);
    source.start();
  }
};
const stopAudio = function () {
  if (source) {
    source.stop();
    source.disconnect();
    source = null;
  }
};
//---------------------------MORE FUNCTION EXPRESSIONS-------------
const dBtoA = function (linAmp) {
  return Math.pow(10, linAmp / 20);
};

const updateInputGain = function () {
  let amp = dBtoA((inputFader.value / 10) * 60 - 40);
  inputGain.gain.exponentialRampToValueAtTime(amp, soundCtx.currentTime);
  inputLabel.innerText = `${inputFader.value} `;
};
//-----------------------------------------------------
const updateOutputGain = function () {
  let amp = dBtoA((outputFader.value / 10) * 60 - 40);
  outputGain.gain.exponentialRampToValueAtTime(amp, soundCtx.currentTime);
  outputLabel.innerText = `${outputFader.value} `;
};
//----------------------------------ATTACK & RELEASE----------------
function scaleAttack(val) {
  const min = 0.00005; // 50 us
  const max = 0.03; // 30ms
  return min + (val / 10) * (max - min);
}

function scaleRelease(val) {
  const min = 0.01; // 10ms
  const max = 1.0; // 1000ms
  return min + (val / 10) * (max - min);
}

const updateAttack = function () {
  const scaled = scaleAttack(parseFloat(attackFader.value));
  compressor.attack.linearRampToValueAtTime(scaled, soundCtx.currentTime);
  attackLabel.innerText = `${attackFader.value} `;
};

const updateRelease = function () {
  const scaled = scaleRelease(parseFloat(releaseFader.value));
  compressor.release.linearRampToValueAtTime(scaled, soundCtx.currentTime);
  releaseLabel.innerText = `${releaseFader.value} `;
};

//---------------------------COMPRESSOR VALUES--------------------
let compressor = soundCtx.createDynamicsCompressor();
compressor.threshold.setValueAtTime(-20, soundCtx.currentTime); // dB
compressor.knee.setValueAtTime(10, soundCtx.currentTime); // dB

//compressor.ratio.setValueAtTime(20, soundCtx.currentTime); // ratio
compressor.attack.setValueAtTime(0.5, soundCtx.currentTime); // sec
compressor.release.setValueAtTime(0.25, soundCtx.currentTime); // sec
//---------------------------DROPDOWN-------------------------
const updateRatio = function () {
  const ratioSet = parseFloat(this.value);
  compressor.ratio.setValueAtTime(ratioSet, soundCtx.currentTime);
};
//--------------------------METER------------------------------
function updateGainReductionMeter() {
  const gr = Math.abs(compressor.reduction); // dB of gain reduction
  const segments = document.querySelectorAll(".segment");

  segments.forEach((seg, index) => {
    const level = index + 1;
    seg.dataset.level = level;
    if (gr >= level) {
      seg.classList.add("active");
    } else {
      seg.classList.remove("active");
    }
  });

  requestAnimationFrame(updateGainReductionMeter);
}
updateGainReductionMeter();
// assistance from chatGPT was used for the meter.
//---------------------------OVERDRIVE VALUES--------------------

// Distortion curve for the waveshaper, thanks to Kevin Ennis
// http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion
let dist = soundCtx.createWaveShaper();
function makeDistortionCurve(amount, mode = "dist2") {
  let k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;

  for (let i = 0; i < n_samples; i++) {
    const x = (i * 2) / n_samples - 1;

    if (mode === "dist2") {
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    } else if (mode === "dist3") {
      curve[i] = Math.tanh(k * x) / 2; //chat GPT started this and I dialed it in
    } else {
      curve[i] = x;
    }
  }
  return curve;
}
const distortionButtons = document.querySelectorAll(
  "#distortionControls button"
);
distortionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;

    let amount;
    switch (mode) {
      case "dist2":
        amount = 20;
        break;
      case "dist3":
        amount = 10;
        break;
      case "off":
      default:
        amount = 0;
        break;
    }
    // Set the distortion curve
    dist.curve = makeDistortionCurve(amount, mode);
    console.log(`Distortion mode set to: ${mode}`);
  });
});
//--------------------------INPUT GAIN----------------------------
let inputGain = soundCtx.createGain();
inputGain.gain.value = 0.2; //appox value halfway between my gain values
//--------------------------MASTER GAIN---------------------------
let outputGain = soundCtx.createGain();
outputGain.gain.value = 0.2; //appox value halfway between my gain values
//--------------------------ROUTING-------------------------------
inputGain.connect(compressor);
compressor.connect(dist);
dist.connect(outputGain);
outputGain.connect(soundCtx.destination);
//--------------------------GET HTML------------------------------

let startButton = document.getElementById("start");
let stopButton = document.getElementById("stop");
let inputFader = document.getElementById("inputLevel");
let outputFader = document.getElementById("outputLevel");
let attackFader = document.getElementById("attackTime");
let releaseFader = document.getElementById("releaseTime");
let inputLabel = document.getElementById("inputLabel");
let outputLabel = document.getElementById("outputLabel");
let attackLabel = document.getElementById("attackLabel");
let releaseLabel = document.getElementById("releaseLabel");
let ratioDrop = document.getElementById("ratioSelector");
let distMode = document.getElementById("modeSelector");
//-------------------------EVENT LISTENERS--------------------------
startButton.addEventListener("click", playAudio);
stopButton.addEventListener("click", stopAudio);
inputFader.addEventListener("input", updateInputGain);
outputFader.addEventListener("input", updateOutputGain);
attackFader.addEventListener("input", updateAttack);
releaseFader.addEventListener("input", updateRelease);
ratioDrop.addEventListener("change", updateRatio);

//-------------------------INITIALIZE------------------------------
// Reset faders and file input on page load
document.addEventListener("DOMContentLoaded", () => {
  // Reset faders to default values
  inputFader.value = 5;
  outputFader.value = 5;
  attackFader.value = 5;
  releaseFader.value = 5;

  // Update labels to match default values
  inputLabel.innerText = inputFader.value;
  outputLabel.innerText = outputFader.value;
  attackLabel.innerText = attackFader.value;
  releaseLabel.innerText = releaseFader.value;

  // Reset file input
  document.getElementById("file").value = "";
});
