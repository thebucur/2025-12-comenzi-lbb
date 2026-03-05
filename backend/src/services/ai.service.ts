import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `Ești un asistent care procesează text dictat vocal pentru comenzi de torturi și prăjituri la o cofetărie.

Rolul tău este să curățe și să interpretezi textul brut din dictare vocală.

REGULI:
1. CORECTĂRI: Dacă utilizatorul se răzgândește în timpul dictării (folosind expresii ca "nu", "de fapt", "pardon", "adică", "mă scuzați", "vreau să zic", "nu nu", "stai", "anulează", "șterge"), păstrează DOAR intenția FINALĂ. Exemplu: "vreau trandafiri roșii nu de fapt lăcrămioare albe" → "lăcrămioare albe"
2. ERORI DE RECUNOAȘTERE: Corectează erori evidente de recunoaștere vocală, mai ales pentru termeni specifici cofetăriei (glazură, frișcă, fondant, marcipan, ganache, etc.)
3. LIMBĂ: Textul este în limba română. Păstrează limba română.
4. CONCIZIE: Elimină cuvinte de umplutură ("ăăă", "deci", "așa", "cum să zic") dar păstrează toate detaliile importante.
5. FORMATARE: Returnează text curat, clar, fără punctuație excesivă. Folosește virgule pentru separare.
6. FIDELITATE: NU inventa detalii. NU adăuga informații care nu sunt în textul original. Păstrează exact ce a vrut să zică utilizatorul.
7. TEXT SCURT: Dacă textul dictat este deja clar și corect, returnează-l practic neschimbat (doar cu mici corecturi de scriere dacă e cazul).
8. Dacă textul este complet neinteligibil, returnează textul original.

CONTEXT: Textul descrie fie detalii de decor pentru un tort/prăjitură (figurine, flori, text pe tort, culori, teme), fie observații generale despre comandă.`

export async function processDictatedText(
  rawText: string,
  fieldType: 'decorDetails' | 'observations'
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured, returning raw text')
    return rawText
  }

  if (!rawText.trim()) {
    return rawText
  }

  const fieldContext = fieldType === 'decorDetails'
    ? 'Acest text descrie detaliile de decor ale unui tort/prăjitură (figurine, flori, text pe tort, culori, teme, etc.).'
    : 'Acest text conține observații generale despre o comandă de tort/prăjitură (alergii, livrare, preferințe speciale, etc.).'

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${fieldContext}\n\nText brut din dictare:\n"${rawText}"\n\nReturnează DOAR textul curățat, fără explicații sau ghilimele.`
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const processedText = response.choices[0]?.message?.content?.trim()

    if (!processedText) {
      console.warn('AI returned empty response, using raw text')
      return rawText
    }

    return processedText
  } catch (error) {
    console.error('AI processing error:', error)
    return rawText
  }
}
