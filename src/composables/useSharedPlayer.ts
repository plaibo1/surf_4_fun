import { ref, type Ref } from 'vue';


export interface SharedPlayerState {
  url: string | null;
  platform: string | null;
  playing: boolean;
  currentTime: number;
  lastUpdate: number;
}

export function useSharedPlayer(socket: Ref<any>, roomId: Ref<string>) {
  const sharedPlayerState = ref<SharedPlayerState>({
    url: null,
    platform: null,
    playing: false,
    currentTime: 0,
    lastUpdate: Date.now(),
  });

  function setupSharedPlayerListeners(s: any) {
    s.on("player-state-update", (state: SharedPlayerState) => {
      sharedPlayerState.value = state;
    });
  }

  function sendPlayerCommand(command: {
    type: "load" | "play" | "pause" | "seek";
    url?: string;
    platform?: string;
    currentTime?: number;
  }) {
    if (!socket.value || !roomId.value) return;
    socket.value.emit("player-command", {
      roomId: roomId.value,
      command,
    });
  }

  function clearPlayerState() {
    sharedPlayerState.value = {
      url: null,
      platform: null,
      playing: false,
      currentTime: 0,
      lastUpdate: Date.now(),
    };
  }

  function setPlayerState(state: SharedPlayerState) {
    sharedPlayerState.value = state;
  }

  return {
    sharedPlayerState,
    setupSharedPlayerListeners,
    sendPlayerCommand,
    clearPlayerState,
    setPlayerState,
  };
}
