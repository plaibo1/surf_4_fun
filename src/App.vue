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
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4">
    <JoinForm v-if="!inRoom" @joined="onJoined" />
    <VoiceRoom
      v-else
      :room-id="pendingRoomId"
      :user-name="pendingUserName"
      @leave="inRoom = false"
    />
  </div>
</template>
