const WHITE_KEYS = ['z', 'x', 'c', 'v', 'b', 'n', 'm',',','.','/']
const BLACK_KEYS = ['a', 's', 'd', 'f', 'g','h','j']

const keys = document.querySelectorAll('.key')
const whiteKeys = document.querySelectorAll('.key.white')
const blackKeys = document.querySelectorAll('.key.black')
const hints = document.querySelectorAll(".hints");

const recordButton = document.querySelector('.record-button')
const playButton = document.querySelector('.play-button')
const saveButton = document.querySelector('.save-button')
const songLink = document.querySelector('.song-link')
const nameOfSongInput = document.querySelector('.input-nameOfSong')

let recordingStartTime
let songNotes = currentSong && currentSong.notes
let songName = "Name Of Songs"

const keyMap = [...keys].reduce((map, key) => {
  map[key.dataset.note] = key
  return map
}, {})


console.log(currentSong)

keys.forEach(key => {
  key.addEventListener('click', () => playNote(key))
})

document.addEventListener('keydown', e => {
  if (e.repeat) return
  const key = e.key
  const whiteKeyIndex = WHITE_KEYS.indexOf(key)
  const blackKeyIndex = BLACK_KEYS.indexOf(key)

  if (whiteKeyIndex > -1) playNote(whiteKeys[whiteKeyIndex])
  if (blackKeyIndex > -1) playNote(blackKeys[blackKeyIndex])
})

function playNote(key) {
  if(isRecording()) recordNote(key.dataset.note)
  const noteAudio = document.getElementById(key.dataset.key)
  noteAudio.currentTime = 0
  noteAudio.play()
  key.classList.add('active')
  noteAudio.addEventListener('ended', () => {
    key.classList.remove('active')
  })
}

function hintsOn(e, index) {
  e.setAttribute("style", "transition-delay:" + index * 30 + "ms");
}

hints.forEach(hintsOn);
if (recordButton) {
recordButton.addEventListener('click' , Recording)
}
if (saveButton) {
saveButton.addEventListener('click', saveSong)
}
playButton.addEventListener('click', playSong)

function Recording() {
  recordButton.classList.toggle('active')
  if(isRecording()){
    startRecording()
  }else{
    stopRecording()
  }
}

function isRecording(){
  return recordButton != null && recordButton.classList.contains('active')
}

function startRecording(){
  recordingStartTime = Date.now() 
  songNotes=[]
  playButton.classList.remove('show')
  saveButton.classList.remove('show')
  nameOfSongInput.classList.remove('show')
  
}

function stopRecording(){
  playButton.classList.add('show')
  saveButton.classList.add('show')
  nameOfSongInput.classList.add('show')
}

function playSong(){
  if(songNotes.length === 0) return 
  songNotes.forEach(note =>{
    setTimeout(()=> {
      playNote(keyMap[note.key])
    },note.startTime)
  })
}

function recordNote(note){
  songNotes.push({
    key:note,
    startTime: Date.now() - recordingStartTime
  }
  )
}
function saveSong(){
  var nameOfSong = document.getElementById('nameOfSong').value;
  songName = nameOfSong;
  axios.post('/songs',{songNotes:songNotes,songName}).then(res=>{
    songLink.classList.add('show')
    songLink.href = `/songs/${res.data._id}`
  })
}