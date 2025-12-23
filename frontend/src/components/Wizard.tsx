import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ProgressStepper from './ProgressStepper'
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
  const { validateStep, order, resetOrder, updateOrder } = useOrder()
  const username = localStorage.getItem('authToken')
  const [showResetModal, setShowResetModal] = useState(false)

  useEffect(() => {
    const stepParam = searchParams.get('step')
    if (stepParam) {
      setCurrentStep(parseInt(stepParam))
    }
  }, [searchParams])

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

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

  const handleTrimiteInventar = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    navigate('/inventory')
  }

  const handleResetOrder = () => {
    setShowResetModal(true)
  }

  const handleConfirmReset = () => {
    // Clear the upload session ID to stop photo polling
    localStorage.removeItem('currentUploadSession')
    
    // Dispatch event to signal session cleared (so Screen3Decor can stop polling)
    window.dispatchEvent(new CustomEvent('uploadSessionCleared'))
    
    // Explicitly clear photos first, then reset the order
    updateOrder({ photos: [], foaieDeZaharPhoto: null })
    
    // Reset the order (clears all order data)
    resetOrder()
    
    // Navigate back to step 1
    setCurrentStep(1)
    setSearchParams({ step: '1' })
    setShowResetModal(false)
  }

  const handleCancelReset = () => {
    setShowResetModal(false)
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
        
        <div className="max-w-6xl mx-auto">

          {/* Desktop Layout */}
          <div className="hidden md:flex justify-between items-center mt-12 gap-4">
            {/* Back button - desktop */}
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                currentStep === 1
                  ? 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
                  : 'btn-neumorphic text-secondary hover:scale-105'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              ÎNAPOI
            </button>

            <div className="flex items-center gap-3 justify-center flex-1">
              {!isEditingFromReview && (
                <button
                  type="button"
                  onClick={handleTrimiteInventar}
                  className="w-12 h-12 rounded-full bg-purple-100/90 hover:bg-purple-200/90 transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg border border-purple-200/50"
                  title="Trimite inventar"
                >
                  <svg className="w-6 h-6 text-secondary/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              )}
              
              {username && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetOrder}
                    className="w-12 h-12 rounded-full bg-rose-500/90 hover:bg-rose-600/90 transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg border border-rose-400/50"
                    title="Reluare comandă"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/my-orders')}
                    className="px-4 py-2 rounded-xl bg-primary/50 hover:bg-primary/70 text-secondary font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg border border-secondary/20"
                    title="Istoric comenzi"
                  >
                    ISTORIC COMENZI
                  </button>
                </div>
              )}
            </div>

            {isEditingFromReview && currentStep !== 4 ? (
              <button
                onClick={handleFinishEdit}
                disabled={!validateStep(currentStep)}
                className={`px-12 py-5 rounded-2xl font-bold text-2xl transition-all duration-300 ${
                  validateStep(currentStep)
                    ? 'btn-active hover:scale-105 shadow-glow-purple'
                    : 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
                }`}
              >
                GATA!
              </button>
            ) : currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                  validateStep(currentStep)
                    ? 'btn-active hover:scale-105'
                    : 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
                }`}
              >
                URMĂTORUL
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div></div>
            )}
          </div>

          {/* Desktop Logout Row */}
          {username && (
            <div className="hidden md:flex items-center justify-center gap-2 mt-4 text-secondary/60 text-xs">
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

          {/* Mobile Layout */}
          <div className="md:hidden mt-12 space-y-4">
            {/* Row 1: Previous and Next buttons */}
            <div className="flex justify-between items-center gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all duration-300 flex-1 ${
                  currentStep === 1
                    ? 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
                    : 'btn-neumorphic text-secondary hover:scale-105'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                ÎNAPOI
              </button>

              {isEditingFromReview && currentStep !== 4 ? (
                <button
                  onClick={handleFinishEdit}
                  disabled={!validateStep(currentStep)}
                  className={`px-6 py-3 rounded-2xl font-bold text-base transition-all duration-300 flex-1 ${
                    validateStep(currentStep)
                      ? 'btn-active hover:scale-105 shadow-glow-purple'
                      : 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
                  }`}
                >
                  GATA!
                </button>
              ) : currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all duration-300 flex-1 ${
                    validateStep(currentStep)
                      ? 'btn-active hover:scale-105'
                      : 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
                  }`}
                >
                  URMĂTORUL
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="flex-1"></div>
              )}
            </div>

            {/* Row 2: Inventory, Delete, History buttons */}
            {username && (
              <div className="flex items-center justify-center gap-3">
                {!isEditingFromReview && (
                  <button
                    type="button"
                    onClick={handleTrimiteInventar}
                    className="w-12 h-12 rounded-full bg-purple-100/90 hover:bg-purple-200/90 transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg border border-purple-200/50"
                    title="Trimite inventar"
                  >
                    <svg className="w-6 h-6 text-secondary/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleResetOrder}
                  className="w-12 h-12 rounded-full bg-rose-500/90 hover:bg-rose-600/90 transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg border border-rose-400/50"
                  title="Reluare comandă"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate('/my-orders')}
                  className="px-4 py-2 rounded-xl bg-primary/50 hover:bg-primary/70 text-secondary font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lg border border-secondary/20"
                  title="Istoric comenzi"
                >
                  ISTORIC
                </button>
              </div>
            )}

            {/* Row 3: Logout */}
            {username && (
              <div className="flex items-center justify-center gap-2 text-secondary/60 text-xs">
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
        </div>
      </div>

      {/* Reset Order Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-secondary/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-8 animate-float">
            <h3 className="text-2xl font-bold text-gradient mb-6 text-center">
              Reluare comandă
            </h3>
            <p className="text-center text-secondary/70 mb-6">
              Doriți să reluați comanda?
            </p>
            
            <div className="flex flex-col gap-4">
              <button
                onClick={handleConfirmReset}
                className="btn-active px-8 py-6 rounded-2xl font-bold text-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
              >
                DA
              </button>
              <button
                onClick={handleCancelReset}
                className="btn-neumorphic px-8 py-6 rounded-2xl font-bold text-xl text-secondary hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
              >
                NU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Wizard

