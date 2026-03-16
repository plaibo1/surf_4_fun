<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useVoiceRoom } from '@/composables/useVoiceRoom'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Slider from '@/components/ui/slider/Slider.vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import type { DirectiveBinding } from 'vue'
import { Ear, Mic, MicOff, Send, Copy, Check, Headphones, LogOut, Video, VideoOff, Monitor, MonitorOff, Share2, MessageSquare, Ghost, Scan, LayoutGrid, LayoutList, Star } from 'lucide-vue-next'
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
  join,
  leave,
  toggleMute,
  toggleTotalMute,
  toggleVideo,
  toggleScreenShare,
  myStream,
  isLocalSpeaking,
  localAudioLevel,
  volumeKing,

  isNoiseSuppressionEnabled,
  toggleNoiseSuppression,
  messages,
  sendMessage,
} = useVoiceRoom()

const hasStreams = computed(() =>
  (myStream.value?.getVideoTracks()?.length ?? 0) > 0 ||
  participants.value.some(p => (p.stream?.getVideoTracks()?.length ?? 0) > 0)
)

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

const createStream = (track: MediaStreamTrack) => {
  const s = new MediaStream()
  s.addTrack(track)
  return s
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
  <div class="w-full mx-auto flex flex-col gap-6 p-4 transition-all duration-700"
    :class="hasStreams ? 'max-w-[1600px] xl:flex-row' : 'max-w-2xl items-center'">
    <!-- Левая колонка: Управление и Чат -->
    <div class="w-full space-y-6 shrink-0 transition-all duration-700"
      :class="hasStreams ? 'xl:w-[550px] order-2 xl:order-1' : ''">
      <!-- Главная панель комнаты -->
      <Card class="overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-muted/30">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>

        <CardHeader class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              <CardTitle class="text-2xl font-black tracking-tighter text-foreground uppercase truncate max-w-[200px]">
                {{ roomId }}
              </CardTitle>
              <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg hover:bg-primary/10 transition-all"
                @click="copyToClipboard(roomId)">
                <Check v-if="copiedLink === roomId" class="h-4 w-4 text-green-500" />
                <Copy v-else class="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg hover:bg-yellow-500/10 transition-all group/star"
                @click="toggleFavorite(roomId)">
                <Star class="h-4 w-4 transition-all" :class="isFavorite(roomId) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground group-hover/star:text-yellow-500'" />
              </Button>

              <div
                class="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20">
                Voice Room
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex -space-x-2 mr-2">
              <div v-for="p in participants.slice(0, 3)" :key="p.id"
                class="w-8 h-8 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                {{ p.userName.charAt(0).toUpperCase() }}
              </div>
              <div v-if="participants.length > 3"
                class="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
                +{{ participants.length - 3 }}
              </div>
            </div>
            <span class="text-sm font-semibold mr-4 text-foreground">{{ participants.length + 1 }} в сети</span>
          </div>
        </CardHeader>

        <CardContent class="space-y-4">
          <div class="grid grid-cols-2 gap-2">
            <Button :variant="isScreenSharing ? 'secondary' : 'outline'"
              class="w-full gap-2 border-primary/10 hover:border-primary/30" @click="toggleScreenShare">
              <Monitor v-if="!isScreenSharing" class="h-4 w-4" />
              <MonitorOff v-else class="h-4 w-4" />
              <span class="text-xs">{{ isScreenSharing ? 'Стоп экран' : 'Экран' }}</span>
            </Button>
            <Button :variant="isVideoEnabled ? 'secondary' : 'outline'"
              class="w-full gap-2 border-primary/10 hover:border-primary/30" @click="toggleVideo">
              <Video v-if="!isVideoEnabled" class="h-4 w-4" />
              <VideoOff v-else class="h-4 w-4" />
              <span class="text-xs">{{ isVideoEnabled ? 'Выкл камеру' : 'Камера' }}</span>
            </Button>
            <Button variant="outline" class="w-full gap-2 border-primary/10 hover:border-primary/30 transition-all"
              :class="{ 'border-green-500/50 bg-green-500/5 text-green-600': copiedLink === currentUrl }"
              @click="copyToClipboard(currentUrl)">
              <Check v-if="copiedLink === currentUrl" class="h-4 w-4" />
              <Share2 v-else class="h-4 w-4" />
              <span class="text-xs">
                {{ copiedLink === currentUrl ? 'Скопировано!' : 'Пригласить' }}
              </span>
            </Button>
            <Button variant="destructive" class="w-full gap-2 shadow-lg shadow-destructive/10" @click="onLeave">
              <LogOut class="h-4 w-4" />
              <span class="text-xs">Выйти</span>
            </Button>
          </div>

          <p v-if="error"
            class="text-destructive text-xs font-medium text-center bg-destructive/10 py-2 rounded-md border border-destructive/20">
            {{ error }}</p>
          <p v-if="roomFull"
            class="text-destructive text-xs font-medium text-center bg-destructive/10 py-2 rounded-md border border-destructive/20">
            В комнате уже 5 человек.</p>

          <div v-if="volumeKing"
            class="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between shadow-inner">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div
                  class="w-10 h-10 rounded-full bg-yellow-500 text-yellow-950 flex items-center justify-center text-lg font-black shadow-lg shadow-yellow-500/20">
                  {{ volumeKing.name.charAt(0).toUpperCase() }}
                </div>
                <div class="absolute -top-4 -right-2 text-2xl drop-shadow-md">👑</div>
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

      <!-- Моя карточка -->
      <Card class="border-primary/30 bg-primary/5 shadow-lg shadow-primary/5 relative overflow-hidden">
        <CardContent class="p-4 flex flex-col items-center justify-between gap-6 relative z-10">
          <div class="flex items-center gap-6 w-full">
            <div class="relative group">
              <div
                class="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 transition-all duration-75 shadow-2xl overflow-hidden"
                :class="isLocalSpeaking ? 'bg-primary text-primary-foreground ring-4 ring-green-500/30' : 'bg-primary/20 text-primary'"
                :style="{ transform: `scale(${1 + localAudioLevel * 0.15})` }">
                {{ userName.charAt(0).toUpperCase() }}
                <!-- Анимация волн когда говоришь -->
                <span v-if="isLocalSpeaking"
                  class="absolute -inset-1 rounded-2xl border-2 border-green-500 animate-ping opacity-20"></span>
              </div>
              <div
                class="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background shadow-lg transition-colors duration-300"
                :class="isMuted ? 'bg-destructive' : 'bg-green-500'">
                <MicOff v-if="isMuted" class="h-3.5 w-3.5 text-white" />
                <Mic v-else class="h-3.5 w-3.5 text-white" />
              </div>
            </div>

            <div class="flex-1 overflow-hidden">
              <div class="flex items-center gap-2">
                <h3 class="font-black text-xl truncate tracking-tight text-foreground">{{ userName }}</h3>
                <span
                  class="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Вы</span>
              </div>
              <p class="text-sm font-medium flex items-center gap-2 mt-0.5">
                <span v-if="isMuted" class="text-destructive flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-destructive"></span>
                  Микрофон выключен
                </span>
                <span v-else class="text-green-500 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Вас слышно
                </span>
              </p>
            </div>

            <div
              class="flex items-center gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-2xl border border-primary/10 shadow-inner">
              <Button :variant="isNoiseSuppressionEnabled ? 'success' : 'ghost'" size="icon"
                @click="toggleNoiseSuppression"
                class="h-11 w-11 rounded-xl transition-all hover:scale-105 active:scale-95" title="Подавление шума">
                <Ear class="h-5 w-5" />
              </Button>
              <div class="h-8 w-[1px] bg-border/50 mx-1"></div>
              <Button :variant="isTotalMuted ? 'destructive' : 'ghost'" @click="toggleTotalMute" size="icon"
                class="h-11 w-11 rounded-xl transition-all hover:scale-105 active:scale-95 group relative overflow-hidden"
                title="Тотальный мут">
                <div v-if="isTotalMuted" class="relative z-10 flex items-center justify-center">
                  <Headphones class="h-5 w-5" />
                  <div class="absolute w-[22px] h-[2px] bg-white rotate-45 shadow-sm rounded-full"></div>
                </div>
                <Headphones v-else class="h-5 w-5" />
              </Button>
              <Button :variant="isMuted ? 'destructive' : 'default'" @click="toggleMute" size="icon"
                class="h-11 w-11 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                title="Микрофон">
                <MicOff v-if="isMuted" class="h-5 w-5" />
                <Mic v-else class="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Участники -->
      <Card class="border-none shadow-xl">
        <CardHeader class="pb-2">
          <CardTitle class="text-lg font-black uppercase tracking-tight">Участники</CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div v-for="p in participants" :key="p.id"
            class="flex items-center gap-6 rounded-xl border border-primary/5 bg-muted/20 p-3 transition-all hover:bg-muted/30">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-all duration-75 relative"
              :class="p.isSpeaking ? 'bg-primary text-primary-foreground ring-2 ring-green-500' : 'bg-muted text-muted-foreground'"
              :style="{ transform: `scale(${1 + p.audioLevel * 0.2})` }">
              {{ p.userName.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-sm truncate">{{ p.userName }}</p>
              <div class="flex items-center gap-2 mt-1">
                <Slider :model-value="[getVolume(p.id)]" :min="0" :max="100" :step="1" class="flex-1 h-1"
                  @update:model-value="(v) => setVolume(p.id, v?.[0] ?? 100)" />
                <span class="text-[10px] font-mono text-muted-foreground w-8 text-right">{{ getVolume(p.id) }}%</span>
              </div>
            </div>
          </div>
          <div v-if="participants.length === 0"
            class="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-700">
            <div class="relative">
              <div class="absolute inset-0 bg-primary/10 blur-2xl rounded-full"></div>
              <div
                class="relative w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 shadow-inner">
                <Ghost class="h-8 w-8 text-primary/30" />
              </div>
            </div>

            <div class="space-y-1 max-w-[240px]">
              <h3 class="font-black text-sm uppercase tracking-tighter text-foreground italic">В комнате пусто</h3>
              <p class="text-[11px] font-medium text-muted-foreground leading-relaxed">
                Вы единственный участник. Позовите друзей!
              </p>
            </div>

            <Button variant="outline"
              class="rounded-xl px-6 h-10 gap-2 border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-95"
              @click="copyToClipboard(currentUrl)">
              <span class="text-[10px] font-bold uppercase tracking-widest">
                {{ copiedLink === currentUrl ? 'Ссылка у вас!' : 'Пригласить' }}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Чат -->
      <Card
        class="border-none shadow-2xl bg-gradient-to-br from-card to-muted/20 overflow-hidden flex flex-col h-[400px]">
        <CardHeader class="border-b bg-muted/30 pb-3">
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-primary/10 text-primary">
                <MessageSquare class="h-4 w-4" />
              </div>
              <CardTitle class="text-lg font-black tracking-tight">Чат</CardTitle>
            </div>
            <div
              class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {{ messages.length }} msg
            </div>
          </div>
        </CardHeader>
        <CardContent class="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            <div v-if="messages.length === 0"
              class="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <MessageSquare class="h-8 w-8" />
              <p class="text-xs font-bold uppercase">Пусто</p>
            </div>
            <div v-for="msg in messages" :key="msg.id"
              class="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300"
              :class="msg.senderId === myId ? 'items-end' : 'items-start'">
              <span v-if="msg.senderId !== myId"
                class="text-[9px] font-black uppercase tracking-wider text-muted-foreground ml-2 mb-1">{{ msg.senderName
                }}</span>
              <div class="group relative max-w-[90%] px-3 py-2 rounded-2xl shadow-sm transition-all"
                :class="msg.senderId === myId ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-card border border-border/50 text-foreground rounded-tl-none'">
                <div class="text-xs font-medium leading-relaxed whitespace-pre-wrap">
                  <template v-for="part in parseMessage(msg.text)" :key="part.id">
                    <span v-if="part.isLink" 
                      class="inline-flex items-center gap-1.5 align-middle bg-black/10 dark:bg-white/5 px-1.5 py-0.5 rounded-lg cursor-pointer group/link transition-all hover:bg-black/20 dark:hover:bg-white/10 active:scale-95"
                      @click="copyToClipboard(part.text)">
                      <Check v-if="copiedLink === part.text" class="h-3 w-3 text-green-400 shrink-0" />
                      <Copy v-else class="h-3 w-3 opacity-40 group-hover/link:opacity-100 transition-opacity shrink-0" />
                      <span
                        class="underline underline-offset-2 transition-all font-bold select-none truncate max-w-[180px]"
                        :class="msg.senderId === myId ? 'text-white' : 'text-primary'">{{ part.text }}</span>
                    </span>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </div>
                <div class="text-right mt-1 text-[8px] font-bold opacity-50">{{ new
                  Date(msg.timestamp).toLocaleTimeString([], {
                    hour:
                      '2-digit', minute: '2-digit'
                  }) }}</div>
              </div>
            </div>
          </div>
          <div class="p-3 bg-muted/40 border-t backdrop-blur-xl">
            <form @submit.prevent="onSendMessage" class="flex items-center gap-2">
              <Input v-model="newMessage" placeholder="Сообщение..."
                class="flex-1 h-10 rounded-xl border-none bg-background/60 shadow-inner text-xs px-3" />
              <Button type="submit" size="icon" class="h-10 w-10 rounded-xl" :disabled="!newMessage.trim()">
                <Send class="w-4 h-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Правая колонка: Видеопотоки (только если есть стримы) -->
    <div v-if="hasStreams"
      class="flex-1 min-w-0 order-1 xl:order-2 space-y-6 animate-in slide-in-from-right-10 duration-700">
      <Card class="border-none bg-black/5 dark:bg-white/5 shadow-2xl overflow-hidden h-fit">
        <CardHeader class="flex flex-row items-center justify-between border-b border-primary/5 pb-4">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-red-500"></div>
            <CardTitle class="text-xl font-black uppercase tracking-tighter">Live Streams</CardTitle>
          </div>

          <div class="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
            <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg transition-all"
              :class="{ 'bg-background shadow-sm text-primary': viewMode === 'grid' }" @click="viewMode = 'grid'">
              <LayoutGrid class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" class="h-8 w-8 rounded-lg transition-all"
              :class="{ 'bg-background shadow-sm text-primary': viewMode === 'row' }" @click="viewMode = 'row'">
              <LayoutList class="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent class="p-4 transition-all duration-500"
          :class="viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-4'">
          <!-- Видеопотоки -->
          <template v-if="myStream">
            <div v-for="track in myStream.getVideoTracks()" :key="track.id"
              class="relative group rounded-2xl overflow-hidden bg-zinc-900 aspect-video border-2 transition-all duration-500"
              :class="isLocalSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-primary/10'"
              @dblclick="toggleFullscreen">
              <video v-stream="createStream(track)" autoplay playsinline muted
                class="w-full h-full object-cover scale-[1.01] transition-all duration-700"></video>
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-60 group-hover:opacity-100 transition-opacity">
              </div>
              <div class="absolute top-3 left-3 flex items-center gap-2">
                <div
                  class="bg-primary/20 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                  <span class="text-[9px] font-black text-white uppercase tracking-tighter">You</span>
                </div>
              </div>
              <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div
                  class="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl">
                  <span class="text-xs font-bold text-white truncate max-w-[100px]">{{ userName }}</span>
                  <div class="flex items-center gap-1 border-l border-white/20 pl-2 ml-1">
                    <MicOff v-if="isMuted" class="h-3 w-3 text-red-400" />
                    <Mic v-else class="h-3 w-3 text-green-400" />
                  </div>
                </div>
                <button @click.stop="toggleFullscreen"
                  class="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <Scan class="w-4 h-4" />
                </button>
              </div>
            </div>
          </template>

          <template v-for="p in participants" :key="p.id">
            <template v-if="p.stream">
              <div v-for="track in p.stream.getVideoTracks()" :key="track.id"
                class="relative group rounded-2xl overflow-hidden bg-zinc-900 aspect-video border-2 transition-all duration-500"
                :class="p.isSpeaking ? 'border-green-500 ring-4 ring-green-500/20' : 'border-white/5'"
                @dblclick="toggleFullscreen">
                <video v-stream="createStream(track)" autoplay playsinline
                  class="w-full h-full object-cover scale-[1.01] transition-all duration-700"></video>
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-40 group-hover:opacity-90 transition-opacity">
                </div>
                <div class="absolute top-3 left-3">
                  <div
                    class="bg-red-500/20 backdrop-blur-md border border-red-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                    <div class="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div><span
                      class="text-[9px] font-black text-white uppercase tracking-tighter">Live</span>
                  </div>
                </div>
                <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div
                    class="flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-xl shadow-2xl">
                    <span class="text-xs font-bold text-white truncate max-w-[120px]">{{ p.userName }}</span>
                    <div class="flex items-center border-l border-white/20 pl-2 ml-1">
                      <Monitor
                        v-if="track.label.toLowerCase().includes('screen') || track.label.toLowerCase().includes('window')"
                        class="h-3 w-3 text-primary" />
                      <Video v-else class="h-3 w-3 text-white/60" />
                    </div>
                  </div>
                  <button @click.stop="toggleFullscreen"
                    class="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Scan class="w-4 h-4" />
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
