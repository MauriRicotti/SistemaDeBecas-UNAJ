const firebaseConfig = {
  apiKey: "AIzaSyAQjdA6J1ch7hRMiMAjjAAzhXQw6CpeY_A",
  authDomain: "sistema-de-becas-unaj.firebaseapp.com",
  databaseURL: "https://sistema-de-becas-unaj-default-rtdb.firebaseio.com",
  projectId: "sistema-de-becas-unaj",
  storageBucket: "sistema-de-becas-unaj.firebasestorage.app",
  messagingSenderId: "228164595343",
  appId: "1:228164595343:web:fca8fdc643f0333bbb4afa",
  measurementId: "G-HWKM5Z3RB5"
}

if (firebaseConfig && firebaseConfig.apiKey) {
  (async () => {

    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js')
      const rtdbModule = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js')

      const app = initializeApp(firebaseConfig)
      const { getDatabase, ref, set, remove, onChildAdded, onChildChanged, onChildRemoved, get, onValue, push, update, child } = rtdbModule
      const db = getDatabase(app)

      // Exponer una API ligera para la app basada en Realtime Database
      window.AppFirebase = { db, ref, set, remove, onChildAdded, onChildChanged, onChildRemoved, get, onValue, push, update, child }
      console.log('Firebase Realtime Database inicializado — AppFirebase disponible')

      try {
        if (typeof setupFirebaseSync === 'function') {
          setupFirebaseSync()
        }
      } catch (err) {
        console.warn('No se pudo iniciar setupFirebaseSync automáticamente:', err)
      }
    } catch (err) {
      console.error('Error inicializando Firebase inlined:', err)
    }
  })()
} else {
  console.warn('Firebase no configurado en Main.js. Pega tu firebaseConfig en la variable firebaseConfig arriba.')
}

const BECA_LIMITS = {
  A: 352,
  B: 440,
  C: 460,
}

let clients = []
let impresiones = []
let currentFilters = {}
let currentTurno = "Mañana"
let clientToDelete = null
let currentHistorialClientId = null
let _firstRenderDone = false
// Paginación
let currentPage = 1
let pageSize = 6 // default
// bandera interna para indicar que el próximo render viene de una paginación
let __justPaginated = false
// Cuando hay muchos clientes, por defecto solo renderizamos los primeros N para ahorrar recursos
let showAllClients = false

