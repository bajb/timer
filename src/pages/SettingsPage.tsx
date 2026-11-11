import { Volume2, VolumeX, Smartphone, Info, Hourglass, Megaphone } from 'lucide-react'
import { useTimerStore } from '../stores/timerStore'
import { SOUND_PROFILES, previewSound } from '../hooks/useAudio'
import { cn } from '../lib/utils'

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        enabled ? 'bg-primary-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : ''
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const audioEnabled = useTimerStore((s) => s.audioEnabled)
  const vibrationEnabled = useTimerStore((s) => s.vibrationEnabled)
  const setAudioEnabled = useTimerStore((s) => s.setAudioEnabled)
  const setVibrationEnabled = useTimerStore((s) => s.setVibrationEnabled)
  const soundProfile = useTimerStore((s) => s.soundProfile)
  const setSoundProfile = useTimerStore((s) => s.setSoundProfile)
  const startCountdown = useTimerStore((s) => s.startCountdown)
  const setStartCountdown = useTimerStore((s) => s.setStartCountdown)

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Timer Settings */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Timer
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {audioEnabled ? (
                  <Volume2 size={18} className="text-gray-500" />
                ) : (
                  <VolumeX size={18} className="text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium">Audio Cues</p>
                  <p className="text-xs text-gray-500">Countdown beeps and phase transitions</p>
                </div>
              </div>
              <Toggle
                enabled={audioEnabled}
                onToggle={() => setAudioEnabled(!audioEnabled)}
              />
            </div>
            {audioEnabled && (
              <div className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Megaphone size={18} className="text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Sound</p>
                    <p className="text-xs text-gray-500">Tap to choose and hear a preview</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SOUND_PROFILES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => {
                        setSoundProfile(p.value)
                        previewSound(p.value)
                      }}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-left transition-colors',
                        soundProfile === p.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-[11px] leading-tight text-gray-500">{p.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Hourglass size={18} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Get Ready</p>
                  <p className="text-xs text-gray-500">Countdown before each set starts</p>
                </div>
              </div>
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {([3, 5] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStartCountdown(s)}
                    className={cn(
                      'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                      startCountdown === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
                    )}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Vibration</p>
                  <p className="text-xs text-gray-500">Haptic feedback on phase changes</p>
                </div>
              </div>
              <Toggle
                enabled={vibrationEnabled}
                onToggle={() => setVibrationEnabled(!vibrationEnabled)}
              />
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            About
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <Info size={18} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium">FitTrack</p>
                <p className="text-xs text-gray-500">
                  Personal trainer PWA &middot; All data stored locally
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
