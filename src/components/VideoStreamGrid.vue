<script setup lang="ts">
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import Button from '@/components/ui/button/Button.vue'
import SharedPlayer from '@/components/shared-player/SharedPlayer.vue'
import { LayoutGrid, LayoutList, Scan, HeadphoneOff, MicOff, Mic, Monitor, Video } from 'lucide-vue-next'
import type { DirectiveBinding } from 'vue'

const props = defineProps<{
  myStream: MediaStream | null
  participants: any[]
  isSharedPlayerVisible: boolean
  sharedPlayerState: any
  isLocalSpeaking: boolean
  cameraTrack: MediaStreamTrack | null
  currentFacingMode: 'user' | 'environment'
  userName: string
  isTotalMuted: boolean
  isMuted: boolean
  viewMode: 'grid' | 'row'
}>()

const emit = defineEmits<{
  (e: 'update:viewMode', mode: 'grid' | 'row'): void
  (e: 'sendPlayerCommand', cmd: any): void
}>()

const vStream = {
  mounted(el: HTMLVideoElement, binding: DirectiveBinding<MediaStream | undefined | null>) {
    if (binding.value) el.srcObject = binding.value
  },
  updated(el: HTMLVideoElement, binding: DirectiveBinding<MediaStream | undefined | null>) {
    const currentStream = el.srcObject as MediaStream | null;
    const newStream = binding.value as MediaStream | null;
    if (currentStream === newStream) return;
    el.srcObject = newStream ?? null;
  },
  unmounted(el: HTMLVideoElement) {
    el.srcObject = null;
  }
}

const streamCache = new WeakMap<MediaStreamTrack, MediaStream>();

const getOrCreateStream = (track: MediaStreamTrack) => {
  let s = streamCache.get(track);
  if (!s) {
    s = new MediaStream([track]);
    streamCache.set(track, s);
  }
  return s;
}

function toggleFullscreen(event: Event) {
  const target = event.target as HTMLElement;
  const container = target.closest('.group') as HTMLElement;
  if (!container) return;

  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}
</script>

