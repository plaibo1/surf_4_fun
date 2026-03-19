<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useVoiceRoom } from '@/composables/useVoiceRoom'
import SharedPlayer from '@/components/shared-player/SharedPlayer.vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Slider from '@/components/ui/slider/Slider.vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import type { DirectiveBinding } from 'vue'
import { Ear, Mic, MicOff, Send, Copy, Check, Headphones, LogOut, Video, Monitor, Share2, MessageSquare, Ghost, Scan, LayoutGrid, LayoutList, Star, Swords, PlayCircle } from 'lucide-vue-next'
import { useFavorites } from '@/composables/useFavorites'

const props = defineProps<{
  roomId: string
  userName: string
}>()

const emit = defineEmits<{ leave: [] }>()

const {
  toggleFavorite,
  isFavorite
} = useFavorites()

const {
  myId,
  participants,
  roomId,
  getVolume,
  setVolume,
  isMuted,
  isTotalMuted,
  isVideoEnabled,
  isScreenSharing,
  roomFull,
  error,
  sharedPlayerState,
  join,
  leave,
  toggleMute,
  toggleTotalMute,
  toggleVideo,
  toggleScreenShare,
  sendPlayerCommand,
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

const newMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const viewMode = ref<'grid' | 'row'>('grid')

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    scrollToBottom()
  }
)

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function onSendMessage() {
  if (!newMessage.value.trim()) return
  sendMessage(newMessage.value)
  newMessage.value = ''
  await nextTick()
  scrollToBottom()
}

function handleLinkClick(part: any) {
  if (part.isCS && part.ip) {
    window.location.href = `steam://connect/${part.ip}`
  } else {
    copyToClipboard(part.text)
  }
}

function parseMessage(text: string) {
  if (!text) return [];
  // Регулярка для ссылок и IP (с префиксом connect или без)
  const regex = /(https?:\/\/[^\s]+|(?:connect\s+)?\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?\b)/gi;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    const isUrl = /^https?:\/\//i.test(part);
    // Это CS ссылка только если это НЕ URL и содержит паттерн IP
    const isCS = !isUrl && /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?\b/i.test(part);

    return {
      id: index,
      isLink: isUrl || isCS,
      isCS: isCS,
      text: part,
      // Чистый IP для steam://connect/
      ip: isCS ? part.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?\b/)?.[0] : null
    };
  }).filter((p): p is any => !!(p && p.text));
}

