<script setup lang="ts">
import { ref, computed } from 'vue'
import Input from '@/components/ui/input/Input.vue'
import Button from '@/components/ui/button/Button.vue'
import { Send, PlayCircle, X } from 'lucide-vue-next'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import YoutubeAdapter from './YoutubeAdapter.vue'
import RutubeAdapter from './RutubeAdapter.vue'
import VkAdapter from './VkAdapter.vue'
import { useSoundEffects } from '@/composables/useSoundEffects'

const props = defineProps<{
  state: {
    url: string | null;
    platform: string | null;
    playing: boolean;
    currentTime: number;
    lastUpdate: number;
  },
  onCommand: (command: {
    type: "load" | "play" | "pause" | "seek";
    url?: string;
    platform?: string;
    currentTime?: number;
  }) => void
}>()

const videoUrlInput = ref('')
const { initAudioContext } = useSoundEffects()

const detectPlatform = (url: string) => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('rutube.ru')) return 'rutube'
  if (url.includes('vk.com') || url.includes('vk.video') || url.includes('vkvideo.ru')) return 'vk'
  return null
}

const currentAdapter = computed(() => {
  if (props.state.platform === 'youtube') return YoutubeAdapter
  if (props.state.platform === 'rutube') return RutubeAdapter
  if (props.state.platform === 'vk') return VkAdapter
  return null
})

function handleLoadVideo() {
  const url = videoUrlInput.value.trim()
  if (!url) return
  
  const platform = detectPlatform(url)
  if (!platform) {
    alert('Платформа не поддерживается. Используйте YouTube, Rutube или VK.')
    return
  }

  initAudioContext()
  props.onCommand({ type: 'load', url, platform })
  videoUrlInput.value = ''
}

function handleAdapterCommand(cmd: { type: string, currentTime: number }) {
  props.onCommand({
    type: cmd.type as any,
    currentTime: cmd.currentTime
  })
}
</script>

<template>
  <Card class="border-none shadow-2xl bg-black/95 overflow-hidden flex flex-col w-full h-full rounded-none sm:rounded-2xl">
    <CardHeader class="border-b border-white/10 bg-zinc-900/50 pb-3 px-4 sm:px-6">
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-primary/20 text-primary">
            <PlayCircle class="h-4 w-4" />
          </div>
          <CardTitle class="text-base sm:text-lg font-black tracking-tight text-white">SyncWatch</CardTitle>
        </div>
        
        <div v-if="state.url" class="flex items-center gap-2">
          <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {{ state.platform }}
          </div>
          <div class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {{ state.playing ? 'Воспроизведение' : 'Пауза' }}
          </div>
          <Button variant="ghost" size="icon" class="h-6 w-6 text-zinc-500 hover:text-white hover:bg-white/10" @click="onCommand({ type: 'load', url: undefined, platform: undefined })">
            <X class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex-1 flex flex-col p-0 overflow-hidden relative">
      <!-- Empty State -->
      <div v-if="!state.url" class="absolute inset-0 flex flex-col items-center justify-center text-center space-y-6 p-6">
        <div class="relative">
          <div class="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
          <PlayCircle class="h-16 w-16 text-zinc-800 relative z-10" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-black text-white uppercase tracking-tighter">Смотрите вместе</h3>
          <p class="text-zinc-500 text-sm max-w-xs">YouTube, Rutube, VK и другие платформы</p>
        </div>
        <div class="w-full max-w-md flex items-center gap-2">
          <Input 
            v-model="videoUrlInput" 
            placeholder="Вставьте ссылку на видео..." 
            class="bg-zinc-900 border-zinc-800 text-white"
            @keyup.enter="handleLoadVideo"
          />
          <Button @click="handleLoadVideo" variant="default" size="icon" class="shrink-0">
            <Send class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Player Adapter -->
      <div class="w-full h-full" v-if="state.url">
        <component 
          :is="currentAdapter" 
          v-if="currentAdapter"
          :state="state" 
          @command="handleAdapterCommand"
        />
        <div v-else class="flex items-center justify-center h-full text-white">
          Платформа {{ state.platform }} не поддерживается
        </div>
      </div>

      <!-- Controls for change video -->
      <div v-if="state.url" class="p-2 sm:p-3 bg-zinc-900/80 border-t border-white/5 backdrop-blur-xl flex items-center gap-2">
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
