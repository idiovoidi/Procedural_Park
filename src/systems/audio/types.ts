export interface AudioSettings {
  masterVolume: number
  sfxVolume: number
  ambientVolume: number
  musicVolume: number
  enabled: boolean
}

export type SoundEffect =
  | 'camera_shutter'
  | 'camera_focus'
  | 'ui_click'
  | 'ui_hover'
  | 'creature_chirp'
  | 'creature_growl'
  | 'creature_flutter'
  | 'creature_splash'
  | 'photo_score'
  | 'ride_move'

export type AmbientSound = 'forest_ambient' | 'wind_gentle' | 'water_flowing' | 'birds_distant'
