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
import { Ear, Maximize, Mic, MicOff, Send, Copy, Check, Headphones, LogOut, Video, VideoOff, Monitor, MonitorOff, Share2 } from 'lucide-vue-next'


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

    <!-- Чат -->
    <Card>
      <CardHeader>
        <CardTitle>Чат</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-col h-80">
        <div ref="messagesContainer" class="flex-1 overflow-y-auto space-y-3 mb-4 p-3 border rounded-md bg-muted/10">
          <div v-for="msg in messages" :key="msg.id" class="flex flex-col">
            <span class="text-xs font-semibold text-muted-foreground mb-1" 
                  :class="{'text-right': msg.senderId === myId}">
              {{ msg.senderName }} <span v-if="msg.senderId === myId">(Вы)</span>
            </span>
            <div class="text-sm p-2.5 rounded-lg w-fit max-w-[85%] break-words shadow-sm whitespace-pre-wrap"
                 :class="msg.senderId === myId 
                    ? 'bg-primary text-primary-foreground self-end rounded-br-none' 
                    : 'bg-background border rounded-bl-none'">
              <template v-for="part in parseMessage(msg.text)" :key="part.id">
                <span v-if="part.isLink" class="inline-flex items-center gap-1 align-bottom">
                  <button 
                    @click="copyToClipboard(part.text)"
                    class="p-0.5 rounded-md transition-colors text-muted-foreground hover:bg-muted/50 hover:text-foreground shrink-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    :title="copiedLink === part.text ? 'Скопировано!' : 'Скопировать'"
                  >
                    <Check v-if="copiedLink === part.text" class="w-3.5 h-3.5 text-green-500" />
                    <Copy v-else class="w-3.5 h-3.5" />
                  </button>
                  <span 
                        @click="copyToClipboard(part.text)" 
                        class="underline cursor-pointer transition-colors relative"
                        :class="(copiedLink === part.text) ? 'text-green-500 dark:text-green-400' : 'hover:opacity-80 font-medium'"
                        :title="copiedLink === part.text ? 'Ссылка скопирована!' : 'Скопировать ссылку'">
                    {{ part.text }}
                  </span>
                </span>
                <span v-else>{{ part.text }}</span>
              </template>
            </div>
          </div>
          <p v-if="messages.length === 0" class="text-muted-foreground text-sm text-center mt-10">
            Нет сообщений. Напишите первым!
          </p>
        </div>
        <form @submit.prevent="onSendMessage" class="flex gap-2 shrink-0">
          <Input v-model="newMessage" placeholder="Введите сообщение..." class="flex-1" />
          <Button type="submit" size="icon" :disabled="!newMessage.trim()">
            <Send class="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
