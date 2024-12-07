

const apiKey = "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"; // Inserta tu API Key aquí
const realtimeAPIURL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

let ws;

// Conectar al servidor WebSocket
function connectWebSocket() {
  ws = new WebSocket(realtimeAPIURL, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1"
    }
  });

  ws.onopen = () => {
    console.log("Conectado al servidor Realtime API.");
    addMessage("Conexión establecida.", "assistant");
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "conversation.item.created" && data.item.role === "assistant") {
      const response = data.item.content[0].text;
      addMessage(response, "assistant");
    }
  };

  ws.onerror = (error) => {
    console.error("Error en el WebSocket:", error);
    addMessage("Error en la conexión. Reintenta más tarde.", "assistant");
  };

  ws.onclose = () => {
    console.log("Conexión cerrada.");
    addMessage("Conexión cerrada. Reintenta más tarde.", "assistant");
  };
}

// Enviar mensaje al servidor
function sendMessage(message) {
  const event = {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: message
        }
      ]
    }
  };

  ws.send(JSON.stringify(event));
  addMessage(message, "user");
}

// Añadir mensaje al chat
function addMessage(message, role) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", role);
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Manejar el envío del formulario
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (message) {
    sendMessage(message);
    chatInput.value = "";
  }
});

// Iniciar WebSocket
connectWebSocket();
