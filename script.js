// script.js

const apiKey = "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"; // Reemplaza con tu API Key
const realtimeAPIURL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";

const recordButton = document.getElementById("recordButton");
const chatMessages = document.getElementById("chatMessages");
const status = document.getElementById("status");

let ws;
let mediaRecorder;
let audioChunks = [];

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
    addMessage("Conexión establecida.", "assistant");
    status.textContent = "Conexión establecida. Presiona 'Hablar' para comenzar.";
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "conversation.item.created" && data.item.role === "assistant") {
      const audioBase64 = data.item.content[0].audio;
      const audioBlob = base64ToBlob(audioBase64, "audio/wav");
      const audioURL = URL.createObjectURL(audioBlob);
      playAudio(audioURL);
      addMessage("Respuesta de ChatGPT en audio.", "assistant");
    }
  };

  ws.onerror = (error) => {
    console.error("Error en el WebSocket:", error);
    status.textContent = "Error en la conexión. Reintenta más tarde.";
  };

  ws.onclose = () => {
    console.log("Conexión cerrada.");
    status.textContent = "Conexión cerrada. Reintenta más tarde.";
  };
}

// Convertir base64 a Blob
function base64ToBlob(base64, mimeType) {
  const byteChars = atob(base64);
  const byteNumbers = Array.from(byteChars, (char) => char.charCodeAt(0));
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Reproducir audio desde una URL
function playAudio(url) {
  const audio = new Audio(url);
  audio.play();
}

// Grabar audio
recordButton.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  status.textContent = "Grabando...";
  recordButton.textContent = "Detener";

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    const base64Audio = await blobToBase64(audioBlob);
    sendAudio(base64Audio);
  };

  mediaRecorder.start();
}

function stopRecording() {
  mediaRecorder.stop();
  status.textContent = "Procesando...";
  recordButton.textContent = "Hablar";
}

// Convertir Blob a base64
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  });
}

// Enviar audio al servidor
function sendAudio(base64Audio) {
  const event = {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_audio",
          audio: base64Audio,
        },
      ],
    },
  };

  ws.send(JSON.stringify(event));
  addMessage("Mensaje enviado en audio.", "user");
}

// Añadir mensaje al chat
function addMessage(message, role) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", role);
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Iniciar WebSocket
connectWebSocket();
