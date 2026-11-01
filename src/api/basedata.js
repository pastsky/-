import request from '@/utils/request'

export function getCommunities() {
  return request.get('/communities')
}

export function getElevators(params) {
  return request.get('/elevators', { params })
}

export function getDutySchedules(params) {
  return request.get('/duty-schedules', { params })
}
