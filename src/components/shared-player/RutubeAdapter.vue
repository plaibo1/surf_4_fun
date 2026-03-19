<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

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

const iframeRef = ref<HTMLIFrameElement | null>(null)
const isPlayerReady = ref(false)
let isSyncing = false
let syncTimeout: any = null

function extractVideoId(url: string | null | undefined) {
  if (!url) return null
  const match = url.match(/(?:rutube\.ru\/video\/|rutube\.ru\/play\/embed\/)([a-zA-Z0-9]+)/)
  return match ? match[1] : null
}

const embedUrl = ref('')

watch(() => props.state.url, (newUrl) => {
  const id = extractVideoId(newUrl)
  if (id) {
    // Добавляем параметры для работы API
    embedUrl.value = `https://rutube.ru/play/embed/${id}?skinColor=ff0000&player=1`
    isPlayerReady.value = false // Сбрасываем готовность при смене видео
  }
}, { immediate: true })

function sendCommand(type: string, data: any = {}) {
  if (iframeRef.value?.contentWindow && isPlayerReady.value) {
    iframeRef.value.contentWindow.postMessage(JSON.stringify({
      type: `player:${type}`,
      data
    }), '*')
  }
}

function handleMessage(event: MessageEvent) {
  // Rutube может слать сообщения с разных поддоменов, проверяем только основной домен
  if (!event.origin.includes('rutube.ru')) return
  
  try {
    const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
    
    if (message.type === 'player:onReady') {
      console.log("[RutubeAdapter] Player Ready");
      isPlayerReady.value = true
      applySyncState(props.state)
    }

    if (isSyncing) return

    if (message.type === 'player:onPlay') {
      emit('command', { type: 'play', currentTime: message.data.time })
    } else if (message.type === 'player:onPause') {
      emit('command', { type: 'pause', currentTime: message.data.time })
    }
  } catch (e) {}
}

function applySyncState(state: typeof props.state) {
  if (!iframeRef.value || !isPlayerReady.value) return
  
  isSyncing = true
  if (syncTimeout) clearTimeout(syncTimeout)

  let targetTime = state.currentTime
  if (state.playing) {
    targetTime += (Date.now() - state.lastUpdate) / 1000
  }

  // Rutube требует сначала setCurrentTime, потом play
  sendCommand('setCurrentTime', { time: targetTime })
  
  if (state.playing) {
    sendCommand('play')
  } else {
    sendCommand('pause')
  }

  syncTimeout = setTimeout(() => { isSyncing = false }, 500)
}

watch(() => props.state, (newState) => {
  applySyncState(newState)
}, { deep: true })

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="w-full h-full bg-black">
    <iframe
      ref="iframeRef"
      :src="embedUrl"
      frameBorder="0"
      allow="clipboard-write; autoplay"
      webkitAllowFullScreen
      mozallowfullscreen
      allowFullScreen
      class="w-full h-full"
    ></iframe>
  </div>
</template>