const copiedLink = ref<string | null>(null);
const currentUrl = window.location.href;
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedLink.value = text;
    setTimeout(() => {
      if (copiedLink.value === text) {
        copiedLink.value = null;
      }
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
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

function handleKeyDown(event: KeyboardEvent) {
  const activeElement = document.activeElement;
  const isInput = activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    (activeElement as HTMLElement)?.isContentEditable;

  if (isInput) return;

  if (event.code === 'KeyM' || event.key.toLowerCase() === 'm') {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      toggleTotalMute();
    } else {
      toggleMute();
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
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
                <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg hover:bg-primary/10 transition-all"
                  @click="copyToClipboard(roomId)">
                  <Check v-if="copiedLink === roomId" class="h-4 w-4 text-green-500" />
                  <Copy v-else class="h-4 w-4 text-muted-foreground" />
                </Button>

                <Button variant="ghost" size="icon"
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
            <div class="grid grid-cols-3 gap-2">
              <Button 
                :variant="isScreenSharing ? 'secondary' : 'outline'"
                class="h-10 gap-2 border-primary/5 hover:border-primary/20 transition-all duration-200"
                :class="isScreenSharing ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/5'"
                @click="toggleScreenShare"
              >
                <Monitor class="h-4 w-4" />
                <span class="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">{{ isScreenSharing ? 'Экран' : 'Экран' }}</span>
              </Button>

              <Button 
                :variant="isVideoEnabled ? 'secondary' : 'outline'"
                class="h-10 gap-2 border-primary/5 hover:border-primary/20 transition-all duration-200"
                :class="isVideoEnabled ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/5'"
                @click="toggleVideo"
              >
                <Video class="h-4 w-4" />
                <span class="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">{{ isVideoEnabled ? 'Камера' : 'Камера' }}</span>
              </Button>

              <Button 
                :variant="isSharedPlayerVisible ? 'secondary' : 'outline'"
                class="relative h-10 gap-2 border-primary/5 hover:border-primary/20 transition-all duration-200"
                :class="isSharedPlayerVisible ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/5'"
                @click="isSharedPlayerVisible = !isSharedPlayerVisible"
              >
                <!-- Badge Beta -->
                <div class="absolute -top-2 -right-1 px-1.5 py-0.5 bg-yellow-500 text-[8px] font-black text-yellow-950 rounded-full leading-none shadow-sm z-10 select-none border border-background">
                  BETA
                </div>

                <div class="relative">
                  <PlayCircle class="h-4 w-4" />
                  <div v-if="sharedPlayerState.url" class="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500 border border-background"></div>
                </div>
                <span class="text-[10px] font-bold uppercase tracking-tight hidden sm:inline">SyncWatch</span>
              </Button>
            </div>

            <!-- Вспомогательные действия -->
            <div class="flex items-stretch gap-2">
              <Button 
                variant="outline"
                size="lg"
                class="flex-1 gap-2 border-primary/5 hover:border-primary/20 bg-muted/5 transition-all active:scale-95"
                :class="{ 'border-green-500/50 bg-green-500/5 text-green-600': copiedLink === currentUrl }"
                @click="copyToClipboard(currentUrl)"
              >
                <Check v-if="copiedLink === currentUrl" class="h-4 w-4" />
                <Share2 v-else class="h-4 w-4" />
                <span class="text-[10px] font-bold uppercase tracking-tight">
                  {{ copiedLink === currentUrl ? 'Готово' : 'Пригласить друзей' }}
                </span>
              </Button>
              
              <Button 
                variant="destructive" 
                size="lg"
                class="px-4 shadow-none transition-all hover:bg-destructive/90 active:scale-95"
                @click="onLeave"
                title="Выйти из комнаты"
              >
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
            class="p-2 sm:p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between shadow-inner">
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
                <MicOff v-if="isMuted" class="h-3 sm:h-3.5 w-3 sm:w-3.5 text-white" />
                <Mic v-else class="h-3 sm:h-3.5 w-3 sm:w-3.5 text-white" />
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
                title="Подавление шума">
                <Ear class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div class="h-6 sm:h-8 w-[1px] bg-border/50 mx-0.5 sm:mx-1"></div>
              <Button :variant="isTotalMuted ? 'destructive' : 'ghost'" @click="toggleTotalMute" size="icon"
                class="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
                title="Тотальный мут">
                <div v-if="isTotalMuted" class="relative z-10 flex items-center justify-center">
                  <Headphones class="h-4 w-4 sm:h-5 sm:w-5" />
                  <div class="absolute w-[18px] sm:w-[22px] h-[2px] bg-white rotate-45 shadow-sm rounded-full"></div>
                </div>
                <Headphones v-else class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button :variant="isMuted ? 'destructive' : 'default'" @click="toggleMute" size="icon"
                class="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                title="Микрофон">
                <MicOff v-if="isMuted" class="h-4 w-4 sm:h-5 sm:w-5" />
                <Mic v-else class="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Участники -->
      <Card class="border-none shadow-xl rounded-none sm:rounded-2xl">
        <CardHeader class="pb-2 px-4 sm:px-6">
          <CardTitle class="text-base sm:text-lg font-black uppercase tracking-tight">Участники</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
          <div v-for="p in participants" :key="p.id"
            class="flex items-center gap-4 sm:gap-6 rounded-xl border border-primary/5 bg-muted/20 p-2 sm:p-3 transition-all hover:bg-muted/30">
            <div
              class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-black shrink-0 transition-all duration-75 relative"
              :class="p.isSpeaking ? 'bg-primary text-primary-foreground ring-2 ring-green-500' : 'bg-muted text-muted-foreground'"
              :style="{ transform: `scale(${1 + p.audioLevel * 0.2})` }">
              {{ p.userName.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-xs sm:text-sm truncate">{{ p.userName }}</p>
              <div class="flex items-center gap-2 mt-1">
                <Slider :model-value="[getVolume(p.id)]" :min="0" :max="100" :step="1" class="flex-1 h-1"
                  @update:model-value="(v) => setVolume(p.id, v?.[0] ?? 100)" />
                <span class="text-[9px] sm:text-[10px] font-mono text-muted-foreground w-8 text-right">{{
                  getVolume(p.id) }}%</span>
              </div>
            </div>
          </div>
          <div v-if="participants.length === 0"
            class="py-6 sm:py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-700">
            <div class="relative">
              <div class="absolute inset-0 bg-primary/10 blur-2xl rounded-full"></div>
              <div
                class="relative w-12 h-12 sm:w-16 sm:h-16 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 shadow-inner">
                <Ghost class="h-6 w-6 sm:h-8 sm:w-8 text-primary/30" />
              </div>
            </div>

            <div class="space-y-1 max-w-[240px]">
              <h3 class="font-black text-xs sm:text-sm uppercase tracking-tighter text-foreground italic">В комнате
                пусто</h3>
              <p class="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-relaxed">
                Вы единственный участник. Позовите друзей!
              </p>
            </div>

            <Button variant="outline"
              class="rounded-xl px-4 sm:px-6 h-9 sm:h-10 gap-2 border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95"
              @click="copyToClipboard(currentUrl)">
              <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                {{ copiedLink === currentUrl ? 'Ссылка у вас!' : 'Пригласить' }}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Чат -->
      <Card
        class="border-none shadow-2xl bg-gradient-to-br from-card to-muted/20 overflow-hidden flex flex-col h-[400px] rounded-none sm:rounded-2xl">
        <CardHeader class="border-b bg-muted/30 pb-3 px-4 sm:px-6">
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-primary/10 text-primary">
                <MessageSquare class="h-4 w-4" />
              </div>
              <CardTitle class="text-base sm:text-lg font-black tracking-tight">Чат</CardTitle>
            </div>
            <div
              class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {{ messages.length }} msg
            </div>
          </div>
        </CardHeader>
        <CardContent class="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scroll-smooth">
            <div v-if="messages.length === 0"
              class="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <MessageSquare class="h-6 w-6 sm:h-8 sm:w-8" />
              <p class="text-[10px] sm:text-xs font-bold uppercase">Пусто</p>
            </div>
            <div v-for="msg in messages" :key="msg.id"
              class="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300"
              :class="msg.senderId === myId ? 'items-end' : 'items-start'">
              <span v-if="msg.senderId !== myId"
                class="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-2 mb-1">{{
                  msg.senderName
                }}</span>
              <div
                class="group relative max-w-[90%] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm transition-all"
                :class="msg.senderId === myId ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border/50 text-foreground rounded-tl-none'">
                <div class="text-[11px] sm:text-xs font-medium leading-relaxed whitespace-pre-wrap">
                  <template v-for="part in parseMessage(msg.text)" :key="part.id">
                    <span v-if="part.isLink"
                      class="inline-flex items-center gap-1.5 align-middle bg-black/10 dark:bg-white/5 px-1 sm:px-1.5 py-0.5 rounded-lg cursor-pointer group/link transition-all hover:bg-black/20 dark:hover:bg-white/10 active:scale-95"
                      @click="handleLinkClick(part)">
                      <template v-if="part.isCS">
                        <Swords class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-400 shrink-0" />
                      </template>
                      <template v-else>
                        <Check v-if="copiedLink === part.text"
                          class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-400 shrink-0" />
                        <Copy v-else
                          class="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-40 group-hover/link:opacity-100 transition-opacity shrink-0" />
                      </template>
                      <span
                        class="underline underline-offset-2 transition-all font-bold select-none truncate max-w-[120px] sm:max-w-[180px]"
                        :class="msg.senderId === myId ? 'text-white' : 'text-primary'">{{ part.text }}</span>
                    </span>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </div>
                <div class="text-right mt-1 text-[7px] sm:text-[8px] font-bold opacity-50">{{ new
                  Date(msg.timestamp).toLocaleTimeString([], {
                    hour:
                      '2-digit', minute: '2-digit'
                  }) }}</div>
              </div>
            </div>
          </div>
          <div class="p-2 sm:p-3 bg-muted/40 border-t backdrop-blur-xl">
            <form @submit.prevent="onSendMessage" class="flex items-center gap-2">
              <Input v-model="newMessage" placeholder="Сообщение..."
                class="flex-1 h-9 sm:h-10 rounded-lg sm:rounded-xl border-none bg-background/60 shadow-inner text-[11px] sm:text-xs px-3" />
              <Button type="submit" size="icon" class="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl"
                :disabled="!newMessage.trim()">
                <Send class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Правая колонка: Видеопотоки (только если есть стримы) -->
    <div v-if="hasStreams"
      class="flex-1 min-w-0 order-1 xl:order-2 space-y-4 sm:space-y-6 animate-in slide-in-from-right-10 duration-700">
      <Card class="border-none bg-black/5 dark:bg-white/5 shadow-2xl overflow-hidden h-fit rounded-none sm:rounded-2xl">
        <CardHeader class="flex flex-row items-center justify-between border-b border-primary/5 pb-4 px-4 sm:px-6">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></div>
            <CardTitle class="text-lg sm:text-xl font-black uppercase tracking-tighter">Live</CardTitle>
          </div>

          <div class="flex items-center bg-muted/50 p-1 rounded-lg sm:rounded-xl border border-border/50">
            <Button variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8 rounded-lg transition-all"
              :class="{ 'bg-background shadow-sm text-primary': viewMode === 'grid' }" @click="viewMode = 'grid'">
              <LayoutGrid class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8 rounded-lg transition-all"
              :class="{ 'bg-background shadow-sm text-primary': viewMode === 'row' }" @click="viewMode = 'row'">
              <LayoutList class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent class="p-2 sm:p-4 transition-all duration-500"
          :class="viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4' : 'flex flex-col gap-2 sm:gap-4'">
          
          <!-- SharedPlayer -->
          <div v-if="isSharedPlayerVisible" 
            :class="viewMode === 'grid' ? 'col-span-1 md:col-span-2' : ''"
            class="aspect-video w-full">
            <SharedPlayer :state="sharedPlayerState" @command="sendPlayerCommand" />
          </div>

          <!-- Видеопотоки -->
          <template v-if="myStream">
            <div v-for="track in myStream.getVideoTracks()" :key="track.id"
              class="relative group rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-900 aspect-video border-2 transition-all duration-500"
              :class="isLocalSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-primary/10'"
              @dblclick="toggleFullscreen">
              <video v-stream="getOrCreateStream(track)" autoplay playsinline muted
                class="w-full h-full object-cover scale-[1.01] transition-all duration-700"></video>
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-60 group-hover:opacity-100 transition-opacity">
              </div>
              <div class="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-2">
                <div
                  class="bg-primary/20 backdrop-blur-md border border-white/10 px-1.5 sm:px-2 py-0.5 rounded-lg flex items-center gap-1 sm:gap-1.5">
                  <div class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary"></div>
                  <span class="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-tighter">You</span>
                </div>
              </div>
              <div
                class="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between">
                <div
                  class="flex items-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl">
                  <span class="text-[10px] sm:text-xs font-bold text-white truncate max-w-[80px] sm:max-w-[100px]">{{
                    userName }}</span>
                  <div class="flex items-center gap-1 border-l border-white/20 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1">
                    <MicOff v-if="isMuted" class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400" />
                    <Mic v-else class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-green-400" />
                  </div>
                </div>
                <button @click.stop="toggleFullscreen"
                  class="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg sm:rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <Scan class="w-3 w-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </template>

          <template v-for="p in participants" :key="p.id">
            <template v-if="p.stream">
              <div v-for="track in p.stream.getVideoTracks()" :key="track.id"
                class="relative group rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-900 aspect-video border-2 transition-all duration-500"
                :class="p.isSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-white/5'"
                @dblclick="toggleFullscreen">
                <video v-stream="getOrCreateStream(track)" autoplay playsinline
                  class="w-full h-full object-cover scale-[1.01] transition-all duration-700"></video>
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-40 group-hover:opacity-90 transition-opacity">
                </div>
                <div class="absolute top-2 sm:top-3 left-2 sm:left-3">
                  <div
                    class="bg-red-500/20 backdrop-blur-md border border-red-500/30 px-1.5 sm:px-2 py-0.5 rounded-lg flex items-center gap-1 sm:gap-1.5">
                    <div class="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                    </div><span
                      class="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-tighter">Live</span>
                  </div>
                </div>
                <div
                  class="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 flex items-center justify-between">
                  <div
                    class="flex items-center gap-1.5 sm:gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-2xl">
                    <span class="text-[10px] sm:text-xs font-bold text-white truncate max-w-[100px] sm:max-w-[120px]">{{
                      p.userName }}</span>
                    <div class="flex items-center border-l border-white/20 pl-1.5 sm:pl-2 ml-0.5 sm:ml-1">
                      <Monitor
                        v-if="track.label.toLowerCase().includes('screen') || track.label.toLowerCase().includes('window')"
                        class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                      <Video v-else class="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/60" />
                    </div>
                  </div>
                  <button @click.stop="toggleFullscreen"
                    class="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg sm:rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Scan class="w-3 w-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </template>
          </template>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
