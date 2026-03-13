<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Card from '@/components/ui/card/Card.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import CardContent from '@/components/ui/card/CardContent.vue'

const roomId = ref('')
const userName = ref('')
const emit = defineEmits<{ joined: [roomId: string, userName: string] }>()

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room')
  if (room) {
    roomId.value = room
  }
  
  const savedName = localStorage.getItem('surf4fun_username')
  if (savedName) {
    userName.value = savedName
  }

  // Auto-connect if both are present
  if (roomId.value && userName.value) {
    onSubmit()
  }
})

function onSubmit() {
  if (!roomId.value.trim() || !userName.value.trim()) return
  
  const finalName = userName.value.trim()
  localStorage.setItem('surf4fun_username', finalName)
  
  emit('joined', roomId.value.trim(), finalName)
}
</script>

<template>
  <Card class="w-full max-w-md">
    <CardHeader>
      <CardTitle class="text-2xl">Мини Discord — войти в комнату</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <label class="text-sm font-medium text-muted-foreground">Имя</label>
        <Input v-model="userName" placeholder="Ваше имя" />
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium text-muted-foreground">ID комнаты</label>
        <Input v-model="roomId" placeholder="Например: room-1" />
      </div>
      <p class="text-xs text-muted-foreground">
        Одновременно в комнате может быть до 5 человек.
      </p>
      <Button class="w-full" size="lg" @click="onSubmit">
        Войти
      </Button>
    </CardContent>
  </Card>
</template>
