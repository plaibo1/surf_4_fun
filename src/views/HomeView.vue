<script setup lang="ts">
import { ref } from 'vue'
import VoiceRoom from '@/components/VoiceRoom.vue'
import JoinForm from '@/components/JoinForm.vue'

const inRoom = ref(false)
const pendingRoomId = ref('')
const pendingUserName = ref('')

function onJoined(roomId: string, userName: string) {
  pendingRoomId.value = roomId.toLowerCase()
  pendingUserName.value = userName
  inRoom.value = true
  
  const url = new URL(window.location.href)
  url.searchParams.set('room', pendingRoomId.value)
  window.history.pushState({}, '', url)
}

function onLeave() {
  inRoom.value = false
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  window.history.pushState({}, '', url)
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-2 py-6 sm:p-4">
    <JoinForm v-if="!inRoom" @joined="onJoined" />
    <VoiceRoom
      v-else
      :room-id="pendingRoomId"
      :user-name="pendingUserName"
      @leave="onLeave"
    />
  </div>
</template>
