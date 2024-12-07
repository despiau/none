const OPENAI_API_KEY="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"
const chatbox=document.querySelector('#chat-box')
const saveButton=document.querySelector('#save-button')
const saveCleanButton=document.querySelector('#save-clean-button')
const micButton=document.querySelector('#mic-button')
const languageSelection=document.querySelector('#language-selection')
const liveTranscriptElement=document.querySelector('#live-transcript')
const noteInput=document.querySelector('#input')
const addNoteButton=document.querySelector('#submit-button')
const hamburgerMenuButton=document.querySelector('.hamburger-menu')
const sidebar=document.querySelector('.sidebar')
const headerButtons=document.querySelector('.header-buttons')
let isRecording=false
let ws
let mediaStream
let audioContext
let processorNode
addNoteButton.addEventListener('click',e=>{
e.preventDefault()
const t=noteInput.value.trim()
if(t){addMessage(t,'Note');scrollChatboxToBottom();noteInput.value=''}
})
noteInput.addEventListener('keydown',e=>{
if(e.key==='Enter'&&!e.shiftKey){
e.preventDefault()
const t=noteInput.value.trim()
if(t){addMessage(t,'Note');scrollChatboxToBottom();noteInput.value=''}
}
})
function addMessage(m,s){
const timeStamp=new Date().toLocaleTimeString()
const el=document.createElement('div')
el.classList.add('list-group-item')
if(s==='Note')el.classList.add('note')
el.innerHTML=`<strong>${s}:</strong> ${m}<br><span class="timestamp">${timeStamp}</span>`
chatbox.appendChild(el)
scrollChatboxToBottom()
}
function scrollChatboxToBottom(){
chatbox.scrollTop=chatbox.scrollHeight
}
saveButton.addEventListener('click',()=>{
const transcripts=saveTranscript()
const blob=new Blob([transcripts.fullTranscript],{type:'text/plain;charset=utf-8'})
const url=URL.createObjectURL(blob)
const link=document.createElement('a')
link.href=url
link.download=`transcript_${new Date().toISOString().replace(/:|\./g,'_')}.txt`
link.click()
})
saveCleanButton.addEventListener('click',()=>{
const transcripts=saveTranscript()
const blob=new Blob([transcripts.cleanTranscript],{type:'text/plain;charset=utf-8'})
const url=URL.createObjectURL(blob)
const link=document.createElement('a')
link.href=url
link.download=`clean_transcript_${new Date().toISOString().replace(/:|\./g,'_')}.txt`
link.click()
})
hamburgerMenuButton.addEventListener('click',()=>{
sidebar.classList.toggle('sidebar-open')
headerButtons.classList.toggle('header-buttons-open')
})
micButton.addEventListener('click',async e=>{
e.preventDefault()
if(!ws||ws.readyState!==1)return
if(!isRecording){await startRecording();micButton.classList.add('recording');micButton.innerHTML='🔴'}
else{stopRecording();commitAudio();micButton.classList.remove('recording');micButton.innerHTML='🎤'}
isRecording=!isRecording
})
async function startRecording(){
if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)({sampleRate:24000})
mediaStream=await navigator.mediaDevices.getUserMedia({audio:true})
const source=audioContext.createMediaStreamSource(mediaStream)
processorNode=audioContext.createScriptProcessor(4096,1,1)
source.connect(processorNode)
processorNode.connect(audioContext.destination)
processorNode.onaudioprocess=e=>{
const inputData=e.inputBuffer.getChannelData(0)
const base64AudioData=base64EncodeAudio(inputData)
if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:"input_audio_buffer.append",audio:base64AudioData}))
}
}
function stopRecording(){
if(processorNode){processorNode.disconnect();processorNode=null}
if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null}
}
function commitAudio(){
if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'input_audio_buffer.commit'}))
}
function floatTo16BitPCM(f){
const b=new ArrayBuffer(f.length*2)
const v=new DataView(b)
let o=0
for(let i=0;i<f.length;i++,o+=2){
let s=Math.max(-1,Math.min(1,f[i]))
v.setInt16(o,s<0?s*0x8000:s*0x7fff,true)
}
return b
}
function base64EncodeAudio(f){
const a=floatTo16BitPCM(f)
let bin=''
const bytes=new Uint8Array(a)
const c=0x8000
for(let i=0;i<bytes.length;i+=c){
const ch=bytes.subarray(i,i+c)
bin+=String.fromCharCode.apply(null,ch)
}
return btoa(bin)
}
function connectRealtimeAPI(){
const url="wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
ws=new WebSocket(url,["protocol"],{headers:{"Authorization":"Bearer "+OPENAI_API_KEY,"OpenAI-Beta":"realtime=v1"}})
ws.onopen=()=>{
ws.send(JSON.stringify({type:"session.update",session:{instructions:"You are a helpful and friendly AI assistant. Respond in English with a lively and playful tone.",voice:"alloy"}}))
}
ws.onmessage=(e)=>{
const event=JSON.parse(e.data)
handleServerEvent(event)
}
}
function handleServerEvent(event){
if(event.type==="conversation.item.created"){
const item=event.item
if(item.role==="assistant"){
const textContent=item.content.find(c=>c.type==="output_text")?.text
if(textContent)addMessage(textContent,'Assistant')
const audioContent=item.content.find(c=>c.type==="output_audio")?.audio
if(audioContent)playAssistantAudio(audioContent)
}}
if(event.type==="error"){
console.error(event.error)
}}
async function playAssistantAudio(b64){
const bin=atob(b64)
const l=bin.length
const bytes=new Uint8Array(l)
for(let i=0;i<l;i++)bytes[i]=bin.charCodeAt(i)
if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)()
const buf=await audioContext.decodeAudioData(bytes.buffer)
const src=audioContext.createBufferSource()
src.buffer=buf
src.connect(audioContext.destination)
src.start(0)
}
function saveTranscript(){
const date=new Date().toLocaleDateString()
const meetingTitle=`Transcription from Meeting [${date}]`
let fullTranscript=`${meetingTitle}\n\n`
let cleanTranscript=`${meetingTitle}\n\nPrompt: Write a bullet point summary and action item list.\n\n`
chatbox.childNodes.forEach(n=>{
const speaker=n.querySelector('strong').textContent
const message=n.childNodes[1].textContent.trim()
const timeStamp=n.querySelector('.timestamp').textContent
fullTranscript+=`${timeStamp} - ${speaker} - ${message}\n`
cleanTranscript+=`- ${message}\n`
})
const totalCharacters=fullTranscript.length
const totalWords=fullTranscript.split(/\s+/).length-1
fullTranscript+=`\nTotal Characters: ${totalCharacters}\nTotal Words: ${totalWords}\n`
return{fullTranscript,cleanTranscript}
}
window.addEventListener('load',()=>{connectRealtimeAPI()})