document.addEventListener("DOMContentLoaded", () => {
  loadData()
  initializeYearFilter()
  setupEventListeners()
  renderClients()

  const turnoSelect = document.getElementById("turnoSelect")
  turnoSelect.value = currentTurno
  setupTurnoTimers()
    startDigitalClock()
  
    // Wire UI for download clients modal button (Deploy handler and fallback)
    async function runDownloadClientsHandler(e) {
      try {
        if (e && typeof e.preventDefault === 'function') e.preventDefault()
        console.debug('runDownloadClientsHandler invoked', e)
        const reportEl = document.getElementById('downloadReport')
        if (reportEl) reportEl.textContent = 'Generando PDF de clientes...'
        const instituto = document.getElementById('downloadInstituto') ? document.getElementById('downloadInstituto').value : ''
        const tipoBeca = document.getElementById('downloadTipoBeca') ? document.getElementById('downloadTipoBeca').value : ''
        let clientsForDownload = [...clients]
        if (instituto) clientsForDownload = clientsForDownload.filter(c => (c.instituto || '') === instituto)
        if (tipoBeca) clientsForDownload = clientsForDownload.filter(c => ((c.tipoBeca || '').toString().toUpperCase()) === (tipoBeca || '').toString().toUpperCase())
        if (!clientsForDownload || clientsForDownload.length === 0) {
          if (reportEl) reportEl.textContent = 'No hay clientes para los filtros seleccionados.'
          console.warn('download modal: no hay clientes para los filtros seleccionados', { instituto, tipoBeca, clientsLen: clients.length })
          return
        }
        const blob = await createClientsPdfBlob({ instituto: instituto || null, tipoBeca: tipoBeca || null, clientsList: clientsForDownload })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const sanitize = s => (s || '').toString().trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-()]/g, '')
        const instPart = sanitize(instituto || (clientsForDownload[0] && clientsForDownload[0].instituto) || 'Todos')
        const tipoPart = sanitize(tipoBeca || (clientsForDownload[0] && clientsForDownload[0].tipoBeca) || 'Todos')
    // Nombre de archivo solicitado
    a.download = `Base de datos - Beca de apuntes 2025.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        if (reportEl) reportEl.textContent = 'PDF generado y descargado.'
      } catch (err) {
        console.error('Error generando PDF de clientes', err)
        const reportEl = document.getElementById('downloadReport')
        if (reportEl) reportEl.textContent = 'Error generando PDF: ' + (err && err.message ? err.message : String(err))
      }
    }
  
    const btn = document.getElementById('btnDownloadClients')
    if (btn) {
      btn.addEventListener('click', runDownloadClientsHandler)
    } else {
      console.debug('#btnDownloadClients no encontrado; se agregará listener delegado como fallback')
    }
  
    document.addEventListener('click', (ev) => {
      try {
        const target = ev.target || ev.srcElement
        const btnEl = target && typeof target.closest === 'function' ? target.closest('#btnDownloadClients') : null
        if (btnEl) runDownloadClientsHandler(ev)
      } catch (e) {
        console.warn('Error en listener delegado de btnDownloadClients', e)
      }
    })
    // Exponer handler para depuración manual desde consola
    try { window.runDownloadClientsHandler = runDownloadClientsHandler } catch (e) {}
})

// Forzar ir arriba al recargar la página (asegura UX consistente)
window.addEventListener('load', () => {
  try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) } catch (e) { window.scrollTo(0,0) }
})

// Cargar jsPDF dinámicamente
async function ensureJsPDF() {
  // Si ya fue cargado y normalizado, devolverlo
  if (window.jspdf && (window.jspdf.jsPDF)) {
    return window.jspdf
  }

  // Intento 1: import dinámico (ESM) desde CDN
  try {
    const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    // Normalizar posibles formas de exportación
    let jsPDFctor = null
    if (mod) {
      if (mod.jspdf && (mod.jspdf.jsPDF || (mod.jspdf.default && mod.jspdf.default.jsPDF))) {
        jsPDFctor = mod.jspdf.jsPDF || (mod.jspdf.default && mod.jspdf.default.jsPDF)
      } else if (mod.jsPDF) {
        jsPDFctor = mod.jsPDF
      } else if (mod.default) {
        jsPDFctor = mod.default.jsPDF || mod.default
      }
    }

    // Si esto devolvió algo utilizable, normalizamos y retornamos
    if (jsPDFctor && (typeof jsPDFctor === 'function' || typeof jsPDFctor === 'object')) {
      window.jspdf = { jsPDF: jsPDFctor }
      console.debug('ensureJsPDF: cargado vía import dinámico y normalizado', window.jspdf)
      return window.jspdf
    }

    console.warn('ensureJsPDF: import dinámico devolvió forma inesperada, caeremos a fallback por <script>', { mod })
  } catch (err) {
    console.warn('ensureJsPDF: import dinámico falló, intentando fallback por <script>:', err)
  }

  // Fallback: cargar la versión UMD como <script> desde varios CDNs y esperar a que exponga window.jspdf/jsPDF
  const loadScript = (src) => new Promise((resolve, reject) => {
    try {
      // Si ya existe un script con esta src, no lo volvemos a agregar
      const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.indexOf(src) !== -1)
      if (existing) {
        // si ya está cargado, resolvemos inmediatamente en next tick
        return resolve()
      }
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve()
      s.onerror = (e) => reject(new Error('No se pudo cargar script: ' + src))
      document.head.appendChild(s)
    } catch (e) {
      reject(e)
    }
  })

  const cdns = [
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
  ]

  for (const src of cdns) {
    try {
      await loadScript(src)
      // comprobar exposición global
      let ctor = null
      if (window.jspdf && (window.jspdf.jsPDF || (window.jspdf.default && window.jspdf.default.jsPDF))) {
        ctor = window.jspdf.jsPDF || (window.jspdf.default && window.jspdf.default.jsPDF)
      } else if (window.jsPDF) {
        ctor = window.jsPDF
      } else if (window.jspdf && typeof window.jspdf === 'function') {
        ctor = window.jspdf
      }

      if (ctor) {
        window.jspdf = { jsPDF: ctor }
        console.debug('ensureJsPDF: cargado vía <script> desde', src)
        return window.jspdf
      }
    } catch (err) {
      console.warn('ensureJsPDF: intento fallido con CDN', src, err)
      // continuar con siguiente CDN
    }
  }

  // Si llegamos aquí, no pudimos localizar el constructor
  const err = new Error('No se pudo localizar el constructor jsPDF tras intentar import y fallback por CDN')
  console.error('ensureJsPDF:', err)
  throw err
}

// Genera PDF con una página por cliente con formato de libro
async function generateBookPDF(options = { all: true, clientIds: [] }) {
  // Normalizar opciones y valores por defecto para evitar usos de propiedades undefined
  options = Object.assign({ all: true, clientIds: [] }, options || {})
  if (!Array.isArray(options.clientIds)) options.clientIds = []

  const jspdfModule = await ensureJsPDF()
  const jsPDF = (jspdfModule && jspdfModule.jsPDF) || jspdfModule

  const createDoc = () => new jsPDF({ unit: 'mm', format: 'a4' })
  const doc = createDoc()

  // Seleccionar clientes:
  // - Si options.all === true -> todos
  // - Si clientIds provisto y no vacío -> filtrar por esos ids
  // - Si options.all === false y no hay clientIds -> partir de todos y aplicar luego filtros (instituto/tipo)
  let selectedClients = []
  if (options.all) {
    selectedClients = [...clients]
  } else if (Array.isArray(options.clientIds) && options.clientIds.length > 0) {
    selectedClients = clients.filter(c => options.clientIds.includes(c.id))
  } else {
    // no se pasó clientIds, pero se indicó all=false -> asumimos que el usuario quiere filtrar por instituto/tipo
    selectedClients = [...clients]
  }

  // Aplicar filtros adicionales si se pasan (instituto + tipoBeca)
  if (options.instituto) selectedClients = selectedClients.filter(c => (c.instituto || '').toString() === options.instituto)
  if (options.tipoBeca) selectedClients = selectedClients.filter(c => (c.tipoBeca || '').toString().toUpperCase() === (options.tipoBeca || '').toString().toUpperCase())

  if (!selectedClients || selectedClients.length === 0) throw new Error('No hay clientes seleccionados')

  selectedClients.forEach((c, idx) => {
  if (idx !== 0) doc.addPage()

  // Encabezado (formato libro similar al impreso)
  doc.setFontSize(13)
  doc.setTextColor(30)
  const headerTitle = `BECA DE APUNTES ${options.instituto || ''}`.trim()
  doc.text(headerTitle, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`Nombre: ${c.nombreApellido}`, 14, 28)
  doc.text(`DNI: ${c.dni}`, 140, 28)
  doc.text(`Carrera: ${c.carrera || '-'}`, 14, 36)
  doc.text(`Tipo: ${c.tipoBeca || '-'}`, 140, 36)
  doc.text(`Instituto: ${c.instituto || (options.instituto || '-')}`, 14, 44)

    // Línea separadora
    doc.setDrawColor(200)
    doc.setLineWidth(0.5)
    doc.line(14, 48, 196, 48)

    // Tabla de anotaciones: dejamos 12 filas con columnas Fecha / Monto / Material / Atendido por / Firma
    const startY = 54
    const rowHeight = 8
    const cols = [14, 36, 72, 120, 160]
    doc.setFontSize(10)
    doc.setTextColor(60)
    // Headers
    doc.text('FECHA', cols[0], startY - 2)
    doc.text('MONTO', cols[1], startY - 2)
    doc.text('MATERIAL', cols[2], startY - 2)
    doc.text('ATENDIDO POR', cols[3], startY - 2)
    doc.text('FIRMA', cols[4], startY - 2)

    for (let r = 0; r < 12; r++) {
      const y = startY + r * rowHeight
      doc.line(14, y + 2, 196, y + 2)
    }

    // Pie con número de página / fecha
    doc.setFontSize(9)
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 287)
    doc.text(`${idx + 1} / ${selectedClients.length}`, 180, 287)
  })

  // Descargar
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  // Nombre solicitado: "Libro de becas (instituto)(tipo)"
  const sanitize = s => (s || '').toString().trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-()]/g, '')
  const instPart = sanitize(options.instituto || (selectedClients[0] && selectedClients[0].instituto) || 'Todos')
  const tipoPart = sanitize(options.tipoBeca || (selectedClients[0] && selectedClients[0].tipoBeca) || 'Todos')
  a.download = `Libro de becas (${instPart})(${tipoPart}).pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Genera y devuelve Blob de PDF para un conjunto de clientes con un nombre de archivo sugerido
async function createBookPdfBlob({ instituto = null, tipoBeca = null, clientsForBook = [] }) {
  const jspdfModule = await ensureJsPDF()
  const jsPDF = jspdfModule.jsPDF || jspdfModule
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // Si no hay clientesForBook asumimos que clientsForBook fue calculado en caller
  const selectedClients = Array.isArray(clientsForBook) ? clientsForBook : []

  // Caratula en la primera página
  // Diseño centrado y grande
  doc.setDrawColor(0)
  doc.setFillColor(255,255,255)
  doc.setFontSize(22)
  doc.setTextColor(30)
  doc.setFont(undefined, 'bold')
  const title = `Libro de ${instituto || 'Todos'} — Tipo: ${tipoBeca || 'Todos'}`
  doc.text(title, 105, 80, { align: 'center' })
  doc.setFontSize(18)
  doc.text('Beca de apuntes 2025', 105, 110, { align: 'center' })
  // agregar un separador decorativo
  doc.setLineWidth(0.8)
  doc.line(40, 130, 170, 130)

  // Si no hay clients, devolvemos la caratula
  if (!selectedClients || selectedClients.length === 0) {
    return doc.output('blob')
  }

  // Para cada cliente, nueva página con datos y tabla que ocupa el espacio restante
  selectedClients.forEach((c, idx) => {
    // agregar página si no es la primera (caratula)
    if (idx === 0) {
      doc.addPage()
    } else {
      doc.addPage()
    }

  // Encabezado con datos (etiquetas en negrita) — medir etiquetas para evitar espacios extra
  doc.setFontSize(13)
  doc.setTextColor(30)

  const labelGap = 4
  // Nombre
  doc.setFont(undefined, 'bold')
  const nameLabel = 'Nombre:'
  doc.text(nameLabel, 14, 24)
  doc.setFont(undefined, 'normal')
  doc.text(`${c.nombreApellido}`, 14 + doc.getTextWidth(nameLabel) + labelGap, 24)

  // DNI
  doc.setFont(undefined, 'bold')
  const dniLabel = 'DNI:'
  doc.text(dniLabel, 14, 34)
  doc.setFont(undefined, 'normal')
  doc.text(`${c.dni}`, 14 + doc.getTextWidth(dniLabel) + labelGap, 34)

  // Carrera
  doc.setFont(undefined, 'bold')
  const carreraLabel = 'Carrera:'
  doc.text(carreraLabel, 14, 44)
  doc.setFont(undefined, 'normal')
  doc.text(`${c.carrera || '-'}`, 14 + doc.getTextWidth(carreraLabel) + labelGap, 44)

  // Tipo de Beca (alineado a la derecha como antes)
  doc.setFont(undefined, 'bold')
  const tipoLabel = 'Tipo:'
  const tipoX = 140
  doc.text(tipoLabel, tipoX, 24)
  doc.setFont(undefined, 'normal')
  doc.text(`${c.tipoBeca || '-'}`, tipoX + doc.getTextWidth(tipoLabel) + labelGap, 24)

  // Línea separadora
  doc.setDrawColor(200)
  doc.setLineWidth(0.5)
  doc.line(14, 52, 196, 52)

  // Tabla que ocupa el espacio restante (desde y=58 hasta y=280 aprox)
  const startY = 58
    const endY = 280
    // usar filas ligeramente más pequeñas para que quepan más
    const rowHeight = 9
    // columnas: x positions (ajustadas para sumar ~182mm ancho printable)
    const colX = [14, 44, 74, 114, 154]
    const tableRight = 196
    const tableWidth = tableRight - colX[0]

    // Dibujar borde exterior de la tabla (ajustado para que no quede una línea por encima de los encabezados)
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    const rectY = startY - 2
    doc.rect(colX[0], rectY, tableWidth, endY - rectY)

    // Dibujar líneas verticales (columnas)
    for (let i = 0; i < colX.length; i++) {
      const x = colX[i]
      doc.line(x, rectY, x, endY)
    }
    // dibujar la línea final en la derecha
    doc.line(tableRight, rectY, tableRight, endY)

    // Cabecera: fondo ligero y texto en negrita centrado por columna
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    const headers = ['Fecha', 'Monto', 'Material', 'Atendido por', 'Firma']
    for (let i = 0; i < headers.length; i++) {
      const x = colX[i]
      const nextX = (i < colX.length - 1) ? colX[i + 1] : tableRight
      const w = nextX - x
      const cx = x + w / 2
      // encabezado centrado verticalmente en la celda de cabecera
      doc.text(headers[i], cx, startY + 3, { align: 'center' })
    }

    // Dibujar filas horizontales hasta llenar la página
    doc.setFont('helvetica', 'normal')
    let y = startY
    while (y + rowHeight <= endY) {
      // dibujar línea horizontal completa
      doc.line(colX[0], y + rowHeight - 2, tableRight, y + rowHeight - 2)
      y += rowHeight
    }

  // Mostrar Numero de orden debajo de 'Tipo' (alineado con Tipo)
  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  const orderLabel = 'Numero de orden:'
  const orderY = 32
  const orderXLabel = tipoX
  doc.text(orderLabel, orderXLabel, orderY)
  doc.setFont(undefined, 'bold')
  const orderText = (c.numeroOrden || '').toString()
  const orderXVal = orderXLabel + doc.getTextWidth(orderLabel) + 6
  doc.text(orderText, orderXVal, orderY)
  })

  return doc.output('blob')
}

// Crea un PDF tipo lista/tabla con la base de clientes filtrada y devuelve Blob
async function createClientsPdfBlob({ instituto = null, tipoBeca = null, clientsList = [] }) {
  const jspdfModule = await ensureJsPDF()
  const jsPDF = jspdfModule.jsPDF || jspdfModule
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const margin = 14
  const pageWidth = 210
  const usableWidth = pageWidth - margin * 2
  let y = 20

  // Título principal (exacto)
  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  const mainTitle = 'Base de datos - Beca de apuntes 2025'
  doc.text(mainTitle, pageWidth / 2, y, { align: 'center' })
  y += 10

  // Resumen estadístico arriba
  const total = clientsList.length
  const byInstitute = { Salud: 0, Sociales: 0, Ingeniería: 0 }
  const byTipo = { A: 0, B: 0, C: 0 }
  clientsList.forEach(c => {
    if (c && c.instituto && byInstitute.hasOwnProperty(c.instituto)) byInstitute[c.instituto]++
    const t = (c && c.tipoBeca) ? c.tipoBeca.toString().toUpperCase() : ''
    if (byTipo.hasOwnProperty(t)) byTipo[t]++
  })

  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text(`Total registrados: ${total}`, margin, y)
  y += 7
  doc.text(`Por instituto: Salud ${byInstitute.Salud} — Sociales ${byInstitute.Sociales} — Ingeniería ${byInstitute['Ingeniería']}`, margin, y)
  y += 7
  doc.text(`Por tipo de beca: A ${byTipo.A} — B ${byTipo.B} — C ${byTipo.C}`, margin, y)
  y += 12

  // Preparar orden y agrupación por instituto
  const institutosOrden = ['Salud', 'Sociales', 'Ingeniería']
  // columnas: Nombre | DNI | Carrera | Tipo | N° Orden
  const colPercents = [0.38, 0.16, 0.28, 0.08, 0.10]
  const cols = colPercents.map(p => Math.floor(p * usableWidth))
  // base mínima de fila (mm). Las filas crecerán si el texto envuelto ocupa más líneas
  const baseRowHeight = 8
  const lineHeight = 4.2 // aproximado en mm por línea (ajustable)

  // Helpers para pintar cabecera de instituto (color por instrucción)
  const instituteHeaderColor = (inst) => {
    if (inst === 'Salud') return [255, 204, 0] // amarillo
    if (inst === 'Sociales') return [153, 204, 255] // celeste
    if (inst === 'Ingeniería') return [220, 53, 69] // rojo
    return [240,240,240]
  }
  // calculamos posiciones X de cada columna a partir de los anchos
  const colWidths = cols
  const colX = []
  colX[0] = margin
  for (let i = 1; i < colWidths.length; i++) {
    colX[i] = colX[i - 1] + colWidths[i - 1]
  }
  const tableRight = margin + colWidths.reduce((s, v) => s + v, 0)

  const renderTableHeader = (inst) => {
    // cabecera coloreada con título del instituto
    const headerBarHeight = 10
    const [r,g,b] = instituteHeaderColor(inst)
    doc.setFillColor(r,g,b)
    doc.rect(margin, y - 6, usableWidth, headerBarHeight, 'F')
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(0)
    doc.text(inst, margin + 2, y)
    y += headerBarHeight + 4

    // fila de encabezados de la tabla (con fondo claro)
    const headerHeight = 9
    doc.setFillColor(245,245,245)
    doc.rect(margin, y - 2, usableWidth, headerHeight, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    const headers = ['Nombre', 'DNI', 'Carrera', 'Tipo', 'N° Orden']
    for (let i = 0; i < headers.length; i++) {
      const x = colX[i]
      const w = colWidths[i]
      // centrar horizontalmente el encabezado dentro de la celda
      doc.text(headers[i], x + w / 2, y + headerHeight / 2 + 1, { align: 'center' })
      // dibujar líneas verticales
      doc.setDrawColor(180)
      doc.setLineWidth(0.4)
      doc.line(x, y - 2, x, y - 2 + Math.max(headerHeight, baseRowHeight))
    }
    // línea final derecha
    doc.line(tableRight, y - 2, tableRight, y - 2 + Math.max(headerHeight, baseRowHeight))
    // línea inferior de encabezado
    doc.setDrawColor(160)
    doc.setLineWidth(0.5)
    doc.line(margin, y - 2 + headerHeight, tableRight, y - 2 + headerHeight)

    y += headerHeight + 2
    doc.setFont(undefined, 'normal')
    doc.setTextColor(0)
  }

  const bottomLimit = 287
  let page = 1

  for (const inst of institutosOrden) {
    // si se pasó un filtro de instituto, saltar los otros
    if (instituto && instituto !== inst) continue

    const items = clientsList
      .filter(c => (c.instituto || '') === inst)
      // ordenar por tipo A then B then C, y dentro por numeroOrden asc
      .sort((a,b) => {
        const ta = (a.tipoBeca||'').toString().toUpperCase()
        const tb = (b.tipoBeca||'').toString().toUpperCase()
        if (ta !== tb) return ta.localeCompare(tb)
        const na = Number.parseInt(a.numeroOrden) || 0
        const nb = Number.parseInt(b.numeroOrden) || 0
        return na - nb
      })

    if (!items || items.length === 0) continue

    // Añadir un pequeño espacio antes de la tabla si no hay suficiente espacio en la página
    if (y + 60 > 287) {
      // pie antes de cambiar de página
      doc.setFontSize(9)
      doc.text(`Generado: ${new Date().toLocaleDateString()}`, margin, 287)
      doc.text(`Página ${page}`, pageWidth - margin, 287, { align: 'right' })
      doc.addPage()
      page++
      y = 20
    }

    renderTableHeader(inst)

    for (const c of items) {
      // Preparar textos de cada celda y calcular altura necesaria
      const values = [c.nombreApellido || '-', c.dni || '-', c.carrera || '-', (c.tipoBeca||'-'), (c.numeroOrden||'')]
      const wrappedCols = []
      let maxLines = 0
      for (let j = 0; j < values.length; j++) {
        const w = colWidths[j]
        const txt = String(values[j])
        const wrapped = doc.splitTextToSize(txt, Math.max(4, w - 4))
        wrappedCols.push(wrapped)
        if (wrapped.length > maxLines) maxLines = wrapped.length
      }

      const neededHeight = Math.max(baseRowHeight, Math.ceil(maxLines * lineHeight)) + 4 // padding

      // Salto de página si no hay espacio suficiente
      if (y + neededHeight > bottomLimit) {
        doc.setFontSize(9)
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, margin, bottomLimit)
        doc.text(`Página ${page}`, pageWidth - margin, bottomLimit, { align: 'right' })
        doc.addPage()
        page++
        y = 20
        renderTableHeader(inst)
      }

      // Dibujar bordes de las celdas (grid)
      doc.setDrawColor(170)
      doc.setLineWidth(0.35)
      for (let j = 0; j < colWidths.length; j++) {
        const x = colX[j]
        const w = colWidths[j]
        // rect para la celda (sin relleno)
        doc.rect(x, y - 2, w, neededHeight)
      }

      // Dibujar texto en cada celda (con padding)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      for (let j = 0; j < wrappedCols.length; j++) {
        const x = colX[j]
        const w = colWidths[j]
        const lines = wrappedCols[j]
        const textX = x + 2
        const textY = y + 3
        // doc.text acepta array para múltiples líneas
        doc.text(lines, textX, textY)
      }

      y += neededHeight + 2
    }

    y += 6
  }

  // pie final
  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleDateString()}`, margin, 287)
  doc.text(`Página ${page}`, pageWidth - margin, 287, { align: 'right' })

  // Aseguramos retorno del blob
  return doc.output('blob')
}

// Gera un ZIP con los 9 libros (combinaciones) y devuelve Blob del ZIP
async function generateAllBooksZip() {
  // cargar JSZip dinámicamente (import dinámico o fallback por <script>)
  // Normalizar la exportación para obtener el constructor (puede venir como default o JSZip)
  if (!window.JSZip) {
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')
      // mod puede ser el constructor, o { default: constructor }, o { JSZip: constructor }
      let ctor = mod && (mod.default || mod.JSZip || mod)
      // si todavía no es constructor, intentar tomar mod.default
      if (ctor && ctor.default) ctor = ctor.default
      window.JSZip = ctor
    } catch (err) {
      console.warn('generateAllBooksZip: import dinámico JSZip falló, intentando fallback por <script>', err)
      // fallback por <script>
      const loadScript = (src) => new Promise((resolve, reject) => {
        try {
          const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.indexOf(src) !== -1)
          if (existing) return resolve()
          const s = document.createElement('script')
          s.src = src
          s.async = true
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('No se pudo cargar script: ' + src))
          document.head.appendChild(s)
        } catch (e) { reject(e) }
      })

      const cdns = [
        'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
        'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'
      ]

      let loaded = false
      for (const src of cdns) {
        try {
          await loadScript(src)
          // comprobar exposición global
          if (window.JSZip) { loaded = true; break }
          if (window.jszip) { window.JSZip = window.jszip; loaded = true; break }
          if (window.JSZip === undefined && (window.JSZip || window.JSZip === null)) {
            // nothing
          }
          // algunos UMD exponen JSZip en window.JSZip o window.JSZip
          if (window.JSZip) { loaded = true; break }
        } catch (err) {
          console.warn('generateAllBooksZip: intento fallido con CDN', src, err)
        }
      }

      if (!loaded && !window.JSZip) {
        const e = new Error('No se pudo cargar JSZip desde CDN')
        console.error('generateAllBooksZip:', e)
        throw e
      }
    }
  }

  // Normalizar el constructor final (window.JSZip puede ser módulo o tener propiedades)
  let JSZipCtor = window.JSZip
  if (JSZipCtor && JSZipCtor.default) JSZipCtor = JSZipCtor.default
  if (JSZipCtor && JSZipCtor.JSZip) JSZipCtor = JSZipCtor.JSZip
  if (!JSZipCtor) {
    const e = new Error('JSZip no está disponible tras la carga')
    console.error('generateAllBooksZip:', e, { windowJSZip: window.JSZip })
    throw e
  }

  const zip = new JSZipCtor()
  const institutos = ['Salud','Sociales','Ingeniería']
  const tipos = ['A','B','C']

  for (const inst of institutos) {
    for (const tipo of tipos) {
      const clientsForBook = clients.filter(c => c.instituto === inst && c.tipoBeca === tipo)
      if (clientsForBook.length === 0) continue
      const blob = await createBookPdfBlob({ instituto: inst, tipoBeca: tipo, clientsForBook })
      const filename = `Libro_${inst.replace(/\s+/g,'')}_Tipo${tipo}.pdf`
      zip.file(filename, blob)
    }
  }

  return zip.generateAsync({ type: 'blob' })
}

// Wire UI generate book button
document.addEventListener('DOMContentLoaded', () => {
  // extraer handler a función nombrada para poder reusar y depurar fácilmente
  async function runGenerateBookHandler(e) {
    try {
      if (e && typeof e.preventDefault === 'function') e.preventDefault()
      console.debug('runGenerateBookHandler invoked', e)

      const reportEl = document.getElementById('generateReport')
      if (reportEl) reportEl.textContent = 'Generando PDF...'
      else console.warn('Elemento #generateReport no encontrado en el DOM')

      const institutoEl = document.getElementById('generateInstituto')
      const tipoEl = document.getElementById('generateTipoBeca')
      const genAllEl = document.getElementById('generateAllBooks')
      const instituto = institutoEl ? institutoEl.value : ''
      const tipoBeca = tipoEl ? tipoEl.value : ''
      const generateAllBooks = genAllEl ? genAllEl.checked : false

      if (generateAllBooks) {
        if (reportEl) reportEl.textContent = 'Generando todos los libros y empaquetando en ZIP...'
        console.debug('Generar todos los libros (ZIP) solicitado')
        const zipBlob = await generateAllBooksZip()
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `libros_becas_${new Date().toISOString().slice(0,10)}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        if (reportEl) reportEl.textContent = 'ZIP descargado con los libros disponibles.'
        return
      }

      // determinar clientes por filtros
      const all = (!instituto && !tipoBeca)
      let clientsForBook = []
      if (all) {
        clientsForBook = [...clients]
      } else {
        clientsForBook = [...clients]
        if (instituto) clientsForBook = clientsForBook.filter(c => (c.instituto || '').toString() === instituto)
        if (tipoBeca) clientsForBook = clientsForBook.filter(c => (c.tipoBeca || '').toString().toUpperCase() === (tipoBeca || '').toString().toUpperCase())
      }

      if (!clientsForBook || clientsForBook.length === 0) {
        console.warn('generate modal: no hay clientes para los filtros seleccionados', { instituto, tipoBeca, clientsLen: clients.length })
        if (reportEl) reportEl.textContent = 'Error generando PDF: No hay clientes seleccionados para esos filtros.'
        return
      }

      // generar blob y forzar descarga
      const blob = await createBookPdfBlob({ instituto: instituto || null, tipoBeca: tipoBeca || null, clientsForBook })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const sanitize = s => (s || '').toString().trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-()]/g, '')
      const instPart = sanitize(instituto || (clientsForBook[0] && clientsForBook[0].instituto) || 'Todos')
      const tipoPart = sanitize(tipoBeca || (clientsForBook[0] && clientsForBook[0].tipoBeca) || 'Todos')
      a.download = `Libro de becas (${instPart})(${tipoPart}).pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      if (reportEl) reportEl.textContent = 'PDF generado y descargado.'
    } catch (err) {
      console.error('Error generando PDF', err)
      const reportEl = document.getElementById('generateReport')
      if (reportEl) reportEl.textContent = 'Error generando PDF: ' + (err && err.message ? err.message : String(err))
    }
  }

  // intentar binding directo (normal)
  const btn = document.getElementById('btnGenerateBook')
  if (btn) {
    btn.addEventListener('click', runGenerateBookHandler)
  } else {
    console.debug('btnGenerateBook no encontrado al inicializar el listener; se agrega listener delegado como fallback')
  }

  // Fallback: listener delegado para capturar clicks aunque el binding directo no se haya aplicado
  document.addEventListener('click', (ev) => {
    try {
      const target = ev.target || ev.srcElement
      const btnEl = target && typeof target.closest === 'function' ? target.closest('#btnGenerateBook') : null
      if (btnEl) runGenerateBookHandler(ev)
    } catch (e) {
      console.warn('Error en listener delegado de btnGenerateBook', e)
    }
  })
  // Exponer para depuración manual desde consola
  try { window.runGenerateBookHandler = runGenerateBookHandler } catch (e) {}
})

// THEME TOGGLE: alternar entre tema oscuro y claro
function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
    localStorage.setItem('theme', 'light')
    const toggle = document.getElementById('btnThemeToggle')
    if (toggle) toggle.setAttribute('aria-pressed', 'true')
    // show sun icon, hide moon
    const sun = document.querySelector('.icon-sun')
    const moon = document.querySelector('.icon-moon')
    if (sun) sun.style.display = ''
    if (moon) moon.style.display = 'none'
  } else {
    root.setAttribute('data-theme', 'dark')
    localStorage.setItem('theme', 'dark')
    const toggle = document.getElementById('btnThemeToggle')
    if (toggle) toggle.setAttribute('aria-pressed', 'false')
    const sun = document.querySelector('.icon-sun')
    const moon = document.querySelector('.icon-moon')
    if (sun) sun.style.display = 'none'
    if (moon) moon.style.display = ''
  }
}

function initThemeToggle() {
  const saved = localStorage.getItem('theme') || 'dark'
  applyTheme(saved)
  const btn = document.getElementById('btnThemeToggle')
  if (!btn) return
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark'
    const next = current === 'dark' ? 'light' : 'dark'
    applyTheme(next)
  })
}

// Entrada animada secuencial para las primeras N tarjetas (limitado a 3)
// Entrada animada secuencial para las primeras N tarjetas (limitado a 6 por defecto)
function animateInitialCards(limit = 6) {
  const clientsList = document.getElementById('clientsList')
  // animar también la search-card
  const searchCard = document.querySelector('.search-card')
  if (searchCard) {
    searchCard.style.opacity = '0'
    searchCard.style.transform = 'translateY(10px)'
    searchCard.style.transition = 'opacity 560ms ease, transform 560ms cubic-bezier(.2,.8,.2,1)'
    setTimeout(() => { searchCard.style.opacity = ''; searchCard.style.transform = '' }, 80)
  }
  if (!clientsList) return
  const cards = Array.from(clientsList.children).slice(0, limit)
  cards.forEach((card, idx) => {
    card.style.opacity = '0'
    card.style.transform = 'translateY(16px)'
    card.style.transition = 'opacity 560ms ease, transform 560ms cubic-bezier(.2,.8,.2,1)'
    setTimeout(() => {
      card.style.opacity = ''
      card.style.transform = ''
    }, 200 * idx)
  })
}

// Helper global: generar HTML de una sola tarjeta de cliente
function generateClientCardHtml(client) {
  const usedCarillas = getUsedCarillasThisMonth(client.id)
  const limit = BECA_LIMITS[client.tipoBeca]
  const remaining = limit - usedCarillas
  const percentage = (usedCarillas / limit) * 100

  let progressClass = ""
  if (percentage >= 90) progressClass = "danger"
  else if (percentage >= 70) progressClass = "warning"

  let instClass = ''
  try {
    const instName = (client.instituto || '').toString().toLowerCase()
    if (instName.includes('salud')) instClass = 'instituto-salud'
    else if (instName.includes('social')) instClass = 'instituto-sociales'
    else if (instName.includes('ingenier')) instClass = 'instituto-ingenieria'
  } catch (e) { instClass = '' }

  return `
    <div class="client-card ${instClass}" data-client-id="${client.id}">
                <div class="client-header">
                    <div>
                        <div class="client-name">${client.nombreApellido}</div>
                        <span class="beca-badge beca-${client.tipoBeca.toLowerCase()}">Beca ${client.tipoBeca}</span>
                    </div>
                    <div class="client-actions">
                        <button class="btn-icon" onclick="openEditClientModal('${client.id}')" title="Editar">
                          <svg class="svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="btn-icon" onclick="openDeleteClientModal('${client.id}')" title="Eliminar">
                          <svg class="svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                    </div>
                </div>
                
        <div class="client-info">
          <div class="info-item" style="align-items:center; gap:0.5rem;">
            <span class="info-label">DNI:</span>
            <span class="info-value">${client.dni}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Carrera:</span>
            <span class="info-value">${client.carrera}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Instituto:</span>
            <span class="info-value client-institute">${client.instituto}</span>
          </div>
          <div class="info-item">
            <span class="info-label">N° Orden:</span>
            <span class="info-value client-order">${client.numeroOrden}</span>
          </div>
        </div>

                <div class="progress-section">
                    <div class="progress-header">
                        <span style="color: var(--text-muted);">Carillas usadas</span>
                        <span style="color: var(--text-primary); font-weight: 600;">${usedCarillas} / ${limit}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                        Restantes: <strong style="color: var(--text-primary);">${remaining} carillas</strong>
                    </div>
                </div>

                <div class="client-card-actions">
          <button class="btn btn-primary btn-small" onclick="openAddImpresionModal('${client.id}')">
            <svg class="svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M12 5v14M5 12h14"/></svg>
            Agregar Impresión
          </button>
          <button class="btn btn-secondary btn-small" onclick="openHistorialModal('${client.id}')">
            <svg class="svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/></svg>
            Historial
          </button>
                </div>
            </div>
        `
}

// Llamar initThemeToggle en DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle()
})

function setupEventListeners() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    renderClients(e.target.value)
  })

  document.getElementById("turnoSelect").addEventListener("change", (e) => {
    currentTurno = e.target.value
    saveData()
    if (typeof updateTurnoAttention === 'function') updateTurnoAttention()
  })

  document.getElementById("cantidadCarillas").addEventListener("input", (e) => {
    validateImpresionAmount()
  })

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal.id)
      }
    })
  })

  

  const btnDownload = document.getElementById('btnDownload')
  if (btnDownload) btnDownload.addEventListener('click', () => {
    initializeYearFilter()
    openModal('downloadModal')
  })

  const btnStats = document.getElementById('btnStats')
  if (btnStats) btnStats.addEventListener('click', () => openStatsModal())
  const btnRefresh = document.getElementById('btnRefresh')
  if (btnRefresh) btnRefresh.addEventListener('click', async () => {
    setSyncStatus('warning')
    showToast('Iniciando sincronización con Realtime Database...', 'warning')
    try {
      // Primero intentar empujar locales si existe la utilidad
      if (window.forcePushLocalsToRTDB) {
        await window.forcePushLocalsToRTDB()
      }
      // Luego traer snapshot remoto y actualizar UI
      const ok = await fetchRemoteClientsOnce()
      if (ok) {
        showToast('Sincronización RTDB completada', 'success')
        setSyncStatus('online')
        return
      }
      // Si no se pudo obtener remoto, recargar locales
      loadData()
      renderClients()
      setSyncStatus('offline')
      showToast('Sincronización incompleta — recargando locales', 'warning')
    } catch (err) {
      console.error('Error durante sincronización manual RTDB:', err)
      setSyncStatus('offline')
      showToast('Error durante sincronización: ' + (err && err.message ? err.message : ''), 'error')
    }
  })

  // Floating search input sync
  const floatingInput = document.getElementById('floatingSearchInput')
  const mainSearch = document.getElementById('searchInput')
  if (floatingInput && mainSearch) {
    floatingInput.addEventListener('input', (e) => { mainSearch.value = e.target.value; renderClients(e.target.value) })
    mainSearch.addEventListener('input', (e) => { floatingInput.value = e.target.value })
  }

  // Back to top button
  const backToTop = document.getElementById('backToTop')
  if (backToTop) {
    backToTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }) })
  }

  // Scroll handlers: show floating search when main search scrolls away, and show back-to-top
  let lastKnownScrollY = 0
  let ticking = false
  const floating = document.getElementById('floatingSearch')
  // reuse `mainSearch` declared earlier
  window.addEventListener('scroll', () => {
    lastKnownScrollY = window.scrollY
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const showFloating = (() => {
          if (!mainSearch || !floating) return false
          const rect = mainSearch.getBoundingClientRect()
          return rect.bottom < 0
        })()
        if (floating) floating.setAttribute('aria-hidden', showFloating ? 'false' : 'true')
        const back = document.getElementById('backToTop')
        if (back) {
          if (lastKnownScrollY > 100) back.classList.add('show')
          else back.classList.remove('show')
        }
        ticking = false
      })
      ticking = true
    }
  })

  // when floating search is visible and user types, sync is already wired above; focus behavior:
  if (floating) {
    floating.addEventListener('click', () => {
      const fi = document.getElementById('floatingSearchInput')
      if (fi) fi.focus()
    })
  }

  // Paginación: selector de tamaño de página
  const pageSizeSelect = document.getElementById('pageSizeSelect')
  if (pageSizeSelect) {
    // inicializar con valor guardado si existe
    const saved = Number(localStorage.getItem('pageSize') || '6')
    if ([6,9,12,15,18].includes(saved)) {
      pageSize = saved
      pageSizeSelect.value = String(saved)
    }
    pageSizeSelect.addEventListener('change', (e) => {
      const v = Number(e.target.value) || 6
      pageSize = Math.min(18, Math.max(6, v))
      localStorage.setItem('pageSize', String(pageSize))
      currentPage = 1
      renderClients(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '')
    })
  }

  // Delegado para clicks en paginación
  document.addEventListener('click', (e) => {
    try {
      const btn = e.target.closest && e.target.closest('[data-page-action]')
      if (!btn) return
      const action = btn.getAttribute('data-page-action')
      const pageAttr = btn.getAttribute('data-page')
      const totalPages = Number(btn.getAttribute('data-total-pages')) || null

      if (action === 'first') { currentPage = 1 }
      else if (action === 'last' && totalPages) { currentPage = totalPages }
      else if (action === 'prev') { currentPage = Math.max(1, currentPage - 1) }
      else if (action === 'next' && totalPages) { currentPage = Math.min(totalPages, currentPage + 1) }
      else if (action === 'goto' && pageAttr) { currentPage = Math.max(1, Number(pageAttr)) }

      renderClients(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '')
      // mantener el foco razonable
      e.preventDefault()
    } catch (err) {
      // ignore
    }
  })

  // Atajos de teclado para paginación: Ctrl + ArrowLeft / ArrowRight
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return
    if (e.key === 'ArrowLeft') {
      // ir a pagina anterior
      const newPage = Math.max(1, currentPage - 1)
      if (newPage !== currentPage) {
        currentPage = newPage
        animatePageChange()
      }
      e.preventDefault()
    } else if (e.key === 'ArrowRight') {
      // necesitamos calcular totalPages basados en los filtros actuales
      // replicar brevemente la lógica de filtrado para determinar totalPages
      let filteredLen = clients.length
      const searchInput = document.getElementById('searchInput')
      const term = searchInput ? (searchInput.value || '').toString().toLowerCase() : ''
      if (term) filteredLen = clients.filter(c => (c.nombreApellido||'').toLowerCase().includes(term) || (c.dni||'').includes(term)).length
      // aplicar filtros de currentFilters (tipoBeca/instituto/mes/ano/turno)
      if (currentFilters && Object.keys(currentFilters).length > 0) {
        let tmp = [...clients]
        if (currentFilters.tipoBeca) tmp = tmp.filter(c => c.tipoBeca === currentFilters.tipoBeca)
        if (currentFilters.instituto) tmp = tmp.filter(c => c.instituto === currentFilters.instituto)
        if (currentFilters.mes || currentFilters.ano || currentFilters.turno) {
          const clientsWithImpresiones = new Set()
          impresiones.forEach(imp => {
            const impDate = new Date(imp.fecha)
            let matches = true
            if (currentFilters.mes && impDate.getMonth() + 1 !== Number.parseInt(currentFilters.mes)) matches = false
            if (currentFilters.ano && impDate.getFullYear() !== Number.parseInt(currentFilters.ano)) matches = false
            if (currentFilters.turno && imp.turno !== currentFilters.turno) matches = false
            if (matches) clientsWithImpresiones.add(imp.clienteId)
          })
          tmp = tmp.filter(c => clientsWithImpresiones.has(c.id))
        }
        // apply search term on tmp
        if (term) tmp = tmp.filter(c => (c.nombreApellido||'').toLowerCase().includes(term) || (c.dni||'').includes(term))
        filteredLen = tmp.length
      }

      const totalPages = Math.max(1, Math.ceil(filteredLen / pageSize))
      const newPage = Math.min(totalPages, currentPage + 1)
      if (newPage !== currentPage) {
        currentPage = newPage
        animatePageChange()
      }
      e.preventDefault()
    }
  })
}

function loadData() {
  const savedClients = localStorage.getItem("becaClients")
  const savedImpresiones = localStorage.getItem("becaImpresiones")
  const savedTurno = localStorage.getItem("currentTurno")

  if (savedClients) clients = JSON.parse(savedClients)
  if (savedImpresiones) impresiones = JSON.parse(savedImpresiones)
  if (savedTurno) currentTurno = savedTurno

  if (window.AppFirebase && window.AppFirebase.db) {
    setupFirebaseSync()
  }
}

async function setupFirebaseSync() {
  try {
    const { db, ref, onValue, get, set, push, update, remove } = window.AppFirebase

    const clientsRef = ref(db, 'clients')
    const impresionesRef = ref(db, 'impresiones')

    // Inicial: si no hay datos remotos pero hay locales, subirlos
    try {
      const snapClients = await get(clientsRef)
      const remoteClients = snapClients.exists() ? snapClients.val() : null
      console.log('RTDB: clientes remotos leídos, exist:', !!remoteClients, 'keys:', remoteClients ? Object.keys(remoteClients).length : 0)
      if ((!remoteClients || Object.keys(remoteClients).length === 0) && Array.isArray(clients) && clients.length > 0) {
        console.log('RTDB vacía y hay clientes locales. Intentando subir', clients.length, 'clientes...')
        let pushed = 0
        let pushErrors = 0
        for (const c of clients) {
          try {
            await set(ref(db, `clients/${c.id}`), c)
            pushed++
          } catch (e) {
            pushErrors++
            console.warn('Error subiendo cliente local a RTDB', c.id, e)
          }
        }
        console.log(`RTDB: subida finalizada. exitosos=${pushed} errores=${pushErrors}`)
        if (pushErrors > 0) showToast(`Algunos clientes no pudieron subirse a RTDB (ver consola)`, 'warning')
      } else if (remoteClients && Object.keys(remoteClients).length > 0 && clients.length === 0) {
        // poblar locales con remotos
        clients = Object.keys(remoteClients).map(k => ({ id: k, ...remoteClients[k] }))
        localStorage.setItem('becaClients', JSON.stringify(clients))
      }
    } catch (err) {
      console.warn('Error comprobando clientes remotos RTDB inicial', err)
      // Mostrar mensaje para ayudar a diagnosticar problemas de permisos
      console.warn('Asegúrate en Firebase Console > Realtime Database > Rules que permite lectura/escritura desde cliente durante pruebas. Ejemplo temporal: {"rules": {".read": true, ".write": true}}')
    }

    try {
      const snapImpres = await get(impresionesRef)
      const remoteImpres = snapImpres.exists() ? snapImpres.val() : null
      console.log('RTDB: impresiones remotas leídas, exist:', !!remoteImpres, 'keys:', remoteImpres ? Object.keys(remoteImpres).length : 0)
      if ((!remoteImpres || Object.keys(remoteImpres).length === 0) && Array.isArray(impresiones) && impresiones.length > 0) {
        console.log('RTDB impresiones vacía y hay impresiones locales. Intentando subir', impresiones.length, 'registros...')
        let pushedI = 0
        let pushErrorsI = 0
        for (const im of impresiones) {
          try {
            await set(ref(db, `impresiones/${im.id}`), im)
            pushedI++
          } catch (e) {
            pushErrorsI++
            console.warn('Error subiendo impresion local a RTDB', im.id, e)
          }
        }
        console.log(`RTDB: impresiones subida finalizada. exitosos=${pushedI} errores=${pushErrorsI}`)
        if (pushErrorsI > 0) showToast(`Algunas impresiones no pudieron subirse a RTDB (ver consola)`, 'warning')
      } else if (remoteImpres && Object.keys(remoteImpres).length > 0 && impresiones.length === 0) {
        impresiones = Object.keys(remoteImpres).map(k => ({ id: k, ...remoteImpres[k] }))
        localStorage.setItem('becaImpresiones', JSON.stringify(impresiones))
      }
    } catch (err) {
      console.warn('Error comprobando impresiones remotas RTDB inicial', err)
    }

    // Listeners: actualizar locales cuando cambian remotos (onValue escucha la rama completa)
    onValue(clientsRef, (snapshot) => {
      const val = snapshot.exists() ? snapshot.val() : null
      if (!val) return
      const remoteClients = Object.keys(val).map(k => ({ id: k, ...val[k] }))
      clients = remoteClients
      console.log('RTDB onValue: clients actualizados desde remoto, total=', clients.length)
      localStorage.setItem('becaClients', JSON.stringify(clients))
      setSyncStatus('online')
      renderClients()
    })

    onValue(impresionesRef, (snapshot) => {
      const val = snapshot.exists() ? snapshot.val() : null
      if (!val) return
      const remoteImpres = Object.keys(val).map(k => ({ id: k, ...val[k] }))
      impresiones = remoteImpres
      console.log('RTDB onValue: impresiones actualizadas desde remoto, total=', impresiones.length)
      localStorage.setItem('becaImpresiones', JSON.stringify(impresiones))
      setSyncStatus('online')
      renderClients()
    })

    setSyncStatus('online')

    console.log('Suscripciones RTDB activas (setupFirebaseSync)')
  } catch (err) {
    console.warn('Error configurando sincronización con Firebase:', err)
    setSyncStatus('offline')
  }
}

// Utilidad para forzar subir locales a RTDB desde consola: window.forcePushLocalsToRTDB()
window.forcePushLocalsToRTDB = async function() {
  if (!window.AppFirebase || !window.AppFirebase.db) { console.warn('RTDB no inicializado'); return }
  const { db, ref, set, get } = window.AppFirebase
  try {
    const clientsLocal = JSON.parse(localStorage.getItem('becaClients') || '[]')
    if (!Array.isArray(clientsLocal) || clientsLocal.length === 0) { console.log('No hay clientes locales para subir'); return }
    console.log('Forzando subida de', clientsLocal.length, 'clientes a RTDB...')
    let ok = 0, errCount = 0
    for (const c of clientsLocal) {
      try { await set(ref(db, `clients/${c.id}`), c); ok++ } catch (e) { console.error('Error subiendo', c.id, e); errCount++ }
    }
    console.log(`forcePushLocalsToRTDB finalizado. exitosos=${ok} errores=${errCount}`)
    if (errCount > 0) showToast('Algunos items no pudieron subirse (ver consola)', 'warning')
    else showToast('Locales subidos a RTDB', 'success')
  } catch (e) { console.error('forcePushLocalsToRTDB error', e); showToast('Error subiendo locales (ver consola)', 'error') }
}

// Trae una snapshot puntual de la colección 'clients' desde Firestore
async function fetchRemoteClientsOnce() {
  if (!window.AppFirebase || !window.AppFirebase.db) return false
  try {
    const { db, ref, get } = window.AppFirebase
    const colRef = ref(db, 'clients')
    const snap = await get(colRef)
    if (!snap || !snap.exists()) {
      return false
    }
    const val = snap.val()
    const remoteClients = Object.keys(val).map(k => ({ id: k, ...val[k] }))
    clients = remoteClients
    localStorage.setItem('becaClients', JSON.stringify(clients))
    setSyncStatus('online')
    renderClients()
    return true
  } catch (err) {
    console.warn('fetchRemoteClientsOnce error', err)
    setSyncStatus('offline')
    return false
  }
}

function setSyncStatus(state) {
  const el = document.getElementById('syncStatus')
  if (!el) return
  el.classList.remove('sync-online', 'sync-offline', 'sync-warning')
  if (state === 'online') {
    el.classList.add('sync-online')
    el.textContent = 'Sincronizado con Firebase'
    el.title = 'Conectado: sincronización en tiempo real activa'
  } else if (state === 'warning') {
    el.classList.add('sync-warning')
    el.textContent = 'Sincronizando...'
    el.title = 'Sincronización en curso'
  } else {
    el.classList.add('sync-offline')
    el.textContent = 'Modo offline'
    el.title = 'Sin conexión con Firestore — trabajando en local'
  }
}

async function saveClientToFirestore(client) {
  // Ahora escribe en Realtime Database bajo /clients/{id}
  if (!window.AppFirebase || !window.AppFirebase.db) {
    console.log('saveClientToFirestore (RTDB): Firebase no disponible, skip')
    return
  }
  const { db, ref, set } = window.AppFirebase
  try {
    await set(ref(db, `clients/${client.id}`), client)
    console.log('Cliente guardado en RTDB:', client.id)
  } catch (err) {
    console.error('Error guardando cliente en RTDB', err)
  }
}

// Comprueba si un DNI ya existe en Firestore (excluyendo opcionalmente un id dado)
async function checkDniExistsRemote(dni, excludeId = null) {
  if (!window.AppFirebase || !window.AppFirebase.db) return false
  try {
    const { db, ref, get } = window.AppFirebase
    const snap = await get(ref(db, 'clients'))
    if (!snap || !snap.exists()) return false
    const val = snap.val()
    for (const k of Object.keys(val)) {
      const c = val[k]
      if (String(c.dni) === String(dni) && (!excludeId || k !== excludeId)) return true
    }
    return false
  } catch (err) {
    console.warn('checkDniExistsRemote error', err)
    return false
  }
}

// Normaliza strings para comparar (trim)
function normalizeStr(s) {
  return (s || '').toString().trim()
}

// Comprueba localmente si ya existe número de orden en el mismo 'libro' (instituto + tipoBeca)
function isOrderConflictLocal(instituto, tipoBeca, numeroOrden, excludeId = null) {
  const ni = normalizeStr(instituto)
  const tb = (tipoBeca || '').toString().toUpperCase()
  const no = Number.parseInt(numeroOrden) || 0
  return clients.some(c => {
    if (excludeId && c.id === excludeId) return false
    return Number.parseInt(c.numeroOrden) === no && normalizeStr(c.instituto) === ni && (c.tipoBeca || '').toString().toUpperCase() === tb
  })
}

// Comprueba remoto (Firestore) si ya existe número de orden en el mismo 'libro'
async function checkOrderExistsRemote(instituto, tipoBeca, numeroOrden, excludeId = null) {
  if (!window.AppFirebase || !window.AppFirebase.db) return false
  try {
    const { db, ref, get } = window.AppFirebase
    const snap = await get(ref(db, 'clients'))
    if (!snap || !snap.exists()) return false
    const val = snap.val()
    const ni = normalizeStr(instituto)
    const tb = (tipoBeca || '').toString().toUpperCase()
    const no = Number.parseInt(numeroOrden) || 0
    for (const k of Object.keys(val)) {
      const c = val[k]
      if (excludeId && k === excludeId) continue
      if (Number.parseInt(c.numeroOrden) === no && normalizeStr(c.instituto) === ni && (c.tipoBeca || '').toString().toUpperCase() === tb) return true
    }
    return false
  } catch (err) {
    console.warn('checkOrderExistsRemote error', err)
    return false
  }
}

async function deleteClientFromFirestore(clientId) {
  // Ahora borra en RTDB: /clients/{id} y las impresiones asociadas en /impresiones
  if (!window.AppFirebase || !window.AppFirebase.db) {
    console.log('deleteClientFromFirestore (RTDB): Firebase no disponible, skip')
    return
  }
  const { db, ref, get, remove } = window.AppFirebase
  try {
    try {
      const snap = await get(ref(db, 'impresiones'))
      if (snap && snap.exists()) {
        const val = snap.val()
        for (const k of Object.keys(val)) {
          if (val[k] && val[k].clienteId === clientId) {
            try { await remove(ref(db, `impresiones/${k}`)) } catch (e) { console.warn('Error eliminando impresion asociada', e) }
          }
        }
        console.log('Impresiones asociadas eliminadas en RTDB para cliente:', clientId)
      }
    } catch (err) {
      console.warn('Error eliminando impresiones asociadas en RTDB (continuando):', err)
    }

    await remove(ref(db, `clients/${clientId}`))
    console.log('Cliente eliminado en RTDB:', clientId)
  } catch (err) {
    console.error('Error eliminando cliente en RTDB', err)
  }
}

async function saveImpresionToFirestore(imp) {
  if (!window.AppFirebase || !window.AppFirebase.db) {
    console.log('saveImpresionToFirestore (RTDB): Firebase no disponible, skip')
    return
  }
  const { db, ref, set } = window.AppFirebase
  try {
    await set(ref(db, `impresiones/${imp.id}`), imp)
    console.log('Impresion guardada en RTDB:', imp.id)
  } catch (err) {
    console.error('Error guardando impresion en RTDB', err)
  }
}

async function deleteImpresionFromFirestore(id) {
  if (!window.AppFirebase || !window.AppFirebase.db) {
    console.log('deleteImpresionFromFirestore (RTDB): Firebase no disponible, skip')
    return
  }
  const { db, ref, remove } = window.AppFirebase
  try {
    await remove(ref(db, `impresiones/${id}`))
    console.log('Impresion eliminada en RTDB:', id)
  } catch (err) {
    console.error('Error eliminando impresion en RTDB', err)
  }
}

function saveData() {
  localStorage.setItem("becaClients", JSON.stringify(clients))
  localStorage.setItem("becaImpresiones", JSON.stringify(impresiones))
  localStorage.setItem("currentTurno", currentTurno)
}

document.addEventListener('keydown', (e) => {
  const isMod = e.ctrlKey || e.metaKey
  if (isMod && (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    const input = document.getElementById('searchInput')
    if (input) { input.focus(); input.select() }
  }
})

function handleAddClient(event) {
  event.preventDefault()

  const formData = {
    id: Date.now().toString(),
    nombreApellido: document.getElementById("nombreApellido").value,
    dni: document.getElementById("dni").value,
    carrera: document.getElementById("carrera").value,
    instituto: document.getElementById("instituto").value,
    tipoBeca: document.getElementById("tipoBeca").value,
    numeroOrden: Number.parseInt(document.getElementById("numeroOrden").value),
    fechaRegistro: new Date().toISOString(),
  }

  // Verificar localmente primero
  if (clients.some((c) => c.dni === formData.dni)) {
    showToast("Ya existe un cliente con este DNI (local)", "error")
    return
  }

  // Si Firebase está disponible, verificar remoto también
  if (window.AppFirebase && window.AppFirebase.db) {
    // comprobar remotamente si existe el DNI y el número de orden en el mismo libro
    checkDniExistsRemote(formData.dni).then((exists) => {
      if (exists) {
        showToast('Ya existe un cliente con este DNI (remoto)', 'error')
        return
      }
      // comprobar número de orden remoto
      checkOrderExistsRemote(formData.instituto, formData.tipoBeca, formData.numeroOrden).then((orderExists) => {
        if (orderExists) {
          showToast('Ya existe un cliente con este número de orden en ese instituto y tipo de beca (remoto)', 'error')
          return
        }
        // Si no hay conflictos remotos, continuar
        clients.push(formData)
        saveData()
        saveClientToFirestore(formData)
        renderClients()
        closeModal("addClientModal")
        document.getElementById("addClientForm").reset()
        showToast("Cliente agregado exitosamente", "success")
      }).catch(() => {
        showToast('Error verificando número de orden en remoto — operación cancelada', 'error')
      })
    }).catch(() => {
      showToast('Error verificando DNI en remoto — operación cancelada', 'error')
    })
    return
  }

  // Validación local de numero de orden
  if (isOrderConflictLocal(formData.instituto, formData.tipoBeca, formData.numeroOrden)) {
    showToast("Ya existe un cliente con este número de orden en el mismo instituto y tipo de beca", "error")
    return
  }

  // Si no hay Firebase, el flujo local ya fue validado arriba
  clients.push(formData)
  saveData()
  saveClientToFirestore(formData)
  renderClients()
  closeModal("addClientModal")
  document.getElementById("addClientForm").reset()
  showToast("Cliente agregado exitosamente", "success")
}

function openEditClientModal(clientId) {
  const client = clients.find((c) => c.id === clientId)
  if (!client) return

  document.getElementById("editClientId").value = client.id
  document.getElementById("editNombreApellido").value = client.nombreApellido
  document.getElementById("editDni").value = client.dni
  document.getElementById("editCarrera").value = client.carrera
  document.getElementById("editInstituto").value = client.instituto
  document.getElementById("editTipoBeca").value = client.tipoBeca
  document.getElementById("editNumeroOrden").value = client.numeroOrden

  openModal("editClientModal")
}

function handleEditClient(event) {
  event.preventDefault()

  const clientId = document.getElementById("editClientId").value
  const clientIndex = clients.findIndex((c) => c.id === clientId)

  if (clientIndex === -1) return

  const formData = {
    ...clients[clientIndex],
    nombreApellido: document.getElementById("editNombreApellido").value,
    dni: document.getElementById("editDni").value,
    carrera: document.getElementById("editCarrera").value,
    instituto: document.getElementById("editInstituto").value,
    tipoBeca: document.getElementById("editTipoBeca").value,
    numeroOrden: Number.parseInt(document.getElementById("editNumeroOrden").value),
  }

  // Verificar conflictos locales
  if (clients.some((c) => c.dni === formData.dni && c.id !== clientId)) {
    showToast("Ya existe un cliente con este DNI (local)", "error")
    return
  }

  // Verificar remoto si Firebase está disponible
  if (window.AppFirebase && window.AppFirebase.db) {
    checkDniExistsRemote(formData.dni, clientId).then((exists) => {
      if (exists) {
        showToast('Ya existe un cliente con este DNI (remoto)', 'error')
        return
      }
      // verificar conflicto de numero de orden remoto (excluir el propio id)
      checkOrderExistsRemote(formData.instituto, formData.tipoBeca, formData.numeroOrden, clientId).then((orderExists) => {
        if (orderExists) {
          showToast('Ya existe un cliente con este número de orden en ese instituto y tipo de beca (remoto)', 'error')
          return
        }
        // aplicar cambios
        clients[clientIndex] = formData
        saveData()
        saveClientToFirestore(formData)
        renderClients()
        closeModal("editClientModal")
        showToast("Cliente actualizado exitosamente", "success")
      }).catch(() => {
        showToast('Error verificando número de orden en remoto — operación cancelada', 'error')
      })
    }).catch(() => {
      showToast('Error verificando DNI en remoto — operación cancelada', 'error')
    })
    return
  }

  if (
    clients.some(
      (c) =>
        c.numeroOrden === formData.numeroOrden &&
        c.instituto === formData.instituto &&
        c.tipoBeca === formData.tipoBeca &&
        c.id !== clientId,
    )
  ) {
    showToast("Ya existe un cliente con este número de orden en el mismo instituto y tipo de beca", "error")
    return
  }
  // Validación local adicional usando helper (excluir propio id)
  if (isOrderConflictLocal(formData.instituto, formData.tipoBeca, formData.numeroOrden, clientId)) {
    showToast("Ya existe un cliente con este número de orden en el mismo instituto y tipo de beca", "error")
    return
  }

  // Si no hay Firebase, aplicar cambios localmente
  clients[clientIndex] = formData
  saveData()
  saveClientToFirestore(formData)
  renderClients()
  closeModal("editClientModal")
  showToast("Cliente actualizado exitosamente", "success")
}

function openDeleteClientModal(clientId) {
  const client = clients.find((c) => c.id === clientId)
  if (!client) return

  clientToDelete = clientId
  document.getElementById("deleteClientName").textContent = client.nombreApellido
  openModal("deleteClientModal")
}

function confirmDeleteClient() {
  if (!clientToDelete) return

  clients = clients.filter((c) => c.id !== clientToDelete)
  impresiones = impresiones.filter((i) => i.clienteId !== clientToDelete)

  saveData()
  deleteClientFromFirestore(clientToDelete)
  renderClients()
  closeModal("deleteClientModal")
  showToast("Cliente eliminado exitosamente", "success")
  clientToDelete = null
}

function openAddImpresionModal(clientId) {
  const client = clients.find((c) => c.id === clientId)
  if (!client) return

  const usedCarillas = getUsedCarillasThisMonth(clientId)
  const limit = BECA_LIMITS[client.tipoBeca]
  const remaining = limit - usedCarillas

  document.getElementById("impresionClientId").value = clientId
  document.getElementById("impresionClientName").textContent = client.nombreApellido
  document.getElementById("impresionBecaType").textContent = `Tipo ${client.tipoBeca}`
  document.getElementById("impresionLimit").textContent = `${limit} carillas`
  document.getElementById("impresionRemaining").textContent = `${remaining} carillas`
  document.getElementById("cantidadCarillas").value = ""
  document.getElementById("warningMessage").style.display = "none"

  openModal("addImpresionModal")
}

function validateImpresionAmount() {
  const clientId = document.getElementById("impresionClientId").value
  const cantidad = Number.parseInt(document.getElementById("cantidadCarillas").value) || 0

  const client = clients.find((c) => c.id === clientId)
  if (!client) return

  const usedCarillas = getUsedCarillasThisMonth(clientId)
  const limit = BECA_LIMITS[client.tipoBeca]
  const remaining = limit - usedCarillas

  const warningMessage = document.getElementById("warningMessage")
  if (cantidad > remaining) {
    warningMessage.style.display = "block"
  } else {
    warningMessage.style.display = "none"
  }
}

function handleAddImpresion(event) {
  event.preventDefault()

  const clientId = document.getElementById("impresionClientId").value
  const cantidad = Number.parseInt(document.getElementById("cantidadCarillas").value)

  const client = clients.find((c) => c.id === clientId)
  if (!client) return

  const usedCarillas = getUsedCarillasThisMonth(clientId)
  const limit = BECA_LIMITS[client.tipoBeca]
  const remaining = limit - usedCarillas

  if (cantidad > remaining) {
    showToast("La cantidad excede el límite mensual del cliente", "error")
    return
  }

  const impresion = {
    id: Date.now().toString(),
    clienteId: clientId,
    cantidad: cantidad,
    fecha: new Date().toISOString(),
    turno: currentTurno,
  }

  impresiones.push(impresion)
  saveData()
  saveImpresionToFirestore(impresion)
  renderClients()
  closeModal("addImpresionModal")
  showToast("Impresión registrada exitosamente", "success")
}

function getUsedCarillasThisMonth(clientId) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  return impresiones
    .filter((i) => {
      const impresionDate = new Date(i.fecha)
      return (
        i.clienteId === clientId &&
        impresionDate.getMonth() === currentMonth &&
        impresionDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, i) => sum + i.cantidad, 0)
}

function openHistorialModal(clientId) {
  const client = clients.find((c) => c.id === clientId)
  if (!client) return

  currentHistorialClientId = clientId

  const clientImpresiones = impresiones
    .filter((i) => i.clienteId === clientId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  const historialContent = document.getElementById("historialContent")

  if (clientImpresiones.length === 0) {
    historialContent.innerHTML =
      '<p style="text-align: center; color: var(--text-muted);">No hay impresiones registradas</p>'
  } else {
    historialContent.innerHTML = clientImpresiones
      .map((imp) => {
        const fecha = new Date(imp.fecha)
        return `
                <div class="historial-item" data-impresion-id="${imp.id}">
                    <div class="historial-header">
                        <span>
                          <div class="historial-date">${fecha.toLocaleDateString("es-AR")} ${fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</div>
                          <div class="historial-turno" style="color: var(--text-muted); font-size:0.85rem">Turno: ${imp.turno}</div>
                        </span>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                          <div class="historial-carillas">${imp.cantidad} carillas</div>
                          <button class="btn-icon historial-delete" title="Eliminar impresión" data-impresion-id="${imp.id}">
                            <svg class="svg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                    </div>
                </div>
            `
      })
      .join("")
  }

  openModal("historialModal")
  
  document.querySelectorAll('.historial-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-impresion-id')
      if (!id) return
      if (confirm('¿Eliminar esta impresión y restar las carillas?')) {
        deleteImpresionById(id)
      }
    })
  })
}

function deleteImpresionById(impresionId) {
  const index = impresiones.findIndex(i => i.id === impresionId)
  if (index === -1) return

  impresiones.splice(index, 1)
  saveData()
  deleteImpresionFromFirestore(impresionId)
  renderClients()

  const historialModal = document.getElementById('historialModal')
  if (historialModal && historialModal.classList.contains('active')) {
    if (currentHistorialClientId) {
      openHistorialModal(currentHistorialClientId)
    }
  }

  showToast('Impresión eliminada y carillas actualizadas', 'success')
}

function openStatsModal() {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthImpresiones = impresiones.filter((i) => {
    const impresionDate = new Date(i.fecha)
    return impresionDate.getMonth() === currentMonth && impresionDate.getFullYear() === currentYear
  })

  const totalCarillas = monthImpresiones.reduce((sum, i) => sum + i.cantidad, 0)
  const clientesActivos = new Set(monthImpresiones.map((i) => i.clienteId)).size
  const promedioCarillas = clientesActivos > 0 ? Math.round(totalCarillas / clientesActivos) : 0

  const becaStats = {
    A: monthImpresiones
      .filter((i) => {
        const client = clients.find((c) => c.id === i.clienteId)
        return client && client.tipoBeca === "A"
      })
      .reduce((sum, i) => sum + i.cantidad, 0),
    B: monthImpresiones
      .filter((i) => {
        const client = clients.find((c) => c.id === i.clienteId)
        return client && client.tipoBeca === "B"
      })
      .reduce((sum, i) => sum + i.cantidad, 0),
    C: monthImpresiones
      .filter((i) => {
        const client = clients.find((c) => c.id === i.clienteId)
        return client && client.tipoBeca === "C"
      })
      .reduce((sum, i) => sum + i.cantidad, 0),
  }

  const statsContent = document.getElementById("statsContent")
  statsContent.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total de Carillas</div>
                <div class="stat-value">${totalCarillas}</div>
                <div class="stat-subtitle">Este mes</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Clientes Activos</div>
                <div class="stat-value">${clientesActivos}</div>
                <div class="stat-subtitle">De ${clients.length} totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Promedio por Cliente</div>
                <div class="stat-value">${promedioCarillas}</div>
                <div class="stat-subtitle">Carillas</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total de Impresiones</div>
                <div class="stat-value">${monthImpresiones.length}</div>
                <div class="stat-subtitle">Registros</div>
            </div>
        </div>
        <div style="margin-top: 1.5rem;">
            <h4 style="margin-bottom: 1rem; color: var(--text-secondary);">Por Tipo de Beca</h4>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Beca A</div>
                    <div class="stat-value">${becaStats.A}</div>
                    <div class="stat-subtitle">Carillas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Beca B</div>
                    <div class="stat-value">${becaStats.B}</div>
                    <div class="stat-subtitle">Carillas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Beca C</div>
                    <div class="stat-value">${becaStats.C}</div>
                    <div class="stat-subtitle">Carillas</div>
                </div>
            </div>
        </div>
    `

  openModal("statsModal")
}

