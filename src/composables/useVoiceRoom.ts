import { ref, computed, onUnmounted } from "vue";
import { io } from "socket.io-client";
import hark from "hark";

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
  /** Dummy audio element so browser allows playback from MediaStream (autoplay policy) */
  audioElement?: HTMLAudioElement;
}

export function useVoiceRoom() {
  const socket = ref<ReturnType<typeof io> | null>(null);
  const myId = ref<string | null>(null);
  const myStream = ref<MediaStream | null>(null);
  const participants = ref<Map<string, Participant>>(new Map());
  const roomId = ref("");
  const userName = ref("");
  const isMuted = ref(false);
  const isVideoEnabled = ref(false);
  const isConnected = ref(false);
  const roomFull = ref(false);
  const error = ref<string | null>(null);

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
      interval: 50 // faster checks
    });
    
    speechEvents.on('speaking', () => {
      speakingMap.value = { ...speakingMap.value, [streamId]: true };
    });

    speechEvents.on('stopped_speaking', () => {
      speakingMap.value = { ...speakingMap.value, [streamId]: false };
      audioLevelMap.value = { ...audioLevelMap.value, [streamId]: 0 };
    });

    speechEvents.on('volume_change', (currentVolume) => {
      // Map volume from roughly -70dB (quiet) to -10dB (loud) to a 0-1 scale
      const level = Math.max(0, Math.min(1, (currentVolume + 70) / 60));
      audioLevelMap.value = { ...audioLevelMap.value, [streamId]: level };
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
      speechEventsMap.forEach(events => events.stop());
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

  const isLocalSpeaking = computed(() => myId.value ? !!speakingMap.value[myId.value] : false);
  const localAudioLevel = computed(() => myId.value ? (audioLevelMap.value[myId.value] || 0) : 0);

  const peerVolumes = ref<Record<string, number>>({});

  function getVolume(peerId: string): number {
    return peerVolumes.value[peerId] ?? 100;
  }

  function setVolume(peerId: string, value: number) {
    peerVolumes.value = { ...peerVolumes.value, [peerId]: value };
    const p = participants.value.get(peerId);
    if (p) setRemoteStreamVolume(peerId, value);
  }

  const peerConnections = ref<Map<string, RTCPeerConnection>>(new Map());
  /** ICE candidates received before remoteDescription is set — drain after setRemoteDescription */
  const iceCandidateQueues = ref<Map<string, RTCIceCandidateInit[]>>(new Map());
  const currentIceServers = ref<RTCIceServer[]>([]);

  async function getLocalStream(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
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
    console.log("[WebRTC] Draining ICE queue for", peerId, "candidates:", queue.length);
    for (const c of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
        console.log("[WebRTC] addIceCandidate (from queue) ok for", peerId);
      } catch (err) {
        console.warn("[WebRTC] addIceCandidate (from queue) failed for", peerId, err);
      }
    }
    iceCandidateQueues.value.delete(peerId);
    iceCandidateQueues.value = new Map(iceCandidateQueues.value);
  }

  function setRemoteStreamVolume(
    peerId: string,
    volume: number,
  ) {
    const p = participants.value.get(peerId);
    if (p?.audioElement) {
      p.audioElement.volume = volume / 100;
    }
  }

  function createPeerConnection(remoteId: string, remoteName: string) {
    if (peerConnections.value.has(remoteId))
      return peerConnections.value.get(remoteId)!;
    const pc = new RTCPeerConnection({
      iceServers: currentIceServers.value,
    });
    peerConnections.value.set(remoteId, pc);

    const participant: Participant = {
      id: remoteId,
      userName: remoteName,
      volume: getVolume(remoteId),
    };
    participants.value.set(remoteId, participant);
    participants.value = new Map(participants.value);

    pc.ontrack = (e) => {
      console.log("[WebRTC] ontrack from", remoteId, "kind:", e.track.kind, "streamId:", e.streams?.[0]?.id);
      let stream = participant.stream;
      if (!stream) {
        stream = e.streams?.[0] ?? new MediaStream();
        participant.stream = stream;
      }
      if (!stream.getTracks().includes(e.track)) {
        stream.addTrack(e.track);
      }
      
      trackSpeaking(remoteId, stream);
      
      if (e.track.kind === 'audio' && !participant.audioElement) {
        const audioEl = new Audio();
        audioEl.autoplay = true;
        audioEl.setAttribute("playsinline", "true");
        audioEl.srcObject = stream;
        audioEl.volume = getVolume(remoteId) / 100;
        document.body.appendChild(audioEl);
        audioEl.play().catch((err) => console.warn("[WebRTC] audio play failed for", remoteId, err));
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
    try {
      await getLocalStream();
    } catch (e) {
      error.value = "Нет доступа к микрофону";
      return;
    }

    try {
      // Calling the REST API TO fetch the TURN Server Credentials
      const response = await fetch("https://jamal_4_fun.metered.live/api/v1/turn/credentials?apiKey=4fcbcce99bf52f2cf449625475c0eb849f0d");
      
      // Saving the response in the iceServers array
      currentIceServers.value = await response.json();
    } catch (err) {
      console.error("[WebRTC] Failed to fetch TURN servers:", err);
    }

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
      }: {
        yourId: string;
        participants: { id: string; userName: string }[];
      }) => {
        myId.value = yourId;
        isConnected.value = true;
        if (myStream.value) {
          trackSpeaking(yourId, myStream.value);
        }
        for (const p of list) {
          peerVolumes.value[p.id] = 100;
          const pc = createPeerConnection(p.id, p.userName);
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
      }: {
        id: string;
        userName: string;
      }) => {
        peerVolumes.value[remoteId] = 100;
        createPeerConnection(remoteId, remoteName);
      },
    );

    s.on("participant-left", ({ id: remoteId }: { id: string }) => {
      const p = participants.value.get(remoteId);
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
      }: {
        from: string;
        userName: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        const pc = createPeerConnection(remoteId, remoteName);
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
          console.log("[WebRTC] ICE candidate queued for", remoteId, "queue size:", queue.length);
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

  function leave() {
    socket.value?.disconnect();
    socket.value = null;
    myStream.value?.getTracks().forEach((t) => t.stop());
    myStream.value = null;
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
    roomId.value = "";
    userName.value = "";
    peerVolumes.value = {};
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
    myStream.value?.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted.value;
    });
  }

  async function toggleVideo() {
    if (isVideoEnabled.value) {
      isVideoEnabled.value = false;
      const videoTrack = myStream.value?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        myStream.value?.removeTrack(videoTrack);
        for (const [remoteId, pc] of peerConnections.value) {
          const sender = pc.getSenders().find(s => s.track === videoTrack);
          if (sender) pc.removeTrack(sender);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.value?.emit("offer", { to: remoteId, offer });
        }
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) throw new Error("No video track");
        isVideoEnabled.value = true;
        myStream.value?.addTrack(videoTrack);
        for (const [remoteId, pc] of peerConnections.value) {
          pc.addTrack(videoTrack, myStream.value!);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.value?.emit("offer", { to: remoteId, offer });
        }
      } catch (err) {
        console.error("[WebRTC] Failed to get video track", err);
        error.value = "Нет доступа к камере";
      }
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
    getVolume,
    setVolume,
    roomId,
    userName,
    isMuted,
    isVideoEnabled,
    isConnected,
    roomFull,
    error,
    join,
    leave,
    toggleMute,
    toggleVideo,
    resumeAudioContextIfNeeded: () => {}, // empty function for backward compatibility with UI
  };
}
