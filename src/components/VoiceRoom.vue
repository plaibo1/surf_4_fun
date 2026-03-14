<script setup lang="ts">
import { watch } from 'vue'
import { useVoiceRoom } from '@/composables/useVoiceRoom'
import Button from '@/components/ui/button/Button.vue'
import Slider from '@/components/ui/slider/Slider.vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'

const props = defineProps<{
  roomId: string
  userName: string
}>()

const emit = defineEmits<{ leave: [] }>()

const {
  participants,
  roomId,
  getVolume,
  setVolume,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  isConnected,
  roomFull,
  error,
  join,
  leave,
  toggleMute,
  toggleVideo,
  toggleScreenShare,
  myStream,
  isLocalSpeaking,
  localAudioLevel,
  volumeKing,

  isNoiseSuppressionEnabled,
  toggleNoiseSuppression,
} = useVoiceRoom()

watch(
  () => [props.roomId, props.userName] as const,
  ([rId, uName]) => {
    if (rId && uName) join(rId, uName)
  },
  { immediate: true }
)

function onLeave() {
  leave()
  emit('leave')
}

// custom directive to bind MediaStream easily
import type { DirectiveBinding } from 'vue'
import { Ear, Maximize, Mic, MicOff } from 'lucide-vue-next'
const vStream = {
  mounted(el: HTMLVideoElement, binding: DirectiveBinding<MediaStream | undefined | null>) {
    if (binding.value) el.srcObject = binding.value
  },
  updated(el: HTMLVideoElement, binding: DirectiveBinding<MediaStream | undefined | null>) {
    const currentStream = el.srcObject as MediaStream | null;
    const newStream = binding.value as MediaStream | null;
    if (!currentStream && !newStream) return;
    if (!currentStream || !newStream) {
      el.srcObject = newStream ?? null;
      return;
    }
    const currentTracks = currentStream.getTracks();
    const newTracks = newStream.getTracks();
    if (currentTracks.length !== newTracks.length || currentTracks.some((t, i) => t !== newTracks[i])) {
       el.srcObject = newStream;
    }
  }
}

function createStream(track: MediaStreamTrack) {
  return new MediaStream([track])
}

