import { useOrder } from '../context/OrderContext'

interface ProgressStepperProps {
  currentStep: number
  onStepClick: (step: number) => void
}

const steps = [
  { number: 1, label: 'Ridicare', icon: '📦' },
  { number: 2, label: 'Sortiment', icon: '🎂' },
  { number: 3, label: 'Decor', icon: '🎨' },
  { number: 4, label: 'Finalizare', icon: '✓' },
]

function ProgressStepper({ currentStep, onStepClick }: ProgressStepperProps) {
  const { order } = useOrder()
  return (
    <div className="flex items-center justify-center mb-12 px-2 sm:px-4 max-w-full overflow-hidden">
      {steps.map((step, index) => {
        // Check if this step should be skipped (step 3 when noCake is true)
        const isSkipped = step.number === 3 && order.noCake
        
        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                onClick={() => onStepClick(step.number)}
                disabled={step.number > currentStep || isSkipped}
                className={`relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl md:text-2xl transition-all duration-300 ${
                  isSkipped
                    ? 'btn-neumorphic text-secondary/20 cursor-not-allowed opacity-50'
                    : step.number === currentStep
                    ? 'btn-active scale-110 shadow-glow-purple'
                    : step.number < currentStep
                    ? 'bg-gradient-to-r from-accent-purple/70 to-accent-pink/70 text-white shadow-neumorphic hover:scale-105'
                    : 'btn-neumorphic text-secondary/40 cursor-not-allowed'
                }`}
              >
                {isSkipped ? (
                  <span className="line-through opacity-50">{step.icon}</span>
                ) : step.number < currentStep ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
                
                {step.number === currentStep && !isSkipped && (
                  <div className="absolute inset-0 rounded-full animate-ping bg-gradient-to-r from-accent-purple/30 to-accent-pink/30"></div>
                )}
              </button>
              <span
                className={`mt-2 sm:mt-4 text-xs sm:text-sm font-bold transition-all duration-300 ${
                  isSkipped
                    ? 'text-secondary/20 line-through'
                    : step.number === currentStep
                    ? 'text-gradient scale-110'
                    : step.number < currentStep
                    ? 'text-accent-purple'
                    : 'text-secondary/40'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="relative w-8 sm:w-12 md:w-20 lg:w-32 h-1.5 sm:h-2 mx-2 sm:mx-4 md:mx-6 rounded-full bg-primary shadow-neumorphic-inset overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                    step.number < currentStep || (isSkipped && currentStep > 3)
                      ? 'w-full bg-gradient-to-r from-accent-purple to-accent-pink' 
                      : 'w-0'
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ProgressStepper

