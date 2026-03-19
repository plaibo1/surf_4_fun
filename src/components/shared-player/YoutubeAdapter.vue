<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useSoundEffects } from '@/composables/useSoundEffects'

const props = defineProps<{
  state: {
    url: string | null;
    playing: boolean;
    currentTime: number;
    lastUpdate: number;
  }
}>()

const emit = defineEmits<{
  (e: 'command', cmd: { type: string; currentTime: number }): void
}>()

const player = ref<any>(null)
const playerElement = ref<HTMLElement | null>(null)
const isPlayerReady = ref(false)
const { initAudioContext } = useSoundEffects()
let isSyncing = false
let syncTimeout: any = null

function extractVideoId(url: string | null | undefined) {
  if (!url) return null
  if (url.length === 11 && !url.includes('/') && !url.includes('.')) return url
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[7] && match[7].length === 11) ? match[7] : null
}

function loadYoutubeApi() {
  if ((window as any).YT && (window as any).YT.Player) {
    onYouTubeIframeAPIReady()
    return
  }
  const tag = document.createElement('script')
  tag.src = "https://www.youtube.com/iframe_api"
  const firstScriptTag = document.getElementsByTagName('script')[0]
  if (firstScriptTag && firstScriptTag.parentNode) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
  } else {
    document.head.appendChild(tag)
  }
  ;(window as any).onYouTubeIframeAPIReady = onYouTubeIframeAPIReady
}

function onYouTubeIframeAPIReady() {
  if (!playerElement.value || ! (window as any).YT || ! (window as any).YT.Player) return
  player.value = new (window as any).YT.Player(playerElement.value, {
    height: '100%',
    width: '100%',
    videoId: props.state.url ? (extractVideoId(props.state.url) || '') : '',
    playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0 },
    events: {
      onReady: () => {
        initAudioContext()
        isPlayerReady.value = true
        applySyncState(props.state)
      },
      onStateChange: (event: any) => {
        if (isSyncing || !player.value || typeof player.value.getCurrentTime !== 'function') return
        const YT_STATE = (window as any).YT.PlayerState
        const currentTime = player.value.getCurrentTime()
        if (event.data === YT_STATE.PLAYING) {
          emit('command', { type: 'play', currentTime })
        } else if (event.data === YT_STATE.PAUSED) {
          emit('command', { type: 'pause', currentTime })
        }
      }
    }
  })
}

function applySyncState(state: typeof props.state) {
  if (!player.value || !isPlayerReady.value || typeof player.value.getPlayerState !== 'function') return
  isSyncing = true
  if (syncTimeout) clearTimeout(syncTimeout)

  let currentVideoId = null
  try {
    if (player.value.getVideoData) {
      const data = player.value.getVideoData()
      currentVideoId = data ? extractVideoId(data.video_id) : null
    }
  } catch (e) {}
  
  const targetVideoId = state.url ? extractVideoId(state.url) : null

  if (targetVideoId && targetVideoId !== currentVideoId) {
    player.value.loadVideoById(targetVideoId, state.currentTime)
    if (!state.playing) player.value.pauseVideo()
  } else if (targetVideoId) {
    const playerTime = player.value.getCurrentTime()
    let targetTime = state.currentTime
    if (state.playing) {
      targetTime += (Date.now() - state.lastUpdate) / 1000
    }
    if (Math.abs(playerTime - targetTime) > 2) {
      player.value.seekTo(targetTime, true)
    }
    const playerState = player.value.getPlayerState()
    const YT_STATE = (window as any).YT.PlayerState
    if (state.playing && playerState !== YT_STATE.PLAYING) {
      player.value.playVideo()
    } else if (!state.playing && playerState === YT_STATE.PLAYING) {
      player.value.pauseVideo()
    }
  }

  syncTimeout = setTimeout(() => { isSyncing = false }, 500)
}

watch(() => props.state, (newState) => applySyncState(newState), { deep: true })

onMounted(() => loadYoutubeApi())
onUnmounted(() => { if (player.value) player.value.destroy() })
</script>

<template>
  <div class="w-full h-full bg-black">
    <div ref="playerElement"></div>
  </div>
</template>
