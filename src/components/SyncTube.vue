<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import Input from '@/components/ui/input/Input.vue'
import Button from '@/components/ui/button/Button.vue'
import { Youtube, Send } from 'lucide-vue-next'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import { useSoundEffects } from '@/composables/useSoundEffects'

const props = defineProps<{
  syncTubeState: {
    url: string | null;
    playing: boolean;
    currentTime: number;
    lastUpdate: number;
  },
  sendSyncTubeCommand: (command: {
    type: "load" | "play" | "pause" | "seek";
    url?: string;
    currentTime?: number;
  }) => void
}>()

const videoUrlInput = ref('')
const player = ref<any>(null)
const playerElement = ref<HTMLElement | null>(null)
const isPlayerReady = ref(false)
const { initAudioContext } = useSoundEffects()
let isSyncing = false
let syncTimeout: any = null

function extractVideoId(url: string | null | undefined) {
  if (!url) return null
  // If it's already a 11-char ID, return it
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
  
  const videoId = props.syncTubeState.url ? (extractVideoId(props.syncTubeState.url) || '') : '';
  
  player.value = new (window as any).YT.Player(playerElement.value, {
    height: '100%',
    width: '100%',
    videoId: videoId,
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: (e: any) => console.error("[SyncTube] Player Error:", e.data)
    }
  })
}

function onPlayerReady() {
  initAudioContext()
  isPlayerReady.value = true
  applySyncState(props.syncTubeState)
}

function onPlayerStateChange(event: any) {
  if (isSyncing || !player.value || typeof player.value.getCurrentTime !== 'function') return

  const YT_STATE = (window as any).YT.PlayerState
  const currentTime = player.value.getCurrentTime()

  if (event.data === YT_STATE.PLAYING) {
    props.sendSyncTubeCommand({ type: 'play', currentTime })
  } else if (event.data === YT_STATE.PAUSED) {
    props.sendSyncTubeCommand({ type: 'pause', currentTime })
  }
}

function applySyncState(state: typeof props.syncTubeState) {
  if (!player.value || !isPlayerReady.value || typeof player.value.getPlayerState !== 'function') {
    return
  }

  isSyncing = true
  if (syncTimeout) clearTimeout(syncTimeout)

  let currentVideoId = null
  try {
    if (player.value.getVideoData) {
      const data = player.value.getVideoData()
      currentVideoId = data ? extractVideoId(data.video_id) : null
    }
  } catch (e) {
    console.warn("Failed to get current video data", e)
  }
  
  const targetVideoId = state.url ? extractVideoId(state.url) : null

  if (targetVideoId && targetVideoId !== currentVideoId) {
    player.value.loadVideoById(targetVideoId, state.currentTime)
    if (!state.playing) {
      player.value.pauseVideo()
    }
  } else if (targetVideoId) {
    const playerTime = player.value.getCurrentTime()
    let targetTime = state.currentTime
    
    // Adjust time for drift if playing
    if (state.playing) {
      const drift = (Date.now() - state.lastUpdate) / 1000
      targetTime += drift
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

  syncTimeout = setTimeout(() => {
    isSyncing = false
  }, 500)
}

watch(() => props.syncTubeState, (newState) => {
  applySyncState(newState)
}, { deep: true })

function handleLoadVideo() {
  if (!videoUrlInput.value) return
  initAudioContext()
  props.sendSyncTubeCommand({ type: 'load', url: videoUrlInput.value })
  videoUrlInput.value = ''
}

onMounted(() => {
  loadYoutubeApi()
})

onUnmounted(() => {
  if (player.value) {
    player.value.destroy()
  }
})
</script>

<template>
  <Card class="border-none shadow-2xl bg-black/95 overflow-hidden flex flex-col w-full h-full rounded-none sm:rounded-2xl">
    <CardHeader class="border-b border-white/10 bg-zinc-900/50 pb-3 px-4 sm:px-6">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-red-600/20 text-red-500">
            <Youtube class="h-4 w-4" />
          </div>
          <CardTitle class="text-base sm:text-lg font-black tracking-tight text-white">SyncTube</CardTitle>
        </div>
        <div v-if="syncTubeState.url" class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
          {{ syncTubeState.playing ? 'Воспроизведение' : 'Пауза' }}
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex-1 flex flex-col p-0 overflow-hidden relative">
      <div v-if="!syncTubeState.url" class="absolute inset-0 flex flex-col items-center justify-center text-center space-y-6 p-6">
        <div class="relative">
          <div class="absolute inset-0 bg-red-600/10 blur-3xl rounded-full"></div>
          <Youtube class="h-16 w-16 text-zinc-800 relative z-10" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-black text-white uppercase tracking-tighter">Смотрите вместе</h3>
          <p class="text-zinc-500 text-sm max-w-xs">Вставьте ссылку на YouTube, чтобы запустить совместный просмотр</p>
        </div>
        <div class="w-full max-w-md flex items-center gap-2">
          <Input 
            v-model="videoUrlInput" 
            placeholder="https://youtube.com/watch?v=..." 
            class="bg-zinc-900 border-zinc-800 text-white"
            @keyup.enter="handleLoadVideo"
          />
          <Button @click="handleLoadVideo" variant="destructive" size="icon" class="shrink-0">
            <Send class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div class="w-full h-full" :class="{ 'opacity-0 pointer-events-none': !syncTubeState.url }">
        <div ref="playerElement"></div>
      </div>

      <div v-if="syncTubeState.url" class="p-2 sm:p-3 bg-zinc-900/80 border-t border-white/5 backdrop-blur-xl flex items-center gap-2">
        <Input 
          v-model="videoUrlInput" 
          placeholder="Сменить видео..." 
          class="flex-1 h-9 bg-black/40 border-none text-[11px] px-3 text-white"
          @keyup.enter="handleLoadVideo"
        />
        <Button @click="handleLoadVideo" variant="ghost" size="icon" class="h-9 w-9 text-zinc-400 hover:text-white">
          <Send class="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
