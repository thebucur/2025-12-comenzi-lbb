import OpenAI, { toFile } from 'openai'
import { prisma } from '../lib/prisma'

let openai: OpenAI | null = null
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

export interface DictatedEntry {
  productName: string
  category: string
  receptionDate: string
  quantity: number
  unit: string
  isNecesar: boolean
  action: 'add' | 'remove'
}

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
    const client = getOpenAI()
    if (!client) return rawText
    const response = await client.chat.completions.create({
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

const WHISPER_HALLUCINATION_PATTERNS = [
  /nu uit(a|ă)(t|ț)i s(a|ă) da(t|ț)i like/i,
  /s(a|ă) l(a|ă)sa(t|ț)i un comentariu/i,
  /s(a|ă) distribui(t|ț)i/i,
  /subscribe/i,
  /like (and|si|și) subscribe/i,
  /thanks for watching/i,
  /mul(t|ț)umesc pentru vizionare/i,
  /youtube/i,
  /re(t|ț)ele sociale/i,
  /materialele? video/i,
  /urm(a|ă)ri(t|ț)i p(a|â)n(a|ă) la cap(a|ă)t/i,
  /subtitr(a|ă)ri? (de|realizat)/i,
  /mul(t|ț)umesc c(a|ă) a(t|ț)i vizionat/i,
  /v(a|ă) rog s(a|ă) v(a|ă) abona(t|ț)i/i,
  /pe (canalul|canal) (meu|nostru)/i,
  /abonat(i|ți)/i,
  /clopoțel(ul)?/i,
]

function isWhisperHallucination(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  let matches = 0
  for (const pattern of WHISPER_HALLUCINATION_PATTERNS) {
    if (pattern.test(trimmed)) matches++
  }
  return matches >= 2
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const client = getOpenAI()
  if (!client) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const ext = mimeType.includes('webm') ? 'webm'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('wav') ? 'wav'
    : 'webm'

  const file = await toFile(audioBuffer, `recording.${ext}`, { type: mimeType })

  const transcription = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'ro',
  })

  const text = transcription.text

  if (isWhisperHallucination(text)) {
    console.warn('Whisper hallucination detected, ignoring transcript:', text)
    return ''
  }

  return text
}

async function getProductCatalog(): Promise<string> {
  const categories = await prisma.inventoryCategory.findMany({
    include: { products: { orderBy: { displayOrder: 'asc' } } },
    orderBy: { displayOrder: 'asc' },
  })

  return categories.map(cat => {
    const productNames = cat.products.map(p => p.name).join(', ')
    return `Categorie: "${cat.name}" | Unități: [${cat.units.join(', ')}] (implicit: ${cat.defaultUnit}) | Produse: ${productNames}`
  }).join('\n')
}

const REMOVAL_KEYWORDS = [
  'sterge', 'șterge', 'stergem', 'ștergem', 'sters', 'șters',
  'scoate', 'scoatem', 'scos',
  'elimina', 'elimină', 'eliminam', 'eliminăm', 'eliminat',
  'fara', 'fără',
  'nu mai am', 's-a terminat', 'am terminat',
  'nu mai e', 'nu mai avem', 'nu mai este',
  's-a vandut', 's-a vândut', 'am vandut', 'am vândut',
  'da jos', 'dă jos', 'ia de acolo',
  'scade', 'scadem', 'minus',
]

function detectRemovalIntent(transcript: string): boolean {
  const lower = transcript.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const normalizedKeywords = REMOVAL_KEYWORDS.map(k =>
    k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  )
  for (const keyword of normalizedKeywords) {
    if (lower.startsWith(keyword)) return true
  }
  const firstClause = lower.split(/[,.]/).at(0) || lower
  for (const keyword of normalizedKeywords) {
    if (firstClause.includes(keyword)) return true
  }
  return false
}

