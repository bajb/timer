import { Volume2, VolumeX, Smartphone, Info } from 'lucide-react'
import { useTimerStore } from '../stores/timerStore'

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
