import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProgressStepper from './ProgressStepper'
import NavigationButtons from './NavigationButtons'
import Screen1Ridicare from './screens/Screen1Ridicare'
import Screen2Sortiment from './screens/Screen2Sortiment'
import Screen3Decor from './screens/Screen3Decor'
import Screen4Finalizare from './screens/Screen4Finalizare'
import { useOrder } from '../context/OrderContext'

function Wizard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStep = parseInt(searchParams.get('step') || '1')
  const [currentStep, setCurrentStep] = useState(initialStep)
  const { validateStep } = useOrder()

  useEffect(() => {
    const stepParam = searchParams.get('step')
    if (stepParam) {
      setCurrentStep(parseInt(stepParam))
    }
  }, [searchParams])

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      setSearchParams({ step: newStep.toString() })
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      setSearchParams({ step: newStep.toString() })
    }
  }

  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step)
      setSearchParams({ step: step.toString() })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary">
      <div className="absolute top-20 right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <ProgressStepper 
          currentStep={currentStep} 
          onStepClick={handleStepClick}
        />
        
        <div className="mt-8">
          {currentStep === 1 && <Screen1Ridicare />}
          {currentStep === 2 && <Screen2Sortiment />}
          {currentStep === 3 && <Screen3Decor />}
          {currentStep === 4 && <Screen4Finalizare />}
        </div>

        <NavigationButtons
          currentStep={currentStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canProceed={validateStep(currentStep)}
        />
      </div>
    </div>
  )
}

export default Wizard

