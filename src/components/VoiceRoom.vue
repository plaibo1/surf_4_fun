<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useVoiceRoom } from '@/composables/useVoiceRoom'
import Button from '@/components/ui/button/Button.vue'
import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import { Ear, Mic, MicOff, Copy, Check, Headphones, LogOut, Video, Monitor, Share2, Star, PlayCircle, HeadphoneOff, RefreshCw } from 'lucide-vue-next'
import { useFavorites } from '@/composables/useFavorites'
import ChatPanel from '@/components/ChatPanel.vue'
import ParticipantList from '@/components/ParticipantList.vue'
import VideoStreamGrid from '@/components/VideoStreamGrid.vue'
import GamesPanel from '@/components/GamesPanel.vue'
import { Gamepad2 } from 'lucide-vue-next'

const props = defineProps<{
  roomId: string
  userName: string
}>()

const emit = defineEmits<{ leave: [] }>()

const { toggleFavorite, isFavorite } = useFavorites()

const {
  myId,
  participants,
  roomId,
  setVolume,
  isMuted,
  isTotalMuted,
  isVideoEnabled,
  currentFacingMode,
  isScreenSharing,
  roomFull,
  error,
  sharedPlayerState,
  join,
  leave,
  toggleMute,
  toggleTotalMute,
  toggleVideo,
  switchCamera,
  toggleScreenShare,
  sendPlayerCommand,
  cameraTrack,
  myStream,
  isLocalSpeaking,
  localAudioLevel,
  volumeKing,
  isNoiseSuppressionEnabled,
  toggleNoiseSuppression,
  messages,
  sendMessage,
  ticTacToeState,
  sendTicTacToeAction,
  coinFlipState,
  sendCoinFlipAction,
} = useVoiceRoom()

const isSharedPlayerVisible = ref(false)
const isGamesVisible = ref(false)

watch(() => ticTacToeState.value.isVisible, (visible) => {
  if (visible) isGamesVisible.value = true
})

watch(() => coinFlipState.value.isVisible, (visible) => {
  if (visible) isGamesVisible.value = true
})

const hasStreams = computed(() =>
  (myStream.value?.getVideoTracks()?.length ?? 0) > 0 ||
  participants.value.some(p => (p.stream?.getVideoTracks()?.length ?? 0) > 0) ||
  isSharedPlayerVisible.value ||
  isGamesVisible.value
)

watch(() => sharedPlayerState.value.url, (newUrl) => {
  if (newUrl) isSharedPlayerVisible.value = true
})

const viewMode = ref<'grid' | 'row'>('grid')

const copiedLink = ref<string | null>(null)
const currentUrl = window.location.href

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedLink.value = text
    setTimeout(() => {
      if (copiedLink.value === text) {
        copiedLink.value = null
      }
    }, 2000)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

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

