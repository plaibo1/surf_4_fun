<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useVoiceRoom } from '@/composables/useVoiceRoom'
import Button from '@/components/ui/button/Button.vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import { Ear, Mic, MicOff, Copy, Check, Headphones, LogOut, Video, Monitor, Share2, Star, PlayCircle, HeadphoneOff, RefreshCw } from 'lucide-vue-next'
import { useFavorites } from '@/composables/useFavorites'
import ChatPanel from '@/components/ChatPanel.vue'
import ParticipantList from '@/components/ParticipantList.vue'
import VideoStreamGrid from '@/components/VideoStreamGrid.vue'

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
} = useVoiceRoom()

const isSharedPlayerVisible = ref(false)

const hasStreams = computed(() =>
  (myStream.value?.getVideoTracks()?.length ?? 0) > 0 ||
  participants.value.some(p => (p.stream?.getVideoTracks()?.length ?? 0) > 0) ||
  isSharedPlayerVisible.value
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
      <!-- Главная панель комнаты -->
      <Card
        class="overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-muted/30 rounded-none sm:rounded-2xl">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>

        <CardHeader
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 px-4 sm:px-6">
          <div class="space-y-1 w-full sm:w-auto">
            <div class="flex items-center gap-2 sm:gap-3">
              <CardTitle
                class="text-xl sm:text-2xl font-black tracking-tighter text-foreground uppercase truncate max-w-[150px] sm:max-w-[200px]">
                {{ roomId }}
              </CardTitle>
              <div class="flex items-center">
                <Button aria-label="Скопировать ID комнаты" variant="ghost" size="icon" class="h-8 w-8 rounded-lg hover:bg-primary/10 transition-all"
                  @click="copyToClipboard(roomId)">
                  <Check v-if="copiedLink === roomId" class="h-4 w-4 text-green-500" />
                  <Copy v-else class="h-4 w-4 text-muted-foreground" />
                </Button>

                <Button aria-label="Добавить в избранное" variant="ghost" size="icon"
                  class="h-8 w-8 rounded-lg hover:bg-yellow-500/10 transition-all group/star"
                  @click="toggleFavorite(roomId)">
                  <Star class="h-4 w-4 transition-all"
                    :class="isFavorite(roomId) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground group-hover/star:text-yellow-500'" />
                </Button>
              </div>

              <div
                class="bg-primary/10 text-primary text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20">
                Voice Room
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
            <div class="flex -space-x-2">
              <div v-for="p in participants.slice(0, 3)" :key="p.id"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
                {{ p.userName.charAt(0).toUpperCase() }}
              </div>
              <div v-if="participants.length > 3"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
                +{{ participants.length - 3 }}
              </div>
            </div>
            <span class="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">{{ participants.length + 1
              }} в сети</span>
          </div>
        </CardHeader>

        <CardContent class="px-4 sm:px-6 pb-6 pt-2">
          <div class="flex flex-col gap-2">
            <!-- Основные переключатели -->
            <div class="grid gap-2" :class="isVideoEnabled ? 'grid-cols-4 sm:grid-cols-3' : 'grid-cols-3'">
              <Button aria-label="Демонстрация экрана" :variant="isScreenSharing ? 'secondary' : 'outline'"
                class="h-10 gap-2 border-primary/5 hover:border-primary/20 transition-all duration-200"
                :class="isScreenSharing ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/5'"
                @click="toggleScreenShare">
                <Monitor class="h-4 w-4" />
                <span class="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">{{ isScreenSharing ?
                  'Экран' : 'Экран' }}</span>
              </Button>

              <Button aria-label="Включить камеру" :variant="isVideoEnabled ? 'secondary' : 'outline'"
                class="h-10 gap-2 border-primary/5 hover:border-primary/20 transition-all duration-200"
                :class="isVideoEnabled ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/5'"
                @click="toggleVideo">
                <Video class="h-4 w-4" />
                <span class="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">{{ isVideoEnabled ?
                  'Камера' : 'Камера' }}</span>
              </Button>

              <Button v-if="isVideoEnabled" aria-label="Переключить камеру" variant="outline"
                class="h-10 gap-2 border-primary/5 hover:border-primary/20 transition-all duration-200 bg-muted/5 sm:hidden"
                @click="switchCamera">
                <RefreshCw class="h-4 w-4" />
                <span class="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">{{ currentFacingMode ===
                  'user' ? 'Front' : 'Back' }}</span>
              </Button>

              <Button aria-label="Совместный просмотр" :variant="isSharedPlayerVisible ? 'secondary' : 'outline'"
                class="relative h-10 gap-2 border-primary/5 hover:border-primary/20 transition-all duration-200"
                :class="isSharedPlayerVisible ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/5'"
                @click="isSharedPlayerVisible = !isSharedPlayerVisible">
                <!-- Badge Beta -->
                <div
                  class="absolute -top-2 -right-1 px-1.5 py-0.5 bg-yellow-500 text-[8px] font-black text-yellow-950 rounded-full leading-none shadow-sm z-10 select-none border border-background">
                  BETA
                </div>

                <div class="relative">
                  <PlayCircle class="h-4 w-4" />
                  <div v-if="sharedPlayerState.url"
                    class="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500 border border-background"></div>
                </div>
                <span class="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">SyncWatch</span>
              </Button>
            </div>

            <!-- Вспомогательные действия -->
            <div class="flex items-stretch gap-2">
              <Button aria-label="Скопировать ссылку" variant="outline" size="lg"
                class="flex-1 gap-2 border-primary/5 hover:border-primary/20 bg-muted/5 transition-all active:scale-95"
                :class="{ 'border-green-500/50 bg-green-500/5 text-green-600': copiedLink === currentUrl }"
                @click="copyToClipboard(currentUrl)">
                <Check v-if="copiedLink === currentUrl" class="h-4 w-4" />
                <Share2 v-else class="h-4 w-4" />
                <span class="text-[10px] font-bold uppercase tracking-tight">
                  {{ copiedLink === currentUrl ? 'Готово' : 'Пригласить друзей' }}
                </span>
              </Button>

              <Button variant="destructive" size="lg"
                class="px-4 shadow-none transition-all hover:bg-destructive/90 active:scale-95" @click="onLeave"
                title="Выйти из комнаты" aria-label="Выйти из комнаты">
                <LogOut class="h-4 w-4 sm:mr-1" />
                <span class="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">Выход</span>
              </Button>
            </div>
          </div>

          <p v-if="error"
            class="text-destructive text-[10px] sm:text-xs font-medium text-center bg-destructive/10 py-2 rounded-md border border-destructive/20">
            {{ error }}</p>
          <p v-if="roomFull"
            class="text-destructive text-[10px] sm:text-xs font-medium text-center bg-destructive/10 py-2 rounded-md border border-destructive/20">
            В комнате уже 5 человек.</p>

          <div v-if="volumeKing"
            class="mt-4 p-2 sm:p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between shadow-inner">
            <div class="flex items-center gap-2 sm:gap-3">
              <div class="relative">
                <div
                  class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-500 text-yellow-950 flex items-center justify-center text-base sm:text-lg font-black shadow-lg shadow-yellow-500/20">
                  {{ volumeKing.name.charAt(0).toUpperCase() }}
                </div>
                <div class="absolute -top-3 sm:-top-4 -right-2 text-xl sm:text-2xl drop-shadow-md">👑</div>
              </div>
              <div>
                <p class="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-yellow-600/80">Volume King
                </p>
                <p class="text-xs sm:text-sm font-bold text-foreground truncate max-w-[80px] sm:max-w-none">{{
                  volumeKing.name }}</p>
              </div>
            </div>
            <div
              class="text-[8px] sm:text-[10px] font-mono font-bold bg-yellow-500/10 px-2 py-1 rounded text-yellow-700">
              PWR: {{ Math.round(volumeKing.maxVolume + 100) }}%
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Моя карточка -->
      <Card class="border-primary/30 bg-primary/5 shadow-lg shadow-primary/5 relative overflow-hidden rounded-2xl">
        <CardContent class="p-3 sm:p-4 flex flex-col items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div class="flex items-center gap-4 sm:gap-6 w-full">
            <div class="relative group">
              <div
                class="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black shrink-0 transition-all duration-75 shadow-2xl overflow-hidden"
                :class="isLocalSpeaking ? 'bg-primary text-primary-foreground ring-4 ring-green-500/30' : 'bg-primary/20 text-primary'"
                :style="{ transform: `scale(${1 + localAudioLevel * 0.15})` }">
                {{ userName.charAt(0).toUpperCase() }}
                <!-- Анимация волн когда говоришь -->
                <span v-if="isLocalSpeaking"
                  class="absolute -inset-1 rounded-xl sm:rounded-2xl border-2 border-green-500 animate-ping opacity-20"></span>
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
              class="flex items-center gap-1 sm:gap-2 bg-background/80 backdrop-blur-sm p-1 sm:p-2 rounded-xl sm:rounded-2xl border border-primary/10 shadow-inner">
              <Button :variant="isNoiseSuppressionEnabled ? 'success' : 'ghost'" size="icon"
                @click="toggleNoiseSuppression"
                class="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95"
                title="Подавление шума" aria-label="Подавление шума">
                <Ear class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div class="h-6 sm:h-8 w-[1px] bg-border/50 mx-0.5 sm:mx-1"></div>
              <Button :variant="isTotalMuted ? 'destructive' : 'ghost'" @click="toggleTotalMute" size="icon"
                class="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
                title="Тотальный мут" aria-label="Тотальный мут">
                <div v-if="isTotalMuted" class="relative z-10 flex items-center justify-center">
                  <Headphones class="h-4 w-4 sm:h-5 sm:w-5" />
                  <div class="absolute w-[18px] sm:w-[22px] h-[2px] bg-white rotate-45 shadow-sm rounded-full"></div>
                </div>
                <Headphones v-else class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button :variant="isMuted ? 'destructive' : 'default'" @click="toggleMute" size="icon"
                class="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
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

    <!-- Правая колонка: Видеопотоки -->
    <div v-if="hasStreams"
      class="flex-1 min-w-0 order-1 xl:order-2 space-y-4 sm:space-y-6 animate-in slide-in-from-right-10 duration-700">
      <VideoStreamGrid
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
    </div>
  </div>
</template>
