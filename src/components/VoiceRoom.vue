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
  isConnected,
  roomFull,
  error,
  join,
  leave,
  toggleMute,
  toggleVideo,
  myStream,
  resumeAudioContextIfNeeded,
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
const vStream = {
  mounted(el: HTMLVideoElement, binding: DirectiveBinding<MediaStream | undefined | null>) {
    if (binding.value) el.srcObject = binding.value
  },
  updated(el: HTMLVideoElement, binding: DirectiveBinding<MediaStream | undefined | null>) {
    if (el.srcObject !== binding.value) {
      el.srcObject = binding.value ?? null
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
          <Button :variant="isVideoEnabled ? 'secondary' : 'outline'" @click="toggleVideo">
            {{ isVideoEnabled ? 'Выключить камеру' : 'Включить камеру' }}
          </Button>
          <Button :variant="isMuted ? 'destructive' : 'secondary'" @click="toggleMute">
            {{ isMuted ? 'Включить микрофон' : 'Выключить микрофон' }}
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
        <p v-if="participants.length > 0" class="text-muted-foreground text-sm mt-2">
          Нет звука на телефоне? Нажмите
          <Button variant="link" size="sm" class="p-0 h-auto inline" @click="resumeAudioContextIfNeeded">
            «Включить звук»
          </Button>
        </p>
      </CardContent>
    </Card>

    <Card v-if="isVideoEnabled || participants.some(p => p.stream && p.stream.getVideoTracks().length)">
      <CardHeader>
        <CardTitle>Видеочат</CardTitle>
      </CardHeader>
      <CardContent class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Я -->
        <div v-if="isVideoEnabled && myStream" class="relative group rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
          <video v-stream="myStream" autoplay playsinline muted class="w-full h-full object-cover"></video>
          <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Вы</div>
        </div>
        <!-- Другие -->
        <template v-for="p in participants" :key="p.id">
          <div v-if="p.stream && p.stream.getVideoTracks().length" class="relative group rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video v-stream="p.stream" autoplay playsinline class="w-full h-full object-cover"></video>
            <div class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{{ p.userName }}</div>
          </div>
        </template>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Участники — громкость</CardTitle>
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
