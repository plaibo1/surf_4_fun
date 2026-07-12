<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue'
import SharedPlayer from '@/components/shared-player/SharedPlayer.vue'
import { LayoutGrid, LayoutList, Scan, HeadphoneOff, MicOff, Mic, Monitor, Video as VideoIcon, Activity } from 'lucide-vue-next'
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
  <div class="flex flex-col w-full h-full space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between px-1 shrink-0">
      <h3 class="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <VideoIcon class="w-4 h-4" />
        Трансляция
      </h3>
      <div class="flex items-center bg-white/5 p-1 rounded-[14px] border border-white/10">
        <Button aria-label="Вид сеткой" variant="ghost" size="icon" class="h-7 w-7 rounded-[10px] transition-all"
          :class="viewMode === 'grid' ? 'bg-black/60 shadow-sm text-primary' : 'text-muted-foreground hover:text-white'" 
          @click="emit('update:viewMode', 'grid')">
          <LayoutGrid class="h-3.5 w-3.5" />
        </Button>
        <Button aria-label="Вид списком" variant="ghost" size="icon" class="h-7 w-7 rounded-[10px] transition-all"
          :class="viewMode === 'row' ? 'bg-black/60 shadow-sm text-primary' : 'text-muted-foreground hover:text-white'" 
          @click="emit('update:viewMode', 'row')">
          <LayoutList class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <!-- Main Container -->
    <div class="flex-1 bg-black/40 border border-white/10 backdrop-blur-md rounded-[24px] p-2 sm:p-4 shadow-2xl relative flex flex-col min-h-0">
      
      <!-- Video Grid -->
      <div class="flex-1 overflow-y-auto scroll-smooth transition-all duration-500 h-full"
        :class="viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 content-start' : 'flex flex-col gap-3 sm:gap-4'">
        
        <!-- SharedPlayer -->
        <div v-if="isSharedPlayerVisible" :class="viewMode === 'grid' ? 'col-span-1 lg:col-span-2' : ''"
          class="aspect-video w-full rounded-[16px] overflow-hidden border border-white/10">
          <SharedPlayer :state="sharedPlayerState" @command="(cmd) => emit('sendPlayerCommand', cmd)" />
        </div>

        <!-- Local Video -->
        <template v-if="myStream">
          <div v-for="track in myStream.getVideoTracks()" :key="track.id"
            class="relative group rounded-[16px] overflow-hidden bg-black aspect-video transition-all duration-500 border border-transparent"
            :class="isLocalSpeaking ? 'border-primary/50 shadow-[0_0_25px_rgba(var(--primary),0.3)] ring-1 ring-primary/50' : 'border-white/10 shadow-lg'"
            @dblclick="toggleFullscreen">
            
            <video v-stream="getOrCreateStream(track)" autoplay playsinline muted
              class="w-full h-full transition-all duration-700"
              :class="{
                'object-cover scale-y-[1.01]': track.id === cameraTrack?.id,
                '-scale-x-[1.01] is-mirrored': track.id === cameraTrack?.id && currentFacingMode === 'user',
                'scale-x-[1.01]': track.id === cameraTrack?.id && currentFacingMode === 'environment',
                'object-contain bg-black scale-100': track.id !== cameraTrack?.id
              }"></video>
              
            <!-- Gradients -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-60 group-hover:opacity-100 transition-opacity"></div>
            
            <!-- Top Badges -->
            <div class="absolute top-3 left-3 flex items-center gap-2">
              <div class="bg-primary/20 backdrop-blur-md border border-primary/30 px-2 py-0.5 rounded-[8px] flex items-center gap-1.5 shadow-sm">
                <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]"></div>
                <span class="text-[9px] font-black text-primary uppercase tracking-widest">You</span>
              </div>
            </div>
            
            <!-- Bottom Controls -->
            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <!-- User Info -->
              <div class="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-[12px] shadow-sm">
                <span class="text-xs font-bold text-white truncate max-w-[100px]">{{ userName }}</span>
                <div class="flex items-center gap-1.5 border-l border-white/20 pl-2 ml-1">
                  <HeadphoneOff v-if="isTotalMuted" class="h-3 w-3 text-destructive" />
                  <MicOff v-else-if="isMuted" class="h-3 w-3 text-destructive" />
                  <Mic v-else class="h-3 w-3 text-primary" />
                </div>
              </div>
              
              <!-- Action -->
              <button aria-label="На весь экран" @click.stop="toggleFullscreen"
                class="p-2 bg-black/60 hover:bg-black/80 border border-white/10 backdrop-blur-md rounded-[10px] text-white opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-95 shadow-sm cursor-pointer">
                <Scan class="h-4 w-4 text-muted-foreground hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </template>

        <!-- Remote Videos -->
        <template v-for="p in participants" :key="p.id">
          <template v-if="p.stream">
            <div v-for="track in p.stream.getVideoTracks()" :key="track.id"
              class="relative group rounded-[16px] overflow-hidden bg-black aspect-video transition-all duration-500 border border-transparent"
              :class="p.isSpeaking ? 'border-primary/50 shadow-[0_0_25px_rgba(var(--primary),0.3)] ring-1 ring-primary/50' : 'border-white/10 shadow-lg'"
              @dblclick="toggleFullscreen">
              
              <video v-stream="getOrCreateStream(track)" autoplay playsinline
                class="w-full h-full transition-all duration-700"
                :class="track.label.toLowerCase().includes('screen') || track.label.toLowerCase().includes('window') ? 'object-contain bg-black scale-100' : 'object-cover scale-[1.01]'"></video>
                
              <!-- Gradients -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-40 group-hover:opacity-90 transition-opacity"></div>
              
              <!-- Top Badges -->
              <div class="absolute top-3 left-3">
                <div class="bg-white/10 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-[8px] flex items-center gap-1.5 shadow-sm">
                  <Activity v-if="p.isSpeaking" class="w-3 h-3 text-primary animate-pulse" />
                  <div v-else class="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                  <span class="text-[9px] font-black text-white uppercase tracking-widest">Live</span>
                </div>
              </div>
              
              <!-- Bottom Controls -->
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <!-- User Info -->
                <div class="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-[12px] shadow-sm">
                  <span class="text-xs font-bold text-white truncate max-w-[120px]">{{ p.userName }}</span>
                  <div class="flex items-center gap-1.5 border-l border-white/20 pl-2 ml-1">
                    <HeadphoneOff v-if="p.muteStatus?.isTotalMuted" class="h-3 w-3 text-destructive" />
                    <MicOff v-else-if="p.muteStatus?.isMuted" class="h-3 w-3 text-destructive" />
                    <Monitor v-if="track.label.toLowerCase().includes('screen') || track.label.toLowerCase().includes('window')" class="h-3 w-3 text-primary" />
                    <VideoIcon v-else class="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                
                <!-- Action -->
                <button aria-label="На весь экран" @click.stop="toggleFullscreen"
                  class="p-2 bg-black/60 hover:bg-black/80 border border-white/10 backdrop-blur-md rounded-[10px] text-white opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-95 shadow-sm cursor-pointer">
                  <Scan class="h-4 w-4 text-muted-foreground hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </template>
        </template>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
.group:fullscreen {
  border: none !important;
  border-radius: 0 !important;
  background-color: #09090b !important;
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
