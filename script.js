// script.js
const apiKey = "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"; // Reemplaza con tu API Key de OpenAI
const realtimeAPIURL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";

const micButton = document.getElementById("mic-button");
const chatBox = document.getElementById("chat-box");
const liveTranscript = document.getElementById("live-transcript");

let recognition = new window.webkitSpeechRecognition();
recognition.lang = "en-US";
recognition.continuous = true;
recognition.interimResults = true;

let isRecording = false;
let ws;

// Conectar al servidor WebSocket
function connectWebSocket() {
  ws = new WebSocket(realtimeAPIURL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  ws.onopen = () => {
    console.log("Conectado al servidor Realtime API.");
    addMessage("Conexión establecida.", "Sistema");
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "conversation.item.created" && data.item.role === "assistant") {
      const audioBase64 = data.item.content.find(c => c.type === "output_audio").audio;
      const audioBlob = base64ToBlob(audioBase64, "audio/wav");
      const audioURL = URL.createObjectURL(audioBlob);
      playAudio(audioURL);

      const transcript = data.item.content.find(c => c.type === "output_text").text;
      addMessage(transcript, "ChatGPT");
    }
  };

  ws.onerror = (error) => console.error("Error WebSocket:", error);
  ws.onclose = () => console.log("Conexión WebSocket cerrada.");
}

// Convertir base64 a Blob
function base64ToBlob(base64, mimeType) {
  const byteChars = atob(base64);
  const byteNumbers = Array.from(byteChars, char => char.charCodeAt(0));
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Reproducir audio
function playAudio(url) {
  const audio = new Audio(url);
  audio.play();
}

// Grabar y enviar audio
function startRecording() {
  recognition.start();
  recognition.onresult = async (event) => {
    const results = event.results;
    const transcript = results[results.length - 1][0].transcript.trim();
    liveTranscript.textContent = transcript;

    if (results[results.length - 1].isFinal) {
      sendAudio(transcript);
      liveTranscript.textContent = "";
    }
  };
}

function stopRecording() {
  recognition.stop();
}

// Enviar texto al servidor
function sendAudio(transcript) {
  const event = {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: transcript }
      ]
    }
  };

  ws.send(JSON.stringify(event));
  addMessage(transcript, "Tú");
}

// Añadir mensaje al chat
function addMessage(message, speaker) {
  const messageElement = document.createElement("div");
  messageElement.innerHTML = `<strong>${speaker}:</strong> ${message}`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Alternar grabación
micButton.addEventListener("click", () => {
  if (!isRecording) {
    startRecording();
    micButton.classList.add("recording");
    micButton.textContent = "🔴 Grabando";
  } else {
    stopRecording();
    micButton.classList.remove("recording");
    micButton.textContent = "🎤 Hablar";
  }
  isRecording = !isRecording;
});

// Iniciar WebSocket
connectWebSocket();