function handleKeyDown(event: KeyboardEvent) {
  const activeElement = document.activeElement
  const isInput = activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    (activeElement as HTMLElement)?.isContentEditable

  if (isInput) return

  if (event.code === 'KeyM' || event.key.toLowerCase() === 'm') {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      toggleTotalMute()
    } else {
      toggleMute()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="w-full mx-auto flex flex-col gap-4 sm:gap-6 p-0 sm:p-4 transition-all duration-700"
    :class="hasStreams ? 'max-w-[1600px] xl:flex-row' : 'max-w-2xl items-center'">
    <!-- Левая колонка: Управление и Чат -->
    <div class="w-full space-y-4 sm:space-y-6 shrink-0 transition-all duration-700"
      :class="hasStreams ? 'xl:w-[550px] order-2 xl:order-1' : ''">
      <!-- Главная панель комнаты (Command Center) -->
      <div class="flex flex-col gap-4">
        <!-- Room Identity & Top Actions -->
        <div class="bg-card/40 backdrop-blur-3xl p-5 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group flex flex-col xl:flex-row gap-5 xl:gap-6 justify-between items-start xl:items-center">
          <!-- Ambient glow -->
          <div class="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-colors duration-1000"></div>
          
          <!-- Левая часть: Название, статус и мобильная кнопка выхода -->
          <div class="flex flex-col gap-3 relative z-10 w-full min-w-0 xl:w-auto xl:flex-1">
            <div class="flex items-center justify-between gap-4 w-full">
              <h2 class="text-3xl sm:text-4xl font-black tracking-tighter text-foreground uppercase truncate">
                {{ roomId }}
              </h2>
              <!-- Кнопка выхода (Мобильная) -->
              <Button variant="destructive" size="icon"
                class="xl:hidden h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-lg shadow-destructive/20 hover:-translate-y-1 active:scale-90 shrink-0 transition-all" 
                @click="onLeave" title="Выйти из комнаты" aria-label="Выйти из комнаты">
                <LogOut class="h-4 w-4 sm:h-5 sm:w-5 sm:ml-1" />
              </Button>
            </div>
            
            <div class="flex items-center gap-3 flex-wrap">
              <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 shrink-0">
                <span class="relative flex h-1.5 w-1.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <span class="text-[10px] font-bold uppercase tracking-widest text-green-500">Live</span>
              </div>
              
              <!-- Small Participants Avatars -->
              <div class="flex -space-x-2 shrink-0">
                <div v-for="p in participants.slice(0, 3)" :key="p.id"
                  class="w-6 h-6 rounded-full border border-background bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-[9px] font-black shadow-sm cursor-default">
                  {{ p.userName.charAt(0).toUpperCase() }}
                </div>
                <div v-if="participants.length > 3"
                  class="w-6 h-6 rounded-full border border-background bg-muted flex items-center justify-center text-[9px] font-black shadow-sm">
                  +{{ participants.length - 3 }}
                </div>
              </div>
            </div>
          </div>

          <!-- Правая часть: Управление (Пилюля) и десктопная кнопка выхода -->
          <div class="flex items-center justify-between xl:justify-end gap-4 relative z-10 w-full xl:w-auto shrink-0">
            <!-- Action Pill (Scrollable on small screens if needed) -->
            <div class="flex-1 xl:flex-none overflow-x-auto hide-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
              <div class="flex items-center gap-1 bg-black/20 p-1 rounded-full border border-white/5 backdrop-blur-md w-max">
                <Button aria-label="Скопировать ID" variant="ghost" size="icon" class="h-8 w-8 rounded-full hover:bg-white/10 transition-all active:scale-95 text-muted-foreground hover:text-foreground shrink-0"
                  @click="copyToClipboard(roomId)">
                  <Check v-if="copiedLink === roomId" class="h-4 w-4 text-green-400" />
                  <Copy v-else class="h-4 w-4" />
                </Button>
                
                <Button aria-label="В избранное" variant="ghost" size="icon" class="h-8 w-8 rounded-full hover:bg-white/10 transition-all active:scale-95 group/star text-muted-foreground hover:text-foreground shrink-0"
                  @click="toggleFavorite(roomId)">
                  <Star class="h-4 w-4 transition-all"
                    :class="isFavorite(roomId) ? 'text-yellow-400 fill-yellow-400' : 'group-hover/star:text-yellow-400'" />
                </Button>
                
                <Button aria-label="Пригласить друзей" variant="ghost" class="h-8 px-3 rounded-full hover:bg-white/10 transition-all active:scale-95 text-muted-foreground hover:text-foreground flex items-center gap-2 shrink-0"
                  @click="copyToClipboard(currentUrl)"
                  :class="{'text-green-400': copiedLink === currentUrl}">
                  <Share2 v-if="copiedLink !== currentUrl" class="h-4 w-4 transition-all group-hover:scale-110" />
                  <Check v-else class="h-4 w-4" />
                  <span class="text-[10px] sm:text-xs font-bold uppercase tracking-widest">{{ copiedLink === currentUrl ? 'Скопировано' : 'Пригласить' }}</span>
                </Button>
              </div>
            </div>

            <!-- Кнопка выхода (Десктоп) -->
            <Button variant="destructive" size="icon"
              class="hidden xl:flex h-12 w-12 rounded-full shadow-lg shadow-destructive/20 hover:-translate-y-1 active:scale-90 shrink-0 transition-all" 
              @click="onLeave" title="Выйти из комнаты" aria-label="Выйти из комнаты">
              <LogOut class="h-5 w-5 ml-1" />
            </Button>
          </div>
        </div>

        <!-- Action Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button aria-label="Демонстрация экрана" 
            class="flex flex-col items-center justify-center gap-3 p-4 rounded-[20px] border transition-all duration-300 active:scale-95 group cursor-pointer"
            :class="isScreenSharing ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-primary-foreground' : 'bg-card/40 border-white/5 hover:bg-white/5 text-foreground'"
            @click="toggleScreenShare">
            <Monitor class="h-6 w-6 transition-transform group-hover:scale-110" />
            <span class="text-[10px] font-bold uppercase tracking-widest">{{ isScreenSharing ? 'Экран в эфире' : 'Экран' }}</span>
          </button>

          <button aria-label="Включить камеру" 
            class="flex flex-col items-center justify-center gap-3 p-4 rounded-[20px] border transition-all duration-300 active:scale-95 group cursor-pointer"
            :class="isVideoEnabled ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-primary-foreground' : 'bg-card/40 border-white/5 hover:bg-white/5 text-foreground'"
            @click="toggleVideo">
            <Video class="h-6 w-6 transition-transform group-hover:scale-110" />
            <span class="text-[10px] font-bold uppercase tracking-widest">{{ isVideoEnabled ? 'Камера вкл' : 'Камера' }}</span>
          </button>

          <button aria-label="Совместный просмотр" 
            class="flex flex-col items-center justify-center gap-3 p-4 rounded-[20px] border transition-all duration-300 active:scale-95 group relative overflow-hidden cursor-pointer"
            :class="isSharedPlayerVisible ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-primary-foreground' : 'bg-card/40 border-white/5 hover:bg-white/5 text-foreground'"
            @click="isSharedPlayerVisible = !isSharedPlayerVisible">
            <div class="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-400 text-yellow-950 text-[8px] font-black uppercase rounded-full shadow-sm">Beta</div>
            <div class="relative">
              <PlayCircle class="h-6 w-6 transition-transform group-hover:scale-110" />
              <div v-if="sharedPlayerState.url && !isSharedPlayerVisible" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
            </div>
            <span class="text-[10px] font-bold uppercase tracking-widest">SyncWatch</span>
          </button>

          <button aria-label="Крестики-Нолики" 
            class="flex flex-col items-center justify-center gap-3 p-4 rounded-[20px] border transition-all duration-300 active:scale-95 group relative overflow-hidden cursor-pointer"
            :class="isGamesVisible ? 'bg-primary border-primary shadow-lg shadow-primary/20 text-primary-foreground' : 'bg-card/40 border-white/5 hover:bg-white/5 text-foreground'"
            @click="isGamesVisible = !isGamesVisible">
            <div class="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-400 text-yellow-950 text-[8px] font-black uppercase rounded-full shadow-sm">Beta</div>
            <div class="relative">
              <Gamepad2 class="h-6 w-6 transition-transform group-hover:scale-110" />
            </div>
            <span class="text-[10px] font-bold uppercase tracking-widest">Игры</span>
          </button>
        </div>

        <!-- Camera Switcher (Mobile Only) -->
        <Button v-if="isVideoEnabled" aria-label="Переключить камеру" variant="outline"
          class="h-12 w-full rounded-full gap-2 border-white/5 hover:bg-white/5 transition-all bg-card/40 sm:hidden mt-2"
          @click="switchCamera">
          <RefreshCw class="h-4 w-4" />
          <span class="text-xs font-bold uppercase tracking-widest">Swap Camera ({{ currentFacingMode === 'user' ? 'Front' : 'Back' }})</span>
        </Button>

        <!-- Dynamic Status Messages -->
        <div v-if="error || roomFull || volumeKing" class="flex flex-col gap-2 mt-2">
          <div v-if="error" class="flex items-center gap-3 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
            <div class="w-1.5 h-1.5 rounded-full bg-destructive shrink-0"></div>
            {{ error }}
          </div>
          <div v-if="roomFull" class="flex items-center gap-3 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
            <div class="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></div>
            Room is at maximum capacity (5/5).
          </div>
          
          <div v-if="volumeKing" class="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            <div class="flex items-center gap-4 relative z-10">
              <div class="relative">
                <div class="w-10 h-10 rounded-full bg-yellow-400 text-yellow-950 flex items-center justify-center text-lg font-black shadow-lg">
                  {{ volumeKing.name.charAt(0).toUpperCase() }}
                </div>
                <div class="absolute -top-3 -right-2 text-xl drop-shadow-md">👑</div>
              </div>
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase tracking-widest text-yellow-500/80">Volume King</span>
                <span class="text-sm font-bold text-yellow-400 truncate max-w-[120px] sm:max-w-none">{{ volumeKing.name }}</span>
              </div>
            </div>
            <div class="text-[10px] font-mono font-bold bg-yellow-500/20 px-2 py-1 rounded-full text-yellow-400 border border-yellow-500/20 relative z-10">
              PWR: {{ Math.round(volumeKing.maxVolume + 100) }}%
            </div>
          </div>
        </div>
      </div>

      <!-- Моя карточка -->
      <Card class="border-primary/30 bg-primary/5 shadow-lg shadow-primary/5 relative overflow-hidden rounded-3xl">
        <CardContent class="p-3 sm:p-4 flex flex-col items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div class="flex items-center gap-4 sm:gap-6 w-full">
            <div class="relative group">
              <div
                class="w-12 h-12 sm:w-16 sm:h-16 rounded-3xl sm:rounded-3xl flex items-center justify-center text-xl sm:text-2xl font-black shrink-0 transition-all duration-75 shadow-2xl overflow-hidden"
                :class="isLocalSpeaking ? 'bg-primary text-primary-foreground ring-4 ring-green-500/30' : 'bg-primary/20 text-primary'"
                :style="{ transform: `scale(${1 + localAudioLevel * 0.15})` }">
                {{ userName.charAt(0).toUpperCase() }}
                <!-- Анимация волн когда говоришь -->
                <span v-if="isLocalSpeaking"
                  class="absolute -inset-1 rounded-3xl sm:rounded-3xl border-2 border-green-500 animate-ping opacity-20"></span>
              </div>
              <div
                class="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border-2 sm:border-4 border-background shadow-lg transition-colors duration-300"
                :class="isMuted ? 'bg-destructive' : 'bg-green-500'">
                <HeadphoneOff v-if="isTotalMuted" aria-hidden="true" class="h-3 sm:h-3.5 w-3 sm:w-3.5 text-white" />
                <MicOff v-else-if="isMuted" aria-hidden="true" class="h-3 sm:h-3.5 w-3 sm:w-3.5 text-white" />
                <Mic v-else aria-hidden="true" class="h-3 sm:h-3.5 w-3 sm:w-3.5 text-white" />
              </div>
            </div>

            <div class="flex-1 overflow-hidden">
              <div class="flex items-center gap-2">
                <h3 class="font-black text-lg sm:text-xl truncate tracking-tight text-foreground">{{ userName }}</h3>
                <span
                  class="text-[9px] sm:text-[10px] font-bold bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Вы</span>
              </div>
              <p class="text-[11px] sm:text-sm font-medium flex items-center gap-1.5 mt-0.5">
                <span v-if="isMuted" class="text-destructive flex items-center gap-1.5">
                  <span class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-destructive"></span>
                  Мут
                </span>
                <span v-else class="text-green-500 flex items-center gap-1.5">
                  <span class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500"></span>
                  Вас слышно
                </span>
              </p>
            </div>

            <div
              class="flex items-center gap-1 sm:gap-2 bg-background/80 backdrop-blur-sm p-1 sm:p-2 rounded-[24px] sm:rounded-[24px] border border-primary/10 shadow-inner">
              <Button :variant="isNoiseSuppressionEnabled ? 'success' : 'ghost'" size="icon"
                @click="toggleNoiseSuppression"
                class="h-9 w-9 sm:h-11 sm:w-11 rounded-[16px] sm:rounded-[16px] transition-all hover:scale-105 active:scale-95"
                title="Подавление шума" aria-label="Подавление шума">
                <Ear class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div class="h-6 sm:h-8 w-[1px] bg-border/50 mx-0.5 sm:mx-1"></div>
              <Button :variant="isTotalMuted ? 'destructive' : 'ghost'" @click="toggleTotalMute" size="icon"
                class="h-9 w-9 sm:h-11 sm:w-11 rounded-[16px] sm:rounded-[16px] transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
                title="Тотальный мут" aria-label="Тотальный мут">
                <div v-if="isTotalMuted" class="relative z-10 flex items-center justify-center">
                  <Headphones class="h-4 w-4 sm:h-5 sm:w-5" />
                  <div class="absolute w-[18px] sm:w-[22px] h-[2px] bg-white rotate-45 shadow-sm rounded-full"></div>
                </div>
                <Headphones v-else class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button :variant="isMuted ? 'destructive' : 'default'" @click="toggleMute" size="icon"
                class="h-9 w-9 sm:h-11 sm:w-11 rounded-[16px] sm:rounded-[16px] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                title="Микрофон" aria-label="Включить/выключить микрофон">
                <MicOff v-if="isMuted" class="h-4 w-4 sm:h-5 sm:w-5" />
                <Mic v-else class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ParticipantList 
        :participants="participants" 
        :current-url="currentUrl" 
        :copied-link="copiedLink"
        @set-volume="setVolume"
        @copy-to-clipboard="copyToClipboard"
      />

      <ChatPanel 
        :messages="messages" 
        :my-id="myId"
        @send-message="sendMessage"
      />
    </div>

    <!-- Правая колонка: Видеопотоки и Игры -->
    <div v-if="hasStreams"
      class="flex-1 min-w-0 order-1 xl:order-2 space-y-4 sm:space-y-6 animate-in slide-in-from-right-10 duration-700">
      
      <VideoStreamGrid
        v-if="(myStream?.getVideoTracks()?.length ?? 0) > 0 || participants.some(p => (p.stream?.getVideoTracks()?.length ?? 0) > 0) || isSharedPlayerVisible"
        v-model:view-mode="viewMode"
        :my-stream="myStream"
        :participants="participants"
        :is-shared-player-visible="isSharedPlayerVisible"
        :shared-player-state="sharedPlayerState"
        :is-local-speaking="isLocalSpeaking"
        :camera-track="cameraTrack"
        :current-facing-mode="currentFacingMode"
        :user-name="userName"
        :is-total-muted="isTotalMuted"
        :is-muted="isMuted"
        @send-player-command="sendPlayerCommand"
      />

      <GamesPanel
        v-if="isGamesVisible"
        :tic-tac-toe-state="ticTacToeState"
        :coin-flip-state="coinFlipState"
        :my-id="myId"
        :user-name="userName"
        @tic-tac-toe-action="sendTicTacToeAction"
        @coin-flip-action="sendCoinFlipAction"
        @close="isGamesVisible = false"
      />
    </div>
  </div>
</template>
