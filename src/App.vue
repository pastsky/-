<template>
  <router-view />
  <Toaster
    position="top-right"
    :visible-toasts="5"
    :duration="2600"
    rich-colors
    close-button
    :offset="16"
  />
</template>

<script setup>
import { Toaster } from 'vue-sonner'
</script>
