<script setup lang="ts">
// 保留原有入口地址；三个入口复用同一主界面，底栏切换不再创建微信页面。
import GaMainHome from "@/components/GaMainHome.vue";
</script>
<template><GaMainHome initial-tab="tools" /></template>
