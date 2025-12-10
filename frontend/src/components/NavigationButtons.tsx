interface NavigationButtonsProps {
  currentStep: number
  onNext: () => void
  onPrevious: () => void
  canProceed: boolean
  isEditMode?: boolean
  onFinishEdit?: () => void
}

function NavigationButtons({
  currentStep,
  onNext,
  onPrevious,
  canProceed,
  isEditMode = false,
  onFinishEdit
}: NavigationButtonsProps) {
  if (isEditMode) {
    return (
      <div className="flex justify-center mt-12">
        <button
          onClick={onFinishEdit}
          disabled={!canProceed}
          className={`px-12 py-5 rounded-2xl font-bold text-2xl transition-all duration-300 ${
            canProceed
              ? 'btn-active hover:scale-105 shadow-glow-purple'
              : 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
          }`}
        >
          GATA!
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-between items-center mt-12 gap-4">
      <button
        onClick={onPrevious}
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
      
      {currentStep < 4 && (
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
            canProceed
              ? 'btn-active hover:scale-105'
              : 'bg-gray-300 text-gray-400 cursor-not-allowed shadow-neumorphic-inset'
          }`}
        >
          URMĂTORUL
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default NavigationButtons

