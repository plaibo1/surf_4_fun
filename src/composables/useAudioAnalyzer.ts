import { ref, type Ref } from 'vue';

import hark from 'hark';

export interface VolumeKing {
  id: string;
  name: string;
  maxVolume: number;
}

export function useAudioAnalyzer(
  socket: Ref<any>,
  roomId: Ref<string>,
  myId: Ref<string | null>,
  userName: Ref<string>,
  getUserNameById: (id: string) => string | undefined
) {
  const volumeKing = ref<VolumeKing | null>(null);
  const VOLUME_KING_THRESHOLD = -20; // dB threshold for considering someone a "Volume King"

  const speakingMap = ref<Record<string, boolean>>({});
  const audioLevelMap = ref<Record<string, number>>({});
  const speechEventsMap = new Map<string, hark.Harker>();

  function setupAudioAnalyzerListeners(s: any) {
    s.on("volume-king-updated", (newKing: VolumeKing | null) => {
      volumeKing.value = newKing;
    });
  }

  function trackSpeaking(streamId: string, stream: MediaStream) {
    if (!stream.getAudioTracks().length) return;

    if (speechEventsMap.has(streamId)) {
      speechEventsMap.get(streamId)?.stop();
    }

    const speechEvents = hark(stream, {
      threshold: -65,
      interval: 50,
    });

    speechEvents.on("speaking", () => {
      speakingMap.value = { ...speakingMap.value, [streamId]: true };
    });

    speechEvents.on("stopped_speaking", () => {
      speakingMap.value = { ...speakingMap.value, [streamId]: false };
      audioLevelMap.value = { ...audioLevelMap.value, [streamId]: 0 };
    });

    speechEvents.on("volume_change", (currentVolume) => {
      const level = Math.max(0, Math.min(1, (currentVolume + 70) / 60));
      audioLevelMap.value = { ...audioLevelMap.value, [streamId]: level };

      if (currentVolume > VOLUME_KING_THRESHOLD) {
        if (!volumeKing.value || currentVolume > volumeKing.value.maxVolume) {
          const isMe = streamId === myId.value;
          const uname = isMe ? userName.value : getUserNameById(streamId);
          if (uname) {
            const newKing = {
              id: streamId,
              name: uname,
              maxVolume: currentVolume,
            };
            volumeKing.value = newKing;
            socket.value?.emit("new-volume-king", {
              roomId: roomId.value,
              volumeKing: newKing,
            });
          }
        }
      }
    });

    speechEventsMap.set(streamId, speechEvents);
    speakingMap.value = { ...speakingMap.value, [streamId]: false };
    audioLevelMap.value = { ...audioLevelMap.value, [streamId]: 0 };
  }

  function stopTrackingSpeaking(streamId?: string) {
    if (streamId) {
      speechEventsMap.get(streamId)?.stop();
      speechEventsMap.delete(streamId);
      const newMap = { ...speakingMap.value };
      delete newMap[streamId];
      speakingMap.value = newMap;

      const newLevelMap = { ...audioLevelMap.value };
      delete newLevelMap[streamId];
      audioLevelMap.value = newLevelMap;
    } else {
      speechEventsMap.forEach((events) => events.stop());
      speechEventsMap.clear();
      speakingMap.value = {};
      audioLevelMap.value = {};
    }
  }

  function clearAudioAnalyzerState() {
    stopTrackingSpeaking();
    volumeKing.value = null;
  }

  function setVolumeKing(king: VolumeKing | null) {
    volumeKing.value = king;
  }

  return {
    volumeKing,
    speakingMap,
    audioLevelMap,
    setupAudioAnalyzerListeners,
    trackSpeaking,
    stopTrackingSpeaking,
    clearAudioAnalyzerState,
    setVolumeKing,
  };
}
