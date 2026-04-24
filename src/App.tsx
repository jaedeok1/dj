import { useDJStore } from './store/djStore'
import { CalibrationScreen } from './components/CalibrationScreen'
import { TutorialScreen } from './components/TutorialScreen'
import { MainDJScreen } from './components/MainDJScreen'

export default function App() {
  const { screen } = useDJStore()

  if (screen === 'calibration') return <CalibrationScreen />
  if (screen === 'tutorial') return <TutorialScreen />
  return <MainDJScreen />
}
