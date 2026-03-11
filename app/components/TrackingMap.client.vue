<template>
  <div ref="mapContainer" style="height: 100%; width: 100%;"></div>
</template>

<script setup>
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  points: { type: Array, default: () => [] },
  center: { type: Array, default: () => [25.033, 121.565] },
  zoom: { type: Number, default: 13 },
})

const mapContainer = ref(null)
let map = null
let polyline = null
let startMarker = null
let endMarker = null

onMounted(() => {
  map = L.map(mapContainer.value, {
    center: props.center,
    zoom: props.zoom,
    attributionControl: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  }).addTo(map)

  updateTrack()
})

watch(() => props.points, () => {
  updateTrack()
}, { deep: true })

function updateTrack() {
  if (!map) return

  // 清除舊的
  if (polyline) map.removeLayer(polyline)
  if (startMarker) map.removeLayer(startMarker)
  if (endMarker) map.removeLayer(endMarker)

  if (props.points.length === 0) return

  // 軌跡線
  polyline = L.polyline(props.points, {
    color: '#E31937',
    weight: 3,
    opacity: 0.8,
  }).addTo(map)

  // 起點
  startMarker = L.circleMarker(props.points[0], {
    radius: 6,
    color: '#22c55e',
    fillColor: '#22c55e',
    fillOpacity: 1,
  }).addTo(map)

  // 終點
  endMarker = L.circleMarker(props.points[props.points.length - 1], {
    radius: 6,
    color: '#E31937',
    fillColor: '#E31937',
    fillOpacity: 1,
  }).addTo(map)

  // 自動縮放到軌跡範圍
  map.fitBounds(polyline.getBounds(), { padding: [30, 30] })
}

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>
