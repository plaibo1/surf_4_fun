import { ref, computed, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

function getSocketUrl(): string {
  // В dev используем тот же origin — Vite проксирует /socket.io на бэкенд (избегаем SSL на порту 8000)
  if (import.meta.env.DEV) return window.location.origin
  return window.location.origin
}

export interface Participant {
  id: string
  userName: string
  stream?: MediaStream
  volume: number
  muted?: boolean
}

export function useVoiceRoom() {
  const socket = ref<ReturnType<typeof io> | null>(null)
  const myId = ref<string | null>(null)
  const myStream = ref<MediaStream | null>(null)
  const participants = ref<Map<string, Participant>>(new Map())
  const roomId = ref('')
  const userName = ref('')
  const isMuted = ref(false)
  const isConnected = ref(false)
  const roomFull = ref(false)
  const error = ref<string | null>(null)

  const participantList = computed(() =>
    Array.from(participants.value.values()).map((p) => ({
      ...p,
      volume: getVolume(p.id),
    }))
  )

  const peerVolumes = ref<Record<string, number>>({})

  function getVolume(peerId: string): number {
    return peerVolumes.value[peerId] ?? 100
  }

  function setVolume(peerId: string, value: number) {
    peerVolumes.value = { ...peerVolumes.value, [peerId]: value }
    const p = participants.value.get(peerId)
    if (p?.stream) setRemoteStreamVolume(peerId, p.stream, value)
  }

  const peerConnections = ref<Map<string, RTCPeerConnection>>(new Map())
  const audioContext = ref<AudioContext | null>(null)
  const gainNodes = ref<Map<string, GainNode>>(new Map())

  async function getLocalStream(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    myStream.value = stream
    return stream
  }

  function ensureAudioContext(): AudioContext {
    if (!audioContext.value) {
      audioContext.value = new AudioContext()
    }
    return audioContext.value
  }

  async function resumeAudioContextIfNeeded() {
    const ctx = audioContext.value
    if (ctx?.state === 'suspended') {
      await ctx.resume()
    }
  }

  function setRemoteStreamVolume(peerId: string, stream: MediaStream, volume: number) {
    const ctx = ensureAudioContext()
    let gain = gainNodes.value.get(peerId)
    if (!gain) {
      const source = ctx.createMediaStreamSource(stream)
      gain = ctx.createGain()
      source.connect(gain)
      gain.connect(ctx.destination)
      gainNodes.value.set(peerId, gain)
      resumeAudioContextIfNeeded()
    }
    gain.gain.value = volume / 100
  }

  function createPeerConnection(remoteId: string, remoteName: string, isInitiator: boolean) {
    if (peerConnections.value.has(remoteId)) return peerConnections.value.get(remoteId)!
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })
    peerConnections.value.set(remoteId, pc)

    const participant: Participant = {
      id: remoteId,
      userName: remoteName,
      volume: getVolume(remoteId),
    }
    participants.value.set(remoteId, participant)
    participants.value = new Map(participants.value)

    pc.ontrack = (e) => {
      const stream = e.streams?.[0] ?? new MediaStream([e.track])
      if (!stream.getAudioTracks().length && !stream.getVideoTracks().length) return
      participant.stream = stream
      const vol = getVolume(remoteId)
      setRemoteStreamVolume(remoteId, stream, vol)
      participants.value = new Map(participants.value)
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && socket.value)
        socket.value.emit('ice-candidate', { to: remoteId, candidate: e.candidate })
    }

    if (myStream.value && isInitiator) {
      myStream.value.getTracks().forEach((track) => pc.addTrack(track, myStream.value!))
    }

    return pc
  }

  async function join(rId: string, uName: string) {
    roomId.value = rId
    userName.value = uName
    roomFull.value = false
    error.value = null
    try {
      await getLocalStream()
    } catch (e) {
      error.value = 'Нет доступа к микрофону'
      return
    }

    // На мобильных AudioContext по умолчанию suspended — разблокируем по жесту (мы только что нажали «Войти»)
    ensureAudioContext()
    await resumeAudioContextIfNeeded()

    const s = io(getSocketUrl())
    socket.value = s

    s.on('joined', async ({ yourId, participants: list }: { yourId: string; participants: { id: string; userName: string }[] }) => {
      myId.value = yourId
      isConnected.value = true
      for (const p of list) {
        peerVolumes.value[p.id] = 100
        const pc = createPeerConnection(p.id, p.userName, true)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        s.emit('offer', { to: p.id, offer })
      }
    })

    s.on('room-full', () => {
      roomFull.value = true
      leave()
    })

    s.on('participant-joined', async ({ id: remoteId, userName: remoteName }: { id: string; userName: string }) => {
      peerVolumes.value[remoteId] = 100
      createPeerConnection(remoteId, remoteName, false)
    })

    s.on('participant-left', ({ id: remoteId }: { id: string }) => {
      peerConnections.value.get(remoteId)?.close()
      peerConnections.value.delete(remoteId)
      gainNodes.value.delete(remoteId)
      participants.value.delete(remoteId)
      participants.value = new Map(participants.value)
      delete peerVolumes.value[remoteId]
    })

    s.on('offer', async ({ from: remoteId, userName: remoteName, offer }: { from: string; userName: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeerConnection(remoteId, remoteName, false)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      // Ответчик тоже должен отправить свой микрофон, иначе инициатор его не услышит
      if (myStream.value) {
        myStream.value.getTracks().forEach((track) => pc.addTrack(track, myStream.value!))
      }
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      s.emit('answer', { to: remoteId, answer })
    })

    s.on('answer', async ({ from: remoteId, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.value.get(remoteId)
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    })

    s.on('ice-candidate', async ({ from: remoteId, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.value.get(remoteId)
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate))
    })

    s.emit('join-room', { roomId: rId, userName: uName })
  }

  function leave() {
    socket.value?.disconnect()
    socket.value = null
    myStream.value?.getTracks().forEach((t) => t.stop())
    myStream.value = null
    peerConnections.value.forEach((pc) => pc.close())
    peerConnections.value.clear()
    gainNodes.value.clear()
    audioContext.value?.close()
    audioContext.value = null
    participants.value.clear()
    myId.value = null
    isConnected.value = false
    roomId.value = ''
    userName.value = ''
    peerVolumes.value = {}
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    myStream.value?.getAudioTracks().forEach((t) => {
      t.enabled = !isMuted.value
    })
  }

  onUnmounted(leave)

  return {
    myId,
    myStream,
    participants: participantList,
    peerVolumes,
    getVolume,
    setVolume,
    roomId,
    userName,
    isMuted,
    isConnected,
    roomFull,
    error,
    join,
    leave,
    toggleMute,
    resumeAudioContextIfNeeded,
  }
}