<template>
  <Card class="border-none bg-black/5 dark:bg-white/5 shadow-2xl overflow-hidden h-fit rounded-3xl sm:rounded-3xl">
    <CardHeader class="flex flex-row items-center justify-between border-b border-primary/5 pb-4 px-4 sm:px-6">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></div>
        <CardTitle class="text-lg sm:text-xl font-black uppercase tracking-tighter">Live</CardTitle>
      </div>

      <div class="flex items-center bg-muted/50 p-1 rounded-3xl sm:rounded-3xl border border-border/50">
        <Button aria-label="Вид сеткой" variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8 rounded-3xl transition-all"
          :class="{ 'bg-background shadow-sm text-primary': viewMode === 'grid' }" @click="emit('update:viewMode', 'grid')">
          <LayoutGrid class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button aria-label="Вид списком" variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8 rounded-3xl transition-all"
          :class="{ 'bg-background shadow-sm text-primary': viewMode === 'row' }" @click="emit('update:viewMode', 'row')">
          <LayoutList class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </CardHeader>

    <CardContent class="p-2 sm:p-4 transition-all duration-500"
      :class="viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4' : 'flex flex-col gap-2 sm:gap-4'">

      <!-- SharedPlayer -->
      <div v-if="isSharedPlayerVisible" :class="viewMode === 'grid' ? 'col-span-1 md:col-span-2' : ''"
        class="aspect-video w-full">
        <SharedPlayer :state="sharedPlayerState" @command="(cmd) => emit('sendPlayerCommand', cmd)" />
      </div>

      <!-- Видеопотоки -->
      <template v-if="myStream">
        <div v-for="track in myStream.getVideoTracks()" :key="track.id"
          class="relative group rounded-3xl sm:rounded-3xl overflow-hidden bg-zinc-900 aspect-video border-2 transition-all duration-500"
          :class="isLocalSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-primary/10'"
          @dblclick="toggleFullscreen">
          <video v-stream="getOrCreateStream(track)" autoplay playsinline muted
            class="w-full h-full transition-all duration-700"
            :class="{
              'object-cover scale-y-[1.01]': track.id === cameraTrack?.id,
              '-scale-x-[1.01] is-mirrored': track.id === cameraTrack?.id && currentFacingMode === 'user',
              'scale-x-[1.01]': track.id === cameraTrack?.id && currentFacingMode === 'environment',
              'object-contain bg-black scale-100': track.id !== cameraTrack?.id
            }"></video>
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-60 group-hover:opacity-100 transition-opacity">
          </div>
          <div class="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-2">
            <div
              class="bg-primary/20 backdrop-blur-md border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-3xl flex items-center gap-1 sm:gap-1.5">
              <div class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary"></div>
              <span class="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-tighter">You</span>
            </div>
          </div>
          <div
            class="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between">
            <div
              class="flex items-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-3xl sm:rounded-3xl">
              <span class="text-[10px] sm:text-xs font-bold text-white truncate max-w-[80px] sm:max-w-[100px]">{{
                userName }}</span>
              <div class="flex items-center gap-1 border-l border-white/20 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1">
                <HeadphoneOff v-if="isTotalMuted" class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400" />
                <MicOff v-else-if="isMuted" class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400" />
                <Mic v-else class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-400" />
              </div>
            </div>
            <button aria-label="На весь экран" @click.stop="toggleFullscreen"
              class="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-3xl sm:rounded-3xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
              <Scan class="h-3 w-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </template>

      <template v-for="p in participants" :key="p.id">
        <template v-if="p.stream">
          <div v-for="track in p.stream.getVideoTracks()" :key="track.id"
            class="relative group rounded-3xl sm:rounded-3xl overflow-hidden bg-zinc-900 aspect-video border-2 transition-all duration-500"
            :class="p.isSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-white/5'"
            @dblclick="toggleFullscreen">
            <video v-stream="getOrCreateStream(track)" autoplay playsinline
              class="w-full h-full transition-all duration-700"
              :class="track.label.toLowerCase().includes('screen') || track.label.toLowerCase().includes('window') ? 'object-contain bg-black scale-100' : 'object-cover scale-[1.01]'"></video>
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-40 group-hover:opacity-90 transition-opacity">
            </div>
            <div class="absolute top-2 sm:top-3 left-2 sm:left-3">
              <div
                class="bg-red-500/20 backdrop-blur-md border border-red-500/30 px-1.5 sm:px-2 py-0.5 rounded-3xl flex items-center gap-1 sm:gap-1.5">
                <div class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                </div><span
                  class="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-tighter">Live</span>
              </div>
            </div>
            <div
              class="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between">
              <div
                class="flex items-center gap-1.5 sm:gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-3xl sm:rounded-3xl shadow-2xl">
                <span class="text-[10px] sm:text-xs font-bold text-white truncate max-w-[100px] sm:max-w-[120px]">{{
                  p.userName }}</span>
                <div class="flex items-center border-l border-white/20 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1">
                  <HeadphoneOff v-if="p.muteStatus?.isTotalMuted"
                    class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400 mr-1" />
                  <MicOff v-else-if="p.muteStatus?.isMuted" class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400 mr-1" />

                  <Monitor
                    v-if="track.label.toLowerCase().includes('screen') || track.label.toLowerCase().includes('window')"
                    class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                  <Video v-else class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/60" />
                </div>
              </div>
              <button aria-label="На весь экран" @click.stop="toggleFullscreen"
                class="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-3xl sm:rounded-3xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Scan class="h-3 w-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </template>
      </template>
    </CardContent>
  </Card>
</template>

<style scoped>
.group:fullscreen {
  border: none !important;
  border-radius: 0 !important;
  background-color: #09090b !important; /* zinc-950 */
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 1rem !important;
}

@media (min-width: 640px) {
  .group:fullscreen {
    padding: 3rem !important;
  }
}

.group:fullscreen video {
  /* Make video shrink to its intrinsic size instead of filling the view */
  width: auto !important;
  height: auto !important;
  max-width: 100% !important;
  max-height: 100% !important;
  margin: auto !important;
  object-fit: contain !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
  transform: scale(1) !important;
}

@media (min-width: 640px) {
  .group:fullscreen video {
    border-radius: 24px !important;
  }
}

.group:fullscreen video.is-mirrored {
  transform: scaleX(-1) !important;
}
</style>
