<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useVoiceRoom } from '@/composables/useVoiceRoom'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
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
  join,
  leave,
  toggleMute,
  toggleTotalMute,
  toggleVideo,
  toggleScreenShare,
  myStream,
  isLocalSpeaking,
  volumeKing,

  isNoiseSuppressionEnabled,
  toggleNoiseSuppression,
  messages,
  sendMessage,
} = useVoiceRoom()

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

function parseMessage(text: string) {
  if (!text) return [];
  // Разделяем по ссылкам (http(s)://... или ip-адреса с портом X.X.X.X:PORT)
  const regex = /(https?:\/\/[^\s]+|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}\b)/;
  const parts = text.split(regex);
  return parts.map((part, index) => ({
    id: index,
    isLink: /^https?:\/\//.test(part) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(part),
    text: part
  })).filter(p => p.text);
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

// custom directive to bind MediaStream easily
import type { DirectiveBinding } from 'vue'
import { Ear, Mic, MicOff, Send, Copy, Check, Headphones, LogOut, Video, VideoOff, Monitor, MonitorOff, Share2, MessageSquare, Ghost, UserPlus, Scan, LayoutGrid, LayoutList } from 'lucide-vue-next'


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
  <div class="w-full max-w-2xl space-y-6">
    <!-- Главная панель комнаты -->
    <Card class="overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-muted/30">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
      
      <CardHeader class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <CardTitle class="text-2xl font-black tracking-tighter text-foreground uppercase truncate max-w-[250px]">
              {{ roomId }}
            </CardTitle>
            <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg hover:bg-primary/10 transition-all" @click="copyToClipboard(roomId)">
              <Check v-if="copiedLink === roomId" class="h-4 w-4 text-green-500" />
              <Copy v-else class="h-4 w-4 text-muted-foreground" />
            </Button>

            <div class="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20">
              Voice Room
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex -space-x-2 mr-2">
            <div v-for="p in participants.slice(0, 3)" :key="p.id" class="w-8 h-8 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[10px] font-bold">
              {{ p.userName.charAt(0).toUpperCase() }}
            </div>
            <div v-if="participants.length > 3" class="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
              +{{ participants.length - 3 }}
            </div>
          </div>
          <span class="text-sm font-semibold mr-4 text-foreground">{{ participants.length + 1 }} в сети</span>
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- Глобальные действия -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button :variant="isScreenSharing ? 'secondary' : 'outline'" class="w-full gap-2 border-primary/10 hover:border-primary/30" @click="toggleScreenShare">
            <Monitor v-if="!isScreenSharing" class="h-4 w-4" />
            <MonitorOff v-else class="h-4 w-4" />
            <span class="hidden sm:inline text-xs">{{ isScreenSharing ? 'Стоп экран' : 'Экран' }}</span>
          </Button>
          <Button :variant="isVideoEnabled ? 'secondary' : 'outline'" class="w-full gap-2 border-primary/10 hover:border-primary/30" @click="toggleVideo">
            <Video v-if="!isVideoEnabled" class="h-4 w-4" />
            <VideoOff v-else class="h-4 w-4" />
            <span class="hidden sm:inline text-xs">{{ isVideoEnabled ? 'Выкл камеру' : 'Камера' }}</span>
          </Button>
          <Button 
            variant="outline" 
            class="w-full gap-2 border-primary/10 hover:border-primary/30 transition-all" 
            :class="{ 'border-green-500/50 bg-green-500/5 text-green-600': copiedLink === currentUrl }"
            @click="copyToClipboard(currentUrl)"
          >
            <Check v-if="copiedLink === currentUrl" class="h-4 w-4" />
            <Share2 v-else class="h-4 w-4" />
            <span class="hidden sm:inline text-xs">
              {{ copiedLink === currentUrl ? 'Скопировано!' : 'Пригласить' }}
            </span>
          </Button>
          <Button variant="destructive" class="w-full gap-2 shadow-lg shadow-destructive/10" @click="onLeave">
            <LogOut class="h-4 w-4" />
            <span class="hidden sm:inline text-xs">Выйти</span>
          </Button>
        </div>

        <p v-if="error" class="text-destructive text-xs font-medium text-center bg-destructive/10 py-2 rounded-md border border-destructive/20">{{ error }}</p>
        <p v-if="roomFull" class="text-destructive text-xs font-medium text-center bg-destructive/10 py-2 rounded-md border border-destructive/20">В комнате уже 5 человек.</p>

        <!-- Король громкости (Integrated) -->
        <div v-if="volumeKing" class="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between shadow-inner">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-yellow-500 text-yellow-950 flex items-center justify-center text-lg font-black shadow-lg shadow-yellow-500/20">
                {{ volumeKing.name.charAt(0).toUpperCase() }}
              </div>
              <div class="absolute -top-4 -right-2 text-2xl drop-shadow-md animate-bounce duration-1000">👑</div>
            </div>
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-yellow-600/80">Current Volume King</p>
              <p class="text-sm font-bold text-foreground">{{ volumeKing.name }}</p>
            </div>
          </div>
          <div class="text-[10px] font-mono font-bold bg-yellow-500/10 px-2 py-1 rounded text-yellow-700">
            PWR: {{ Math.round(volumeKing.maxVolume + 100) }}%
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Моя карточка (панель управления собой) -->
    <Card class="border-primary/30 bg-primary/5 shadow-lg shadow-primary/5 relative overflow-hidden">
      <div v-if="isLocalSpeaking" class="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none"></div>
      <CardContent class="p-4 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
        <div class="flex items-center gap-4 w-full">
          <div class="relative group">
            <div 
              class="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 transition-all duration-300 shadow-2xl overflow-hidden"
              :class="isLocalSpeaking ? 'bg-primary text-primary-foreground scale-105 ring-4 ring-green-500/30' : 'bg-primary/20 text-primary'"
            >
              {{ userName.charAt(0).toUpperCase() }}
              <!-- Анимация волн когда говоришь -->
              <span v-if="isLocalSpeaking" class="absolute -inset-1 rounded-2xl border-2 border-green-500 animate-ping opacity-20"></span>
            </div>
            <div class="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background shadow-lg transition-colors duration-300" :class="isMuted ? 'bg-destructive' : 'bg-green-500'">
              <MicOff v-if="isMuted" class="h-3.5 w-3.5 text-white" />
              <Mic v-else class="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          <div class="flex-1 overflow-hidden">
            <div class="flex items-center gap-2">
              <h3 class="font-black text-xl truncate tracking-tight text-foreground">{{ userName }}</h3>
              <span class="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Вы</span>
            </div>
            <p class="text-sm font-medium flex items-center gap-2 mt-0.5">
              <span v-if="isMuted" class="text-destructive flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"></span>
                Микрофон выключен
              </span>
              <span v-else class="text-green-500 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce"></span>
                Вас отлично слышно
              </span>
            </p>
          </div>

          <!-- Компактный блок управления звуком -->
          <div class="flex items-center gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-2xl border border-primary/10 shadow-inner">
            <Button :variant="isNoiseSuppressionEnabled ? 'success' : 'ghost'" size="icon" @click="toggleNoiseSuppression" class="h-11 w-11 rounded-xl transition-all hover:scale-105 active:scale-95" title="Подавление шума">
              <Ear class="h-5 w-5" />
            </Button>

            <div class="h-8 w-[1px] bg-border/50 mx-1"></div>

            <Button :variant="isTotalMuted ? 'destructive' : 'ghost'" @click="toggleTotalMute" size="icon" class="h-11 w-11 rounded-xl transition-all hover:scale-105 active:scale-95 group relative overflow-hidden" title="Тотальный мут (Deafen)">
              <div v-if="isTotalMuted" class="relative z-10 flex items-center justify-center">
                <Headphones class="h-5 w-5" />
                <div class="absolute w-[22px] h-[2px] bg-white rotate-45 shadow-sm rounded-full"></div>
              </div>
              <Headphones v-else class="h-5 w-5" />
            </Button>

            <Button :variant="isMuted ? 'destructive' : 'default'" @click="toggleMute" size="icon" class="h-11 w-11 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20" title="Микрофон">
              <MicOff v-if="isMuted" class="h-5 w-5" />
              <Mic v-else class="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Секция Видеочата: Cinematic Mosaic -->
    <Card v-if="myStream?.getVideoTracks()?.length || participants.some(p => p.stream && p.stream.getVideoTracks().length)" class="border-none bg-black/5 dark:bg-white/5 shadow-2xl overflow-hidden">
      <CardHeader class="flex flex-row items-center justify-between border-b border-primary/5 pb-4">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <CardTitle class="text-xl font-black uppercase tracking-tighter">Live Streams</CardTitle>
        </div>
        
        <div class="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8 rounded-lg transition-all"
            :class="{ 'bg-background shadow-sm text-primary': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Grid View"
          >
            <LayoutGrid class="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8 rounded-lg transition-all"
            :class="{ 'bg-background shadow-sm text-primary': viewMode === 'row' }"
            @click="viewMode = 'row'"
            title="Row View"
          >
            <LayoutList class="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent 
        class="p-4 transition-all duration-500"
        :class="viewMode === 'grid' 
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr' 
          : 'flex flex-col gap-4'"
      >
        <!-- Я (Self View) -->
        <template v-if="myStream">
          <div 
            v-for="track in myStream.getVideoTracks()" 
            :key="track.id" 
            class="relative group rounded-2xl overflow-hidden bg-zinc-900 aspect-video flex items-center justify-center transition-all duration-500 border-2 shadow-lg"
            :class="isLocalSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-primary/10'"
            @dblclick="toggleFullscreen"
          >
            <video v-stream="createStream(track)" autoplay playsinline muted class="w-full h-full object-cover scale-[1.01] grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"></video>
            
            <!-- Оверлей управления и информации -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            
            <!-- Верхний бадж -->
            <div class="absolute top-3 left-3 flex items-center gap-2">
              <div class="bg-primary/20 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                <span class="text-[9px] font-black text-white uppercase tracking-tighter">You</span>
              </div>
            </div>

            <!-- Нижний бадж (Имя и статус) -->
            <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div class="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl">
                <span class="text-xs font-bold text-white truncate max-w-[100px]">{{ userName }}</span>
                <div class="flex items-center gap-1 border-l border-white/20 pl-2 ml-1">
                  <MicOff v-if="isMuted" class="h-3 w-3 text-red-400" />
                  <Mic v-else class="h-3 w-3 text-green-400" />
                </div>
              </div>
              
              <button @click.stop="toggleFullscreen" class="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <Scan class="w-4 h-4" />
              </button>
            </div>
          </div>
        </template>

        <!-- Другие участники -->
        <template v-for="p in participants" :key="p.id">
          <template v-if="p.stream">
            <div 
              v-for="track in p.stream.getVideoTracks()" 
              :key="track.id" 
              class="relative group rounded-2xl overflow-hidden bg-zinc-900 aspect-video flex items-center justify-center transition-all duration-500 border-2 shadow-lg"
              :class="p.isSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-white/5 hover:border-primary/30'"
              @dblclick="toggleFullscreen"
            >
              <video v-stream="createStream(track)" autoplay playsinline class="w-full h-full object-cover scale-[1.01] transition-all duration-700"></video>
              
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-40 group-hover:opacity-90 transition-opacity"></div>

              <!-- Верхний бадж (Live) -->
              <div class="absolute top-3 left-3">
                <div class="bg-red-500/20 backdrop-blur-md border border-red-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                  <span class="text-[9px] font-black text-white uppercase tracking-tighter">Live</span>
                </div>
              </div>

              <!-- Инфо бадж -->
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div class="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl shadow-2xl">
                  <span class="text-xs font-bold text-white truncate max-w-[120px]">{{ p.userName }}</span>
                  <!-- Иконка типа стрима (Camera/Screen) -->
                  <div class="flex items-center border-l border-white/20 pl-2 ml-1">
                    <Monitor v-if="track.label.toLowerCase().includes('screen') || track.label.toLowerCase().includes('window')" class="h-3 w-3 text-primary" />
                    <Video v-else class="h-3 w-3 text-white/60" />
                  </div>
                </div>

                <button @click.stop="toggleFullscreen" class="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <Scan class="w-4 h-4" />
                </button>
              </div>
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
        <!-- Состояние: Ожидание участников (UX Redesign) -->
        <div v-if="participants.length === 0" class="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
          <div class="relative group">
            <div class="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse group-hover:bg-primary/30 transition-all"></div>
            <div class="relative w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 shadow-inner">
              <Ghost class="h-12 w-12 text-primary/40" />
            </div>
          </div>

          <div class="space-y-2 max-w-[280px]">
            <h3 class="font-black text-xl uppercase tracking-tighter text-foreground italic">В комнате пусто</h3>
            <p class="text-sm font-medium text-muted-foreground leading-relaxed">
              Вы единственный участник. Поделитесь ссылкой, чтобы кто-то смог присоединиться к вам.
            </p>
          </div>

          <Button 
            variant="outline" 
            class="rounded-xl px-8 h-12 gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95"
            @click="copyToClipboard(currentUrl)"
          >
            <UserPlus class="h-4 w-4" />
            <span class="text-xs font-bold uppercase tracking-widest">
              {{ copiedLink === currentUrl ? 'Ссылка скопирована' : 'Пригласить друзей' }}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Чат: Современный мессенджер -->
    <Card class="border-none shadow-2xl bg-gradient-to-br from-card to-muted/20 overflow-hidden flex flex-col h-[500px]">
      <CardHeader class="border-b bg-muted/30 pb-3">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-primary/10 text-primary">
              <MessageSquare class="h-4 w-4" />
            </div>
            <CardTitle class="text-lg font-black tracking-tight">Чат комнаты</CardTitle>
          </div>
          <div class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {{ messages.length }} сообщений
          </div>
        </div>
      </CardHeader>
      
      <CardContent class="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
        <!-- Контейнер сообщений с кастомным скроллбаром -->
        <div 
          ref="messagesContainer" 
          class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        >
          <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare class="h-8 w-8" />
            </div>
            <div class="space-y-1">
              <p class="font-black text-sm uppercase tracking-tighter">Здесь пока пусто</p>
              <p class="text-xs font-medium">Напишите что-нибудь первым!</p>
            </div>
          </div>

          <div 
            v-for="msg in messages" 
            :key="msg.id" 
            class="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300"
            :class="msg.senderId === myId ? 'items-end' : 'items-start'"
          >
            <!-- Имя отправителя (только если не своё) -->
            <span 
              v-if="msg.senderId !== myId" 
              class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-3 mb-1"
            >
              {{ msg.senderName }}
            </span>

            <!-- Баббл сообщения -->
            <div 
              class="group relative max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm transition-all hover:shadow-md"
              :class="msg.senderId === myId 
                ? 'bg-primary text-primary-foreground rounded-tr-none shadow-primary/10' 
                : 'bg-card border border-border/50 text-foreground rounded-tl-none'"
            >
              <!-- Текст сообщения -->
              <div class="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                <template v-for="part in parseMessage(msg.text)" :key="part.id">
                  <span v-if="part.isLink" class="inline-flex items-center gap-1.5 align-bottom">
                    <button 
                      @click="copyToClipboard(part.text)"
                      class="p-1 rounded-md transition-all shrink-0 focus:outline-none"
                      :class="msg.senderId === myId 
                        ? 'text-primary-foreground/70 hover:bg-white/10 hover:text-white' 
                        : 'text-primary hover:bg-primary/10'"
                    >
                      <Check v-if="copiedLink === part.text" class="w-3.5 h-3.5" />
                      <Copy v-else class="w-3.5 h-3.5" />
                    </button>
                    <span 
                      @click="copyToClipboard(part.text)" 
                      class="underline decoration-current/30 underline-offset-4 transition-all font-bold cursor-pointer select-none"
                      :class="[
                        msg.senderId === myId ? 'hover:text-white' : 'hover:text-primary',
                        copiedLink === part.text ? (msg.senderId === myId ? 'text-white' : 'text-green-500') : ''
                      ]"
                    >
                      {{ part.text }}
                    </span>
                  </span>
                  <span v-else>{{ part.text }}</span>
                </template>
              </div>

              <!-- Время отправки -->
              <div 
                class="flex items-center justify-end mt-1 text-[9px] font-bold opacity-50 uppercase tracking-tighter"
              >
                {{ new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Панель ввода -->
        <div class="p-4 bg-muted/40 border-t backdrop-blur-xl">
          <form @submit.prevent="onSendMessage" class="flex items-center gap-2">
            <Input 
              v-model="newMessage" 
              placeholder="Напишите сообщение..." 
              class="flex-1 h-12 rounded-xl border-none bg-background/60 shadow-inner focus-visible:ring-1 focus-visible:ring-primary/30 transition-all text-sm px-4" 
            />
            <Button 
              type="submit" 
              size="icon" 
              class="h-12 w-12 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center"
              :disabled="!newMessage.trim()"
            >
              <Send class="w-5 h-5" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