function initializeYearFilter() {
  const yearSelect = document.getElementById("filterAno")
  const currentYear = new Date().getFullYear()

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const option = document.createElement("option")
    option.value = year
    option.textContent = year
    yearSelect.appendChild(option)
  }

  const downloadYear = document.getElementById('downloadAno')
  if (downloadYear) {
    downloadYear.innerHTML = ''
    const emptyOpt = document.createElement('option')
    emptyOpt.value = ''
    emptyOpt.textContent = 'Seleccionar año'
    downloadYear.appendChild(emptyOpt)
    for (let year = currentYear; year >= currentYear - 5; year--) {
      const option = document.createElement('option')
      option.value = year
      option.textContent = year
      downloadYear.appendChild(option)
    }
  }
}

function downloadMonthData() {
  const mes = document.getElementById('downloadMes').value
  const ano = document.getElementById('downloadAno').value

  if (!mes || !ano) {
    showToast('Seleccione mes y año para descargar', 'error')
    return
  }

  const month = Number.parseInt(mes) - 1
  const year = Number.parseInt(ano)

  const impresionesFiltradas = impresiones.filter(i => {
    const d = new Date(i.fecha)
    return d.getMonth() === month && d.getFullYear() === year
  })

  const rows = []
  impresionesFiltradas.forEach(i => {
    const client = clients.find(c => c.id === i.clienteId) || { nombreApellido: 'Desconocido', dni: '' }
    rows.push({
      fecha: i.fecha,
      cliente: client.nombreApellido,
      dni: client.dni,
      instituto: client.instituto || '',
      tipoBeca: client.tipoBeca || '',
      cantidad: i.cantidad,
      turno: i.turno || ''
    })
  })

  // CSV header
  const header = ['fecha','cliente','dni','instituto','tipoBeca','cantidad','turno']
  const csvContent = [header.join(',')].concat(rows.map(r => [
    `"${new Date(r.fecha).toLocaleString('es-AR')}"`,
    `"${(r.cliente || '').replace(/"/g,'""') }"`,
    `"${r.dni}"`,
    `"${(r.instituto || '').replace(/"/g,'""') }"`,
    `"${r.tipoBeca || ''}"`,
    r.cantidad,
    `"${r.turno || ''}"`
  ].join(','))).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `becas_${ano}_${mes}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  showToast('Descarga iniciada', 'success')
  closeModal('downloadModal')
}

function setupTurnoTimers() {
  setInterval(checkTurnoAlerts, 20 * 1000)
  checkTurnoAlerts()
}

function checkTurnoAlerts() {
  const now = new Date()
  const day = now.getDay()
  const hours = now.getHours()
  const minutes = now.getMinutes()

  const isWeekday = day >= 1 && day <= 5

  const turnoWrapper = document.querySelector('.turno-selector')

  if (isWeekday && hours === 13 && minutes === 45) {
    showToast('Cambio de turno en 15 minutos (14:00). Prepárense.', 'warning')
  }

  if (typeof updateTurnoAttention === 'function') updateTurnoAttention()

  if (day === 6) {
    const turnoSelect = document.getElementById('turnoSelect')
    if (turnoSelect) {
      turnoSelect.value = 'Unico'
      currentTurno = 'Unico'
      saveData()
    }
    if (typeof updateTurnoAttention === 'function') updateTurnoAttention()
  }
}

// Centraliza la lógica que decide si el selector de turno debe resaltarse en naranja
function updateTurnoAttention() {
  const turnoWrapper = document.querySelector('.turno-selector')
  const turnoSelect = document.getElementById('turnoSelect')
  if (!turnoWrapper || !turnoSelect) return

  const value = turnoSelect.value
  const now = new Date()
  const day = now.getDay()
  const isWeekday = day >= 1 && day <= 5
  const hours = now.getHours()

  // Nunca resaltar si está en 'Unico' o si no es día laborable
  if (value === 'Unico' || !isWeekday) {
    turnoWrapper.classList.remove('turno-attention')
    return
  }

  // Regla 1: si está seleccionado 'Mañana' y son las 14:00 o más -> resaltar
  if (value === 'Mañana' && hours >= 14) {
    turnoWrapper.classList.add('turno-attention')
    turnoWrapper.setAttribute('title', 'Atención: turno Mañana fuera de horario esperado. Verificar.')
    turnoWrapper.setAttribute('aria-describedby', 'turno-warning')
    return
  }

  // Regla 2: si está seleccionado 'Tarde' y son antes de las 14:00 -> resaltar
  if (value === 'Tarde' && hours < 14) {
    turnoWrapper.classList.add('turno-attention')
    turnoWrapper.setAttribute('title', 'Atención: turno Tarde fuera de horario esperado. Verificar.')
    turnoWrapper.setAttribute('aria-describedby', 'turno-warning')
    return
  }

  // En cualquier otro caso quitar el resalte
  turnoWrapper.classList.remove('turno-attention')
  // remover atributos de accesibilidad/tooltip si existían
  turnoWrapper.removeAttribute('title')
  turnoWrapper.removeAttribute('aria-describedby')
}

function openFiltersModal() {
  openModal("filtersModal")
}

function applyFilters() {
  currentFilters = {
    mes: document.getElementById("filterMes").value,
    ano: document.getElementById("filterAno").value,
    turno: document.getElementById("filterTurno").value,
    tipoBeca: document.getElementById("filterTipoBeca").value,
    instituto: document.getElementById("filterInstituto").value,
  }

  renderClients()
  closeModal("filtersModal")
  showToast("Filtros aplicados", "success")
}

function clearFilters() {
  currentFilters = {}
  document.getElementById("filtersForm").reset()
  renderClients()
  closeModal("filtersModal")
  showToast("Filtros limpiados", "success")
}

// Función de reinicio de mes
function openResetMonthModal() {
  openModal("resetMonthModal")
}

function confirmResetMonth() {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Eliminar impresiones del mes actual
  impresiones = impresiones.filter((i) => {
    const impresionDate = new Date(i.fecha)
    return !(impresionDate.getMonth() === currentMonth && impresionDate.getFullYear() === currentYear)
  })

  saveData()
  renderClients()
  closeModal("resetMonthModal")
  showToast("Mes reiniciado exitosamente", "success")
}

// Renderizado
function renderClients(searchTerm = "") {
  let filteredClients = [...clients]

  // Aplicar búsqueda
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filteredClients = filteredClients.filter(
      (c) => c.nombreApellido.toLowerCase().includes(term) || c.dni.includes(term),
    )
  }
    // --- Modificaciones: resaltar instituto y número de orden, añadir copiar DNI y atajo Ctrl+F ---
    // Local helper: copia texto al portapapeles y muestra toast
    function copyToClipboard(text) {
      if (!navigator.clipboard) {
        // fallback
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy') } catch (e) {}
        document.body.removeChild(ta)
      } else {
        navigator.clipboard.writeText(text).catch(() => {})
      }
    }

    function copyDNI(dni) {
      if (!dni) return
      copyToClipboard(dni)
      showToast('DNI copiado al portapapeles', 'success')
    }

    document.addEventListener('keydown', (e) => {
      const isMod = e.ctrlKey || e.metaKey
      if (isMod && (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        const input = document.getElementById('searchInput')
        if (input) {
          input.focus()
          input.select()
        }
      }
    })

    window.copyDNI = copyDNI

  // Aplicar filtros
  if (currentFilters.tipoBeca) {
    filteredClients = filteredClients.filter((c) => c.tipoBeca === currentFilters.tipoBeca)
  }
  if (currentFilters.instituto) {
    filteredClients = filteredClients.filter((c) => c.instituto === currentFilters.instituto)
  }

  if (currentFilters.mes || currentFilters.ano || currentFilters.turno) {
    const clientsWithImpresiones = new Set()

    impresiones.forEach((imp) => {
      const impDate = new Date(imp.fecha)
      let matches = true

      if (currentFilters.mes && impDate.getMonth() + 1 !== Number.parseInt(currentFilters.mes)) {
        matches = false
      }
      if (currentFilters.ano && impDate.getFullYear() !== Number.parseInt(currentFilters.ano)) {
        matches = false
      }
      if (currentFilters.turno && imp.turno !== currentFilters.turno) {
        matches = false
      }

      if (matches) {
        clientsWithImpresiones.add(imp.clienteId)
      }
    })

    filteredClients = filteredClients.filter((c) => clientsWithImpresiones.has(c.id))
  }

  const clientCountEl = document.getElementById("clientCount")
  if (clientCountEl) clientCountEl.textContent = `${filteredClients.length} cliente${filteredClients.length !== 1 ? "s" : ""}`

  // actualizar texto del botón de filtros si hay filtros aplicados
  const btnFilters = document.getElementById('btnFilters')
  const hasFilters = Object.keys(currentFilters).some(k => currentFilters[k])
  if (btnFilters) btnFilters.textContent = hasFilters ? 'Filtros aplicados' : 'Filtros'

  const clientsList = document.getElementById("clientsList")

  if (filteredClients.length === 0) {
    clientsList.classList.add('empty')
    clientsList.innerHTML = `
      <div>
        <div style="font-weight:700; margin-bottom:0.5rem;">No hay clientes registrados aún</div>
        <div style="color: var(--text-muted);">Comienza agregando un nuevo cliente</div>
      </div>
    `
    return
  }

  clientsList.classList.remove('empty')

  // FLIP animation: capture first positions
  const firstRects = Array.from(clientsList.children).map(el => el.getBoundingClientRect())

  // usamos generateClientCardHtml global

  // Aplicar paginación (si showAllClients es true mostramos todos los filtrados)
  const totalItems = filteredClients.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  // Ajustar currentPage si quedó fuera de rango
  if (currentPage > totalPages) currentPage = totalPages

  let toRender = []
  if (showAllClients) {
    toRender = filteredClients
  } else {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    toRender = filteredClients.slice(start, end)
  }

  const html = toRender.map((client) => generateClientCardHtml(client)).join("")

  // Si no estamos mostrando todo y hay más que los mostrados por página, añadimos un pequeño aviso (opcional)
  clientsList.innerHTML = html

  // FLIP: measure last positions and animate
  const newChildren = Array.from(clientsList.children)
  const lastRects = newChildren.map(el => el.getBoundingClientRect())

  newChildren.forEach((el, i) => {
    const first = firstRects[i]
    const last = lastRects[i]
    if (!first || !last) return
    const dx = first.left - last.left
    const dy = first.top - last.top
    if (dx || dy) {
      el.style.transform = `translate(${dx}px, ${dy}px)`
      el.style.transition = 'transform 0s'
      requestAnimationFrame(() => {
        el.style.transition = 'transform 300ms cubic-bezier(.2,.8,.2,1)'
        el.style.transform = ''
      })
    }
  })

  // Si añadimos el botón para mostrar todo, enlazamos su evento
  const btnShowAll = document.getElementById('btnShowAllClients')
  if (btnShowAll) {
    btnShowAll.addEventListener('click', () => {
      revealAllClients(filteredClients)
    })
  }

  // Construir controles de paginación
  const paginationEl = document.getElementById('pagination')
  if (paginationEl) {
    // Helper para generar boton
    const makeBtn = (label, action, page = null, extraAttrs = '') => `<button class="btn btn-secondary" data-page-action="${action}" ${page !== null ? `data-page="${page}"` : ''} ${extraAttrs}>${label}</button>`

  // Limitar cantidad de botones numéricos mostrados y usar puntos suspensivos si es necesario
  // Ajustar dinámicamente según el ancho de la ventana para evitar scroll horizontal en móviles
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
  let maxButtons
  if (vw < 360) maxButtons = 3
  else if (vw < 420) maxButtons = 4
  else if (vw < 520) maxButtons = 5
  else if (vw < 768) maxButtons = 7
  else maxButtons = 9
    const parts = []
    parts.push(makeBtn('Primero', 'first', 1, `data-total-pages="${totalPages}"`))
    parts.push(makeBtn('Anterior', 'prev', null, `data-total-pages="${totalPages}"`))

    if (totalPages <= maxButtons) {
      // mostrar todos
      for (let p = 1; p <= totalPages; p++) {
        if (p === currentPage) parts.push(`<button class="btn btn-primary" aria-current="page" data-page-action="goto" data-page="${p}" data-total-pages="${totalPages}">${p}</button>`)
        else parts.push(makeBtn(p, 'goto', p, `data-total-pages="${totalPages}"`))
      }
    } else {
      // mostrar una ventana alrededor de currentPage, con ellipsis cuando corresponde
      const leftSiblingCount = Math.floor((maxButtons - 1) / 2)
      const rightSiblingCount = Math.ceil((maxButtons - 1) / 2)

      let left = Math.max(1, currentPage - leftSiblingCount)
      let right = Math.min(totalPages, currentPage + rightSiblingCount)

      // ajustar si nos acercamos a los extremos
      if (currentPage - left < leftSiblingCount) {
        right = Math.min(totalPages, right + (leftSiblingCount - (currentPage - left)))
      }
      if (right - currentPage < rightSiblingCount) {
        left = Math.max(1, left - (rightSiblingCount - (right - currentPage)))
      }

      // Asegurar que la ventana tenga tamaño maxButtons
      const windowSize = right - left + 1
      if (windowSize < maxButtons) {
        if (left === 1) right = Math.min(totalPages, left + maxButtons - 1)
        else if (right === totalPages) left = Math.max(1, right - maxButtons + 1)
      }

      // Si hay espacio antes de 'left', mostrar 1 y ellipsis
      if (left > 1) {
        parts.push(makeBtn(1, 'goto', 1, `data-total-pages="${totalPages}"`))
        if (left > 2) parts.push(`<span class="pagination-ellipsis">…</span>`)
      }

      for (let p = left; p <= right; p++) {
        if (p === currentPage) parts.push(`<button class="btn btn-primary" aria-current="page" data-page-action="goto" data-page="${p}" data-total-pages="${totalPages}">${p}</button>`)
        else parts.push(makeBtn(p, 'goto', p, `data-total-pages="${totalPages}"`))
      }

      // Si hay espacio después de 'right', mostrar ellipsis y última página
      if (right < totalPages) {
        if (right < totalPages - 1) parts.push(`<span class="pagination-ellipsis">…</span>`)
        parts.push(makeBtn(totalPages, 'goto', totalPages, `data-total-pages="${totalPages}"`))
      }
    }

    parts.push(makeBtn('Siguiente', 'next', null, `data-total-pages="${totalPages}"`))
    parts.push(makeBtn('Último', 'last', totalPages, `data-total-pages="${totalPages}"`))

  paginationEl.innerHTML = `<div class="pagination-inner">${parts.join('')}</div>`
  }

  // Animación de entrada secuencial solo en la primera render (o si no fue ejecutada aún)
  if (!_firstRenderDone) {
    // esperar a que el DOM pinte
    requestAnimationFrame(() => {
      animateInitialCards()
      _firstRenderDone = true
    })
  }

  // Si acabamos de renderizar por paginación, aplicar clase de entrada para animación general
  // (Esto también cubre render tras animatePageChange)
  // Solo aplicar esta animación de entrada cuando venimos de una paginación explícita
  // (evita duplicar la animación de entrada inicial). La bandera __justPaginated
  // la establece animatePageChange() justo antes de llamar a renderClients().
  if (__justPaginated) {
    // limpiar la bandera inmediatamente para futuros renders normales
    __justPaginated = false
    requestAnimationFrame(() => {
      const cards = Array.from(clientsList.querySelectorAll('[data-client-id]'))
      cards.forEach((c, idx) => {
        c.classList.remove('page-enter', 'page-enter-active')
        c.classList.add('page-enter')
        // forzar reflow
        void c.offsetWidth
        setTimeout(() => { c.classList.add('page-enter-active') }, 20 + idx * 25)
        // limpiar clases al finalizar
        setTimeout(() => { c.classList.remove('page-enter', 'page-enter-active') }, 480 + idx * 25)
      })
    })
  }
}

// Ejecuta animación de salida y luego cambia la página (renderClients) sin hacer scroll
function animatePageChange() {
  const clientsList = document.getElementById('clientsList')
  if (!clientsList) { renderClients(document.getElementById('searchInput') ? document.getElementById('searchInput').value : ''); return }
  const cards = Array.from(clientsList.querySelectorAll('[data-client-id]'))
  if (cards.length === 0) { renderClients(document.getElementById('searchInput') ? document.getElementById('searchInput').value : ''); return }

  // aplicar clase de salida con pequeño stagger
  cards.forEach((c, i) => {
    setTimeout(() => {
      c.classList.remove('page-enter', 'page-enter-active')
      c.classList.add('page-exit')
      // trigger
      void c.offsetWidth
      c.classList.add('page-exit-active')
    }, i * 30)
  })

  // calcular duración máxima (stagger + transición) antes de renderizar la nueva página
  const totalDuration = 30 * cards.length + 280
  setTimeout(() => {
    __justPaginated = true
    renderClients(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '')
  }, totalDuration)
}

// Mostrar todas las tarjetas restantes con una animación suave
function revealAllClients(filteredClients) {
  showAllClients = true
  const clientsList = document.getElementById('clientsList')
  if (!clientsList) return

  // Generar HTML de las tarjetas que faltan (las que no están actualmente renderizadas)
  const existingIds = new Set(Array.from(clientsList.querySelectorAll('[data-client-id]')).map(el => el.getAttribute('data-client-id')))
  const missing = filteredClients.filter(c => !existingIds.has(c.id))
  if (missing.length === 0) {
    // Simplemente re-renderizar
    renderClients()
    return
  }

  // Crear contenedor temporal para las nuevas tarjetas, ocultarlas inicialmente
  const frag = document.createDocumentFragment()
  missing.forEach((c) => {
    const temp = document.createElement('div')
  temp.innerHTML = generateClientCardHtml(c)
    // temp may contain multiple nodes; append each
    Array.from(temp.children).forEach(ch => {
      ch.style.opacity = '0'
      ch.style.transform = 'translateY(18px)'
      ch.style.transition = 'opacity 420ms ease, transform 420ms cubic-bezier(.2,.8,.2,1)'
      frag.appendChild(ch)
    })
  })

  // Remove the 'Mostrar más' button area first
  const moreTrigger = document.getElementById('clientsMoreTrigger')
  if (moreTrigger) moreTrigger.remove()

  clientsList.appendChild(frag)

  // Stagger reveal
  const newCards = Array.from(clientsList.querySelectorAll('[data-client-id]')).slice(-missing.length)
  newCards.forEach((card, idx) => {
    setTimeout(() => {
      card.style.opacity = ''
      card.style.transform = ''
    }, idx * 70)
  })
}

function openModal(modalId) {
  const modal = document.getElementById(modalId)
  modal.classList.add("active")
  document.body.style.overflow = "hidden"
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  modal.classList.remove("active")
  document.body.style.overflow = "auto"
}

function openAddClientModal() {
  const form = document.getElementById('addClientForm')
  if (form) {
    form.reset()
    const instituto = document.getElementById('instituto')
    if (instituto) instituto.value = ''
    const tipoBeca = document.getElementById('tipoBeca')
    if (tipoBeca) tipoBeca.value = ''
    const warning = document.getElementById('warningMessage')
    if (warning) warning.style.display = 'none'
  }

  openModal("addClientModal")

  setTimeout(() => {
    const firstInput = document.getElementById('nombreApellido')
    if (firstInput) {
      firstInput.focus()
      if (typeof firstInput.select === 'function') firstInput.select()
    }
  }, 60)
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast")
  toast.textContent = message
  toast.className = `toast ${type} show`

  setTimeout(() => {
    toast.classList.remove("show")
  }, 3000)
}

function startDigitalClock() {
  const el = document.getElementById('digitalClock')
  if (!el) return

  function pad(n) { return n.toString().padStart(2, '0') }

  function update() {
    const now = new Date()
    const h = pad(now.getHours())
    const m = pad(now.getMinutes())
    const s = pad(now.getSeconds())
    el.textContent = `${h}:${m}:${s}`
  }

  update()
  setInterval(update, 1000)
}

window.openAddClientModal = openAddClientModal
window.handleAddClient = handleAddClient
window.openAddImpresionModal = openAddImpresionModal
window.handleAddImpresion = handleAddImpresion
window.openFiltersModal = openFiltersModal
window.applyFilters = applyFilters
window.clearFilters = clearFilters
window.openHistorialModal = openHistorialModal
window.openEditClientModal = openEditClientModal
window.openDeleteClientModal = openDeleteClientModal
window.confirmDeleteClient = confirmDeleteClient
window.handleEditClient = handleEditClient
window.downloadMonthData = downloadMonthData
window.openResetMonthModal = openResetMonthModal
window.confirmResetMonth = confirmResetMonth
window.openStatsModal = openStatsModal
window.openModal = openModal
window.closeModal = closeModal
