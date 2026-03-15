import { ref, computed, onUnmounted } from "vue";
import { io } from "socket.io-client";
import hark from "hark";
import { useVolumeStorage } from "./useVolumeStorage";
import { useSoundEffects } from "./useSoundEffects";

function getSocketUrl(): string {
  // В dev используем тот же origin — Vite проксирует /socket.io на бэкенд (избегаем SSL на порту 8000)
  if (import.meta.env.DEV) return window.location.origin;
  return window.location.origin;
}

export interface Participant {
  id: string;
  userName: string;
  stream?: MediaStream;
  volume: number;
  muted?: boolean;
  streaming?: { isVideoEnabled: boolean; isScreenSharing: boolean };
  /** Dummy audio element so browser allows playback from MediaStream (autoplay policy) */
  audioElement?: HTMLAudioElement;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

export function useVoiceRoom() {
  const { saveVolume, getVolume: getStorageVolume } = useVolumeStorage();
  const { playJoinSound, playLeaveSound, initAudioContext } = useSoundEffects();
  const socket = ref<ReturnType<typeof io> | null>(null);
  const myId = ref<string | null>(null);
  const myStream = ref<MediaStream | null>(null);
  const participants = ref<Map<string, Participant>>(new Map());
  const roomId = ref("");
  const userName = ref("");
  const isMuted = ref(localStorage.getItem("isMuted") === "true");
  const isTotalMuted = ref(localStorage.getItem("isTotalMuted") === "true");
  const isVideoEnabled = ref(false);
  const isScreenSharing = ref(false);
  const cameraTrack = ref<MediaStreamTrack | null>(null);
  const screenTrack = ref<MediaStreamTrack | null>(null);
  const isNoiseSuppressionEnabled = ref(false); // По умолчанию выключено
  const isConnected = ref(false);
  const roomFull = ref(false);
  const error = ref<string | null>(null);

  const messages = ref<ChatMessage[]>([]);

  // Volume King tracking
  const volumeKing = ref<{
    id: string;
    name: string;
    maxVolume: number;
  } | null>(null);
  const VOLUME_KING_THRESHOLD = -20; // dB threshold for considering someone a "Volume King" (loud speaking/shouting)

  // Hark integration
  const speakingMap = ref<Record<string, boolean>>({});
  const audioLevelMap = ref<Record<string, number>>({});
  const speechEventsMap = new Map<string, hark.Harker>();

  function trackSpeaking(streamId: string, stream: MediaStream) {
    if (!stream.getAudioTracks().length) return;

    if (speechEventsMap.has(streamId)) {
      speechEventsMap.get(streamId)?.stop();
    }

    const speechEvents = hark(stream, {
      threshold: -65, // Lower threshold to make it pick up sound easier
      interval: 50, // faster checks
    });

    speechEvents.on("speaking", () => {
      speakingMap.value = { ...speakingMap.value, [streamId]: true };
    });

    speechEvents.on("stopped_speaking", () => {
      speakingMap.value = { ...speakingMap.value, [streamId]: false };
      audioLevelMap.value = { ...audioLevelMap.value, [streamId]: 0 };
    });

    speechEvents.on("volume_change", (currentVolume) => {
      // Map volume from roughly -70dB (quiet) to -10dB (loud) to a 0-1 scale
      const level = Math.max(0, Math.min(1, (currentVolume + 70) / 60));
      audioLevelMap.value = { ...audioLevelMap.value, [streamId]: level };

      // Volume King Logic - only consider if they are louder than threshold AND louder than current record
      if (currentVolume > VOLUME_KING_THRESHOLD) {
        if (!volumeKing.value || currentVolume > volumeKing.value.maxVolume) {
          const isMe = streamId === myId.value;
          const uname = isMe
            ? userName.value
            : participants.value.get(streamId)?.userName;
          if (uname) {
            const newKing = {
              id: streamId,
              name: uname,
              maxVolume: currentVolume,
            };
            volumeKing.value = newKing;
            // Broadcast the new king to the room
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

  const participantList = computed(() =>
    Array.from(participants.value.values()).map((p) => ({
      ...p,
      volume: getVolume(p.id),
      isSpeaking: speakingMap.value[p.id] || false,
      audioLevel: audioLevelMap.value[p.id] || 0,
    })),
  );

  const isLocalSpeaking = computed(() =>
    myId.value ? !!speakingMap.value[myId.value] : false,
  );
  const localAudioLevel = computed(() =>
    myId.value ? audioLevelMap.value[myId.value] || 0 : 0,
  );

  const peerVolumes = ref<Record<string, number>>({});

  function getVolume(peerId: string): number {
    return peerVolumes.value[peerId] ?? 100;
  }

  function setVolume(peerId: string, value: number) {
    peerVolumes.value = { ...peerVolumes.value, [peerId]: value };
    const p = participants.value.get(peerId);
    if (p) {
      setRemoteStreamVolume(peerId, value);
      saveVolume(p.userName, value);
    }
  }

  const peerConnections = ref<Map<string, RTCPeerConnection>>(new Map());
  /** ICE candidates received before remoteDescription is set — drain after setRemoteDescription */
  const iceCandidateQueues = ref<Map<string, RTCIceCandidateInit[]>>(new Map());
  const currentIceServers = ref<RTCIceServer[]>([
    {
      urls: "turn:82.202.143.156:3478",
      username: "jamal",
      credential: "supersecretpassword",
    },
  ]);

  async function getLocalStream(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    // Apply current mute state
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted.value;
    });

    myStream.value = stream;
    if (myId.value) {
      trackSpeaking(myId.value, stream);
    }
    return stream;
  }

  /** Drain queued ICE candidates for a peer after setRemoteDescription. */
  async function drainIceQueue(peerId: string, pc: RTCPeerConnection) {
    const queue = iceCandidateQueues.value.get(peerId);
    if (!queue?.length) return;
    console.log(
      "[WebRTC] Draining ICE queue for",
      peerId,
      "candidates:",
      queue.length,
    );
    for (const c of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
        console.log("[WebRTC] addIceCandidate (from queue) ok for", peerId);
      } catch (err) {
        console.warn(
          "[WebRTC] addIceCandidate (from queue) failed for",
          peerId,
          err,
        );
      }
    }
    iceCandidateQueues.value.delete(peerId);
    iceCandidateQueues.value = new Map(iceCandidateQueues.value);
  }

  function setRemoteStreamVolume(peerId: string, volume: number) {
    const p = participants.value.get(peerId);
    if (p?.audioElement) {
      p.audioElement.volume = (isTotalMuted.value ? 0 : volume) / 100;
    }
  }

  function updateStreamingStatus() {
    socket.value?.emit("update-streaming-status", {
      isVideoEnabled: isVideoEnabled.value,
      isScreenSharing: isScreenSharing.value,
    });
  }

  function createPeerConnection(
    remoteId: string,
    remoteName: string,
    streamingStatus?: { isVideoEnabled: boolean; isScreenSharing: boolean },
  ) {
    if (peerConnections.value.has(remoteId))
      return peerConnections.value.get(remoteId)!;
    const pc = new RTCPeerConnection({
      iceServers: currentIceServers.value,
    });
    peerConnections.value.set(remoteId, pc);

    const initialVolume = getStorageVolume(remoteName);
    peerVolumes.value[remoteId] = initialVolume;

    const participant: Participant = {
      id: remoteId,
      userName: remoteName,
      volume: initialVolume,
      streaming: streamingStatus || {
        isVideoEnabled: false,
        isScreenSharing: false,
      },
    };
    participants.value.set(remoteId, participant);
    participants.value = new Map(participants.value);

    // If remote participant is already streaming, we must ensure we can receive video.
    // In modern WebRTC, each video track needs its own transceiver slot in the SDP.
    if (streamingStatus?.isVideoEnabled) {
      pc.addTransceiver("video", { direction: "recvonly" });
    }
    if (streamingStatus?.isScreenSharing) {
      pc.addTransceiver("video", { direction: "recvonly" });
    }

    pc.ontrack = (e) => {
      console.log(
        "[WebRTC] ontrack from",
        remoteId,
        "kind:",
        e.track.kind,
        "streamId:",
        e.streams?.[0]?.id,
      );
      let stream = participant.stream;
      if (!stream) {
        stream = e.streams?.[0] ?? new MediaStream();
        participant.stream = stream;
      }
      if (!stream.getTracks().includes(e.track)) {
        stream.addTrack(e.track);
        participant.stream = new MediaStream(stream.getTracks());
      }

      trackSpeaking(remoteId, participant.stream!);

      if (e.track.kind === "audio" && !participant.audioElement) {
        const audioEl = new Audio();
        audioEl.autoplay = true;
        audioEl.setAttribute("playsinline", "true");
        audioEl.srcObject = stream;
        audioEl.volume = (isTotalMuted.value ? 0 : getVolume(remoteId)) / 100;
        document.body.appendChild(audioEl);
        audioEl
          .play()
          .catch((err) =>
            console.warn("[WebRTC] audio play failed for", remoteId, err),
          );
        participant.audioElement = audioEl;
      }

      participants.value = new Map(participants.value);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && socket.value) {
        console.log("[WebRTC] onicecandidate -> send to", remoteId);
        socket.value.emit("ice-candidate", {
          to: remoteId,
          candidate: e.candidate,
        });
      }
    };

    // Add our tracks for both initiator and responder so both sides send audio
    if (myStream.value) {
      myStream.value
        .getTracks()
        .forEach((track) => pc.addTrack(track, myStream.value!));
    }

    return pc;
  }

  async function join(rId: string, uName: string) {
    roomId.value = rId;
    userName.value = uName;
    roomFull.value = false;
    error.value = null;
    initAudioContext();
    try {
      await getLocalStream();
    } catch (e) {
      error.value = "Нет доступа к микрофону";
      return;
    }

    // try {
    //   // Calling the REST API TO fetch the TURN Server Credentials
    //   const response = await fetch("https://jamal_4_fun.metered.live/api/v1/turn/credentials?apiKey=4fcbcce99bf52f2cf449625475c0eb849f0d");

    //   // Saving the response in the iceServers array
    //   currentIceServers.value = await response.json();
    // } catch (err) {
    //   console.error("[WebRTC] Failed to fetch TURN servers:", err);
    // }

    // Web Audio API has been removed, so no suspended context to resume here
    // Safari might still require a user gesture to play audio tracks, but the tracks
    // arrive asynchronously and our dummy audio is attached dynamically.
    // Autoplay policy usually allows play() if the document has received a user gesture (like the join button click).

    const s = io(getSocketUrl());
    socket.value = s;

    s.on(
      "joined",
      async ({
        yourId,
        participants: list,
        volumeKing: roomKing,
        messages: roomMessages,
      }: {
        yourId: string;
        participants: {
          id: string;
          userName: string;
          streaming: { isVideoEnabled: boolean; isScreenSharing: boolean };
        }[];
        volumeKing?: { id: string; name: string; maxVolume: number } | null;
        messages: ChatMessage[];
      }) => {
        myId.value = yourId;
        isConnected.value = true;
        playJoinSound();
        messages.value = roomMessages || [];
        if (roomKing) {
          volumeKing.value = roomKing;
        }
        if (myStream.value) {
          trackSpeaking(yourId, myStream.value);
        }
        for (const p of list) {
          peerVolumes.value[p.id] = 100;
          const pc = createPeerConnection(p.id, p.userName, p.streaming);
          console.log("[WebRTC] createOffer for", p.id);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit("offer", { to: p.id, offer });
        }
      },
    );

    s.on("room-full", () => {
      roomFull.value = true;
      leave();
    });

    s.on(
      "participant-joined",
      async ({
        id: remoteId,
        userName: remoteName,
        streaming: remoteStreaming,
      }: {
        id: string;
        userName: string;
        streaming: { isVideoEnabled: boolean; isScreenSharing: boolean };
      }) => {
        peerVolumes.value[remoteId] = 100;
        playJoinSound();
        createPeerConnection(remoteId, remoteName, remoteStreaming);
      },
    );

    s.on(
      "streaming-status-updated",
      ({
        id,
        streaming,
      }: {
        id: string;
        streaming: { isVideoEnabled: boolean; isScreenSharing: boolean };
      }) => {
        const p = participants.value.get(id);
        if (p) {
          p.streaming = streaming;
          participants.value = new Map(participants.value);
        }
      },
    );

    s.on(
      "volume-king-updated",
      (newKing: { id: string; name: string; maxVolume: number } | null) => {
        volumeKing.value = newKing;
      },
    );

    s.on("new-message", (msg: ChatMessage) => {
      messages.value.push(msg);
    });

    s.on("participant-left", ({ id: remoteId }: { id: string }) => {
      const p = participants.value.get(remoteId);
      playLeaveSound();
      if (p?.audioElement) {
        p.audioElement.pause();
        p.audioElement.srcObject = null;
        p.audioElement.remove(); // Remove from DOM
      }
      peerConnections.value.get(remoteId)?.close();
      peerConnections.value.delete(remoteId);
      iceCandidateQueues.value.delete(remoteId);
      iceCandidateQueues.value = new Map(iceCandidateQueues.value);
      participants.value.delete(remoteId);
      participants.value = new Map(participants.value);
      delete peerVolumes.value[remoteId];
      stopTrackingSpeaking(remoteId);
    });

    s.on(
      "offer",
      async ({
        from: remoteId,
        userName: remoteName,
        offer,
        streaming: remoteStreaming,
      }: {
        from: string;
        userName: string;
        offer: RTCSessionDescriptionInit;
        streaming?: { isVideoEnabled: boolean; isScreenSharing: boolean };
      }) => {
        const pc = createPeerConnection(remoteId, remoteName, remoteStreaming);
        console.log("[WebRTC] setRemoteDescription(offer) for", remoteId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceQueue(remoteId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit("answer", { to: remoteId, answer });
      },
    );

    s.on(
      "answer",
      async ({
        from: remoteId,
        answer,
      }: {
        from: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        const pc = peerConnections.value.get(remoteId);
        if (pc) {
          console.log("[WebRTC] setRemoteDescription(answer) for", remoteId);
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainIceQueue(remoteId, pc);
        }
      },
    );

    s.on(
      "ice-candidate",
      async ({
        from: remoteId,
        candidate,
      }: {
        from: string;
        candidate: RTCIceCandidateInit;
      }) => {
        if (!candidate) return;
        const pc = peerConnections.value.get(remoteId);
        if (!pc) return;
        if (!pc.remoteDescription) {
          const queue = iceCandidateQueues.value.get(remoteId) ?? [];
          queue.push(candidate);
          iceCandidateQueues.value.set(remoteId, queue);
          iceCandidateQueues.value = new Map(iceCandidateQueues.value);
          console.log(
            "[WebRTC] ICE candidate queued for",
            remoteId,
            "queue size:",
            queue.length,
          );
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("[WebRTC] addIceCandidate ok for", remoteId);
        } catch (err) {
          console.warn("[WebRTC] addIceCandidate failed for", remoteId, err);
        }
      },
    );

    s.emit("join-room", { roomId: rId, userName: uName });
  }

  function sendMessage(text: string) {
    if (!text.trim() || !socket.value) return;
    socket.value.emit("send-message", { roomId: roomId.value, text });
  }

  function leave() {
    socket.value?.disconnect();
    socket.value = null;
    myStream.value?.getTracks().forEach((t) => t.stop());
    myStream.value = null;
    cameraTrack.value?.stop();
    cameraTrack.value = null;
    screenTrack.value?.stop();
    screenTrack.value = null;
    participants.value.forEach((p) => {
      if (p.audioElement) {
        p.audioElement.pause();
        p.audioElement.srcObject = null;
        p.audioElement.remove();
      }
    });
    peerConnections.value.forEach((pc) => pc.close());
    peerConnections.value.clear();
    iceCandidateQueues.value.clear();
    iceCandidateQueues.value = new Map();
    participants.value.clear();
    stopTrackingSpeaking();
    myId.value = null;
    isConnected.value = false;
    isVideoEnabled.value = false;
    isScreenSharing.value = false;
    roomId.value = "";
    userName.value = "";
    peerVolumes.value = {};
    messages.value = [];
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
    localStorage.setItem("isMuted", String(isMuted.value));

    // Если мы включаем микрофон при активном тотальном муте — выключаем тотальный мут
    if (!isMuted.value && isTotalMuted.value) {
      isTotalMuted.value = false;
      localStorage.setItem("isTotalMuted", "false");

      // Восстанавливаем громкость всех участников
      participants.value.forEach((p, id) => {
        if (p.audioElement) {
          const vol = getVolume(id);
          p.audioElement.volume = vol / 100;
        }
      });
    }

    myStream.value?.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted.value;
    });
  }

  function toggleTotalMute() {
    isTotalMuted.value = !isTotalMuted.value;
    localStorage.setItem("isTotalMuted", String(isTotalMuted.value));

    // Синхронизируем состояние микрофона с тотальным мутом
    isMuted.value = isTotalMuted.value;
    localStorage.setItem("isMuted", String(isMuted.value));

    // Обновляем состояние дорожек микрофона
    myStream.value?.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted.value;
    });

    // Обновляем громкость всех участников
    participants.value.forEach((p, id) => {
      if (p.audioElement) {
        const vol = getVolume(id);
        p.audioElement.volume = (isTotalMuted.value ? 0 : vol) / 100;
      }
    });
  }

  async function toggleVideo() {
    if (isVideoEnabled.value && cameraTrack.value) {
      isVideoEnabled.value = false;
      cameraTrack.value.stop();
      if (myStream.value) {
        myStream.value.removeTrack(cameraTrack.value);
        myStream.value = new MediaStream(myStream.value.getTracks());
      }
      updateStreamingStatus();
      for (const [remoteId, pc] of peerConnections.value) {
        const sender = pc
          .getSenders()
          .find((s) => s.track === cameraTrack.value);
        if (sender) pc.removeTrack(sender);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.value?.emit("offer", {
          to: remoteId,
          offer,
          streaming: {
            isVideoEnabled: isVideoEnabled.value,
            isScreenSharing: isScreenSharing.value,
          },
        });
      }
      cameraTrack.value = null;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const track = stream.getVideoTracks()[0];
        if (!track) throw new Error("No video track");
        isVideoEnabled.value = true;
        cameraTrack.value = track;
        if (!myStream.value) myStream.value = new MediaStream();
        myStream.value.addTrack(track);
        myStream.value = new MediaStream(myStream.value.getTracks());
        updateStreamingStatus();
        for (const [remoteId, pc] of peerConnections.value) {
          pc.addTrack(track, myStream.value);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.value?.emit("offer", {
            to: remoteId,
            offer,
            streaming: {
              isVideoEnabled: isVideoEnabled.value,
              isScreenSharing: isScreenSharing.value,
            },
          });
        }
      } catch (err) {
        console.error("[WebRTC] Failed to get video track", err);
        error.value = "Нет доступа к камере";
      }
    }
  }

  async function toggleScreenShare() {
    if (isScreenSharing.value && screenTrack.value) {
      isScreenSharing.value = false;
      screenTrack.value.stop();
      if (myStream.value) {
        myStream.value.removeTrack(screenTrack.value);
        myStream.value = new MediaStream(myStream.value.getTracks());
      }
      updateStreamingStatus();
      for (const [remoteId, pc] of peerConnections.value) {
        const sender = pc
          .getSenders()
          .find((s) => s.track === screenTrack.value);
        if (sender) pc.removeTrack(sender);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.value?.emit("offer", {
          to: remoteId,
          offer,
          streaming: {
            isVideoEnabled: isVideoEnabled.value,
            isScreenSharing: isScreenSharing.value,
          },
        });
      }
      screenTrack.value = null;
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const track = stream.getVideoTracks()[0];
        if (!track) throw new Error("No screen track");

        isScreenSharing.value = true;
        screenTrack.value = track;

        // Handle native browser "Stop sharing" button
        track.onended = () => {
          if (isScreenSharing.value) {
            toggleScreenShare();
          }
        };

        if (!myStream.value) {
          myStream.value = new MediaStream();
        }
        myStream.value.addTrack(track);
        myStream.value = new MediaStream(myStream.value.getTracks());
        updateStreamingStatus();

        for (const [remoteId, pc] of peerConnections.value) {
          pc.addTrack(track, myStream.value);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.value?.emit("offer", {
            to: remoteId,
            offer,
            streaming: {
              isVideoEnabled: isVideoEnabled.value,
              isScreenSharing: isScreenSharing.value,
            },
          });
        }
      } catch (err) {
        console.error("[WebRTC] Failed to get screen share", err);
        if (!isScreenSharing.value) {
          // Ignore cancellation errors
        }
      }
    }
  }

  async function toggleNoiseSuppression() {
    isNoiseSuppressionEnabled.value = !isNoiseSuppressionEnabled.value;
    if (myStream.value) {
      myStream.value.getAudioTracks().forEach(async (track) => {
        try {
          await track.applyConstraints({
            noiseSuppression: isNoiseSuppressionEnabled.value,
            echoCancellation: isNoiseSuppressionEnabled.value,
          });
        } catch (err) {
          console.error(
            "[WebRTC] Failed to apply noise suppression constraints",
            err,
          );
        }
      });
    }
  }

  onUnmounted(leave);

  return {
    myId,
    myStream,
    participants: participantList,
    peerVolumes,
    isLocalSpeaking,
    localAudioLevel,
    volumeKing,
    getVolume,
    setVolume,
    roomId,
    userName,
    isMuted,
    isTotalMuted,
    isVideoEnabled,
    isScreenSharing,
    isNoiseSuppressionEnabled,
    isConnected,
    roomFull,
    error,
    messages,
    join,
    leave,
    sendMessage,
    toggleMute,
    toggleTotalMute,
    toggleVideo,
    toggleScreenShare,
    toggleNoiseSuppression,
  };
}