const INVENTORY_SYSTEM_PROMPT = `Ești un asistent care interpretează text dictat vocal pentru inventarul unei cofetării.

Primești un transcript al dictării și catalogul complet de produse cu categorii și unități de măsură.

TASK: Extrage din transcript o listă de produse cu cantități. Returnează STRICT un JSON array.

REGULI (în ordinea priorității):

**REGULA 1 - ȘTERGERE/ELIMINARE (PRIORITATE MAXIMĂ):**
Dacă transcriptul conține ORICARE din aceste cuvinte/expresii: "șterge", "sterge", "scoate", "elimină", "elimina", "fără", "fara", "nu mai am", "s-a terminat", "gata", "am terminat", "nu mai e", "nu mai avem", "s-a vândut", "am vândut", "dă jos", "ia de acolo", "scade", "minus"
→ action = "remove" pentru produsele menționate lângă aceste cuvinte.
→ Cantitatea la ștergere = cea menționată, sau 0 dacă nu e specificată (0 = șterge TOT).
→ isNecesar = false (ștergerea e ÎNTOTDEAUNA din inventar, nu din necesar).

EXEMPLE ȘTERGERE:
- "Șterge o amandină de ieri" → action:"remove", quantity:1, receptionDate: ieri
- "Scoate două savarine" → action:"remove", quantity:2
- "Sterge amandina" → action:"remove", quantity:0 (șterge tot)
- "Nu mai am eclere" → action:"remove", quantity:0
- "Fără krantz de ieri" → action:"remove", quantity:1, receptionDate: ieri

2. POTRIVIRE PRODUSE: Potrivește fiecare produs menționat cu cel mai apropiat produs din catalog (fuzzy match). Dacă userul zice "amandine" sau "amandina", potrivește cu "Amandina", "savarine" cu "Savarina", "ecler" cu "Ecler ...", "blanș" cu "Blanche" etc. Folosește EXACT numele din catalog. Încearcă TOATE variantele posibile de potrivire (singular/plural, cu/fără diacritice, prescurtări).
3. CATEGORII: Setează categoria corectă bazat pe catalogul de produse. Folosește EXACT numele categoriei din catalog.
4. UNITĂȚI: Potrivește unitățile menționate cu cele disponibile în categorie. "tăvi" sau "tava" = "tv", "platouri" sau "platou" = "plt", "bucăți" sau "bucata" = "buc.", "rânduri" sau "rand" = "rand", "grame" = "g.", "felii" sau "felie" = "felie". Dacă nu e specificată unitatea, folosește unitatea implicită a categoriei.
5. NECESAR vs INVENTAR: Dacă userul zice "necesar" înainte de un produs sau o cantitate, acel produs e NECESAR (isNecesar: true). Altfel e INVENTAR (isNecesar: false). ATENȚIE: Dacă acțiunea e "remove", isNecesar = false întotdeauna.
6. DATE: Dacă userul menționează o dată (ex: "de ieri", "din 5 martie", "de pe 22", "alaltăieri"), calculează data ISO. "ieri" = TODAY_DATE minus 1 zi. "alaltăieri" = TODAY_DATE minus 2 zile. Dacă nu menționează dată, folosește data de azi: TODAY_DATE.
7. CANTITĂȚI: Extrage cantitatea numerică. "două tăvi" = 2, "trei bucăți" = 3, "o tavă" = 1, "jumătate" = 0.5.
8. CORECTURI: Ignoră cuvinte de umplutură, ezitări, corecturi ("nu, de fapt", "stai", etc.) - păstrează doar intenția finală.
9. PRODUSE NECUNOSCUTE: Dacă un produs nu există în catalog, folosește cel mai apropiat nume din catalog. Dacă CHIAR nu găsești nimic similar, folosește numele exact cum a fost dictat și pune categoria cea mai potrivită.
10. CONSOLIDARE: Dacă același produs apare de mai multe ori cu ACEEAȘI dată și aceeași unitate și aceeași acțiune, ADUNĂ cantitățile într-o singură intrare. Exemplu: "4 amandine de ieri ... încă o amandină de ieri" = o singură intrare cu quantity 5. Dacă datele sunt DIFERITE, păstrează intrări separate.
11. Un rând per combinație unică de (produs + dată + unitate + isNecesar + action). Nu duplica.

FORMAT RĂSPUNS: Returnează DOAR un JSON array valid, fără explicații, fără markdown, fără backticks:
[{"productName":"...","category":"...","receptionDate":"YYYY-MM-DD","quantity":N,"unit":"...","isNecesar":false,"action":"add"}]

Dacă nu poți extrage niciun produs, returnează: []`

export async function interpretInventoryDictation(
  transcript: string,
  todayDate: string
): Promise<DictatedEntry[]> {
  const client = getOpenAI()
  if (!client) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const catalog = await getProductCatalog()

  const systemPrompt = INVENTORY_SYSTEM_PROMPT.replace(/TODAY_DATE/g, todayDate)

  const isRemovalTranscript = detectRemovalIntent(transcript)

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `CATALOG PRODUSE:\n${catalog}\n\nTRANSCRIPT DICTARE:\n"${transcript}"${isRemovalTranscript ? '\n\nATENȚIE: Transcriptul conține cuvinte de ȘTERGERE/ELIMINARE. Setează action="remove" pentru produsele menționate!' : ''}`
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) {
      console.warn('AI returned empty response for inventory dictation')
      return []
    }

    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let entries: DictatedEntry[] = JSON.parse(cleaned)

    if (!Array.isArray(entries)) {
      console.warn('AI returned non-array response:', content)
      return []
    }

    entries = entries.map(e => ({
      productName: String(e.productName || ''),
      category: String(e.category || ''),
      receptionDate: String(e.receptionDate || todayDate),
      quantity: Number(e.quantity) || 0,
      unit: String(e.unit || ''),
      isNecesar: Boolean(e.isNecesar),
      action: (e.action === 'remove' ? 'remove' : 'add') as 'add' | 'remove',
    }))

    if (isRemovalTranscript && entries.length > 0 && entries.every(e => e.action === 'add')) {
      console.log('Post-processing: forcing removal action based on transcript keywords')
      entries = entries.map(e => ({ ...e, action: 'remove' as const, isNecesar: false }))
    }

    return entries
  } catch (error) {
    console.error('AI inventory interpretation error:', error)
    return []
  }
}

export async function processInventoryVoice(
  audioBuffer: Buffer,
  mimeType: string
): Promise<{ transcript: string; entries: DictatedEntry[] }> {
  const transcript = await transcribeAudio(audioBuffer, mimeType)

  if (!transcript.trim()) {
    return { transcript: '', entries: [] }
  }

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' })
  const entries = await interpretInventoryDictation(transcript, today)

  return { transcript, entries }
}