function toggleFullscreen(event: Event) {
  const target = event.currentTarget as HTMLElement;
  const container = target.classList.contains('group') ? target : target.closest('.group');
  if (!container) return;
  
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch((err) => {
      console.warn(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
</script>

<template>
  <div class="w-full max-w-2xl space-y-4">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Комната: {{ roomId }}</CardTitle>
        <div class="flex flex-wrap gap-2">
          <Button :variant="isScreenSharing ? 'secondary' : 'outline'" @click="toggleScreenShare">
            {{ isScreenSharing ? 'Остановить показ' : 'Показать экран' }}
          </Button>
          <Button :variant="isVideoEnabled ? 'secondary' : 'outline'" @click="toggleVideo">
            {{ isVideoEnabled ? 'Выключить камеру' : 'Включить камеру' }}
          </Button>
          <Button variant="outline" @click="onLeave">Выйти</Button>
        </div>
      </CardHeader>
      <CardContent>
        <p v-if="error" class="text-destructive text-sm mb-2">{{ error }}</p>
        <p v-if="roomFull" class="text-destructive text-sm mb-2">В комнате уже 5 человек.</p>
        <p v-if="isConnected" class="text-muted-foreground text-sm">
          Участников: {{ participants.length + 1 }}
        </p>

        <!-- Король громкости -->
        <div v-if="volumeKing" class="mt-4 p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 flex items-center justify-between shadow-sm shadow-yellow-500/10">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-600 flex items-center justify-center text-lg font-bold">
                {{ volumeKing.name.charAt(0).toUpperCase() }}
              </div>
              <div class="absolute -top-3 -right-2 text-xl drop-shadow-md transform rotate-12">
                👑
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold text-yellow-600 dark:text-yellow-500">Король громкости</p>
              <p class="text-sm font-medium">{{ volumeKing.name }}</p>
            </div>
          </div>
          <div class="text-xs text-muted-foreground text-right hidden sm:block">
            Рекорд: {{ Math.round(volumeKing.maxVolume + 100) }} / 100
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Моя карточка (панель участника) -->
    <Card class="border-primary/20 bg-muted/20">
      <CardContent class="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4 w-full">
          <div 
            class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0 transition-transform duration-75"
            :class="isLocalSpeaking ? 'bg-primary/10 text-primary ring-2 ring-green-500 ring-offset-2 ring-offset-background' : 'bg-primary/10 text-primary'"
            :style="{ transform: `scale(${1 + localAudioLevel * 0.2})` }"
          >
            {{ userName.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-lg leading-none flex items-center gap-2">
              {{ userName }}
              <span class="text-xs font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full border">Вы</span>
            </h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="relative flex h-2.5 w-2.5">
                <span :class="isMuted ? 'bg-destructive/50' : 'bg-green-500'" class="absolute inline-flex h-full w-full rounded-full opacity-75"></span>
                <span :class="isMuted ? 'bg-destructive' : 'bg-green-500'" class="relative inline-flex rounded-full h-2.5 w-2.5"></span>
              </span>
              <span class="text-sm text-muted-foreground">
                {{ isMuted ? 'Микрофон выключен' : 'Вас слышно' }}
              </span>
            </div>
          </div>


          <Button :variant="isNoiseSuppressionEnabled ? 'success' : 'outline'" @click="toggleNoiseSuppression">
            <Ear />
          </Button>

          <Button :variant="isMuted ? 'destructive' : 'default'" @click="toggleMute" size="icon" class="shrink-0">
            <MicOff v-if="isMuted" />
            <Mic v-else />
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card v-if="myStream?.getVideoTracks()?.length || participants.some(p => p.stream && p.stream.getVideoTracks().length)">
      <CardHeader>
        <CardTitle>Видеочат</CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Я -->
        <template v-if="myStream">
          <div v-for="track in myStream.getVideoTracks()" :key="track.id" class="relative group rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center" @dblclick="toggleFullscreen">
            <video v-stream="createStream(track)" autoplay playsinline muted class="w-full h-full object-cover"></video>
            <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{{ userName }} (Вы)</div>
            <button @click.stop="toggleFullscreen" class="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity" title="На весь экран">
              <Maximize class="w-4 h-4" />
            </button>
          </div>
        </template>
        <!-- Другие -->
        <template v-for="p in participants" :key="p.id">
          <template v-if="p.stream">
            <div v-for="track in p.stream.getVideoTracks()" :key="track.id" class="relative group rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center" @dblclick="toggleFullscreen">
              <video v-stream="createStream(track)" autoplay playsinline class="w-full h-full object-cover"></video>
              <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{{ p.userName }}</div>
              <button @click.stop="toggleFullscreen" class="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity" title="На весь экран">
                <Maximize class="w-4 h-4" />
              </button>
            </div>
          </template>
        </template>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Участники</CardTitle>
        <p class="text-sm text-muted-foreground">
          Регулируйте громкость каждого участника отдельно (0–100%).
        </p>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          v-for="p in participants"
          :key="p.id"
          class="flex items-center gap-4 rounded-lg border p-4"
        >
          <div 
            class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 transition-transform duration-75"
            :class="p.isSpeaking ? 'bg-secondary text-secondary-foreground ring-2 ring-green-500 ring-offset-2 ring-offset-background' : 'bg-secondary text-secondary-foreground'"
            :style="{ transform: `scale(${1 + p.audioLevel * 0.2})` }"
          >
            {{ p.userName.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-[120px]">
            <span class="font-medium">{{ p.userName }}</span>
            <span class="ml-2 text-xs text-muted-foreground">({{ p.id.slice(0, 8) }})</span>
          </div>
          <div class="flex-1 flex items-center gap-2">
            <span class="text-xs text-muted-foreground w-8">{{ getVolume(p.id) }}%</span>
            <Slider
              :model-value="[getVolume(p.id)]"
              :min="0"
              :max="100"
              :step="1"
              class="flex-1"
              @update:model-value="(v) => setVolume(p.id, v?.[0] ?? 100)"
            />
          </div>
        </div>
        <p v-if="participants.length === 0" class="text-muted-foreground text-sm">
          Пока никого нет. Дождитесь подключения других или откройте комнату в другой вкладке.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
