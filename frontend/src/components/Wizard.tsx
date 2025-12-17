import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ProgressStepper from './ProgressStepper'
import NavigationButtons from './NavigationButtons'
import Screen1Ridicare from './screens/Screen1Ridicare'
import Screen2Sortiment from './screens/Screen2Sortiment'
import Screen3Decor from './screens/Screen3Decor'
import Screen4Finalizare from './screens/Screen4Finalizare'
import { useOrder } from '../context/OrderContext'

type WizardProps = {
  onLogout?: () => void
}

function Wizard({ onLogout }: WizardProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStep = parseInt(searchParams.get('step') || '1')
  const [currentStep, setCurrentStep] = useState(initialStep)
  const isEditingFromReview = searchParams.get('edit') === '1'
  const { validateStep, order } = useOrder()
  const username = localStorage.getItem('authToken')

  useEffect(() => {
    const stepParam = searchParams.get('step')
    if (stepParam) {
      setCurrentStep(parseInt(stepParam))
    }
  }, [searchParams])

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      // Skip step 3 (decoration) if noCake is true
      let newStep = currentStep + 1
      if (currentStep === 2 && order.noCake) {
        newStep = 4 // Skip to finalization
      }
      setCurrentStep(newStep)
      setSearchParams(
        isEditingFromReview
          ? { step: newStep.toString(), edit: '1' }
          : { step: newStep.toString() }
      )
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      // Skip step 3 (decoration) when going back if noCake is true
      let newStep = currentStep - 1
      if (currentStep === 4 && order.noCake) {
        newStep = 2 // Skip back to sortiment
      }
      setCurrentStep(newStep)
      setSearchParams(
        isEditingFromReview
          ? { step: newStep.toString(), edit: '1' }
          : { step: newStep.toString() }
      )
    }
  }

  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step)
      setSearchParams(
        isEditingFromReview
          ? { step: step.toString(), edit: '1' }
          : { step: step.toString() }
      )
    }
  }

  const handleFinishEdit = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(4)
      setSearchParams({ step: '4' })
    }
  }

  const handleLogout = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    // Call parent logout handler to update App state
    onLogout?.()
    // Navigate to login - the route guard will handle redirect if needed
    navigate('/login', { replace: true })
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
          isEditMode={isEditingFromReview && currentStep !== 4}
          onFinishEdit={handleFinishEdit}
        />
      </div>

      {username && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-secondary/60 text-xs z-50">
          <span>Logged in as {username}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="underline hover:text-secondary transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default Wizard

