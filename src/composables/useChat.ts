import { ref, type Ref } from 'vue';


export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

export function useChat(socket: Ref<any>, roomId: Ref<string>) {
  const messages = ref<ChatMessage[]>([]);

  function setupChatListeners(s: any) {
    s.on("new-message", (msg: ChatMessage) => {
      messages.value.push(msg);
    });
  }

  function sendMessage(text: string) {
    if (!text.trim() || !socket.value) return;
    socket.value.emit("send-message", { roomId: roomId.value, text });
  }

  function clearMessages() {
    messages.value = [];
  }

  function setMessages(msgs: ChatMessage[]) {
    messages.value = msgs;
  }

  return {
    messages,
    setupChatListeners,
    sendMessage,
    clearMessages,
    setMessages,
  };
}
