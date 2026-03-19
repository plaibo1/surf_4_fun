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

function parseVkUrl(url: string | null | undefined) {
  if (!url) return null
  
  // Если это уже URL для вставки
  if (url.includes('video_ext.php')) {
    return url
  }

  // Регулярка для vkvideo.ru/video-123_456 или vk.com/video-123_456
  // Также ищем параметр hash в URL, если он есть
  const match = url.match(/video(-?\d+)_(\d+)/)
  if (match) {
    const oid = match[1]
    const id = match[2]
    
    // Пытаемся вытащить hash из параметров URL (он часто нужен для доступа)
    const hashMatch = url.match(/[?&]hash=([a-z0-9]+)/i)
    const hash = hashMatch ? `&hash=${hashMatch[1]}` : ''
    
    return `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hash}&js_api=1`
  }
  
  return null
}

const embedUrl = ref('')

watch(() => props.state.url, (newUrl) => {
  const url = parseVkUrl(newUrl)
  if (url) {
    // Важно добавить js_api=1 для работы postMessage
    const separator = url.includes('?') ? '&' : '?'
    embedUrl.value = `${url}${separator}js_api=1`
    isPlayerReady.value = false
  }
}, { immediate: true })

function sendCommand(method: string, args: any[] = []) {
  if (iframeRef.value?.contentWindow && isPlayerReady.value) {
    iframeRef.value.contentWindow.postMessage(JSON.stringify({
      method,
      args
    }), '*')
  }
}

function handleMessage(event: MessageEvent) {
  if (!event.origin.includes('vk.com')) return
  
  try {
    const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
    
    // VK API события
    if (message.event === 'onPlayerReady') {
      isPlayerReady.value = true
      applySyncState(props.state)
    }

    if (isSyncing) return

    if (message.event === 'onVideoPlay') {
      emit('command', { type: 'play', currentTime: message.currentTime || 0 })
    } else if (message.event === 'onVideoPause') {
      emit('command', { type: 'pause', currentTime: message.currentTime || 0 })
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

  sendCommand('seekTo', [targetTime])
  
  if (state.playing) {
    sendCommand('playVideo')
  } else {
    sendCommand('pauseVideo')
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
      allow="clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      class="w-full h-full"
    ></iframe>
  </div>
</template>
