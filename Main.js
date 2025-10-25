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

function isAuthenticated() {
  try { return !!localStorage.getItem('authToken') } catch (e) { return false }
}

function logout() {
  try {
    try {
      const overlay = document.createElement('div')
      overlay.id = 'logoutOverlay'
      overlay.style.position = 'fixed'
      overlay.style.inset = '0'
      overlay.style.display = 'flex'
      overlay.style.alignItems = 'center'
      overlay.style.justifyContent = 'center'
      overlay.style.background = 'rgba(2,6,23,0.88)'
      overlay.style.backdropFilter = 'blur(6px)'
      overlay.style.zIndex = '99999'
      overlay.style.opacity = '0'
      overlay.style.transition = 'opacity 420ms ease'

      const card = document.createElement('div')
      card.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))'
      card.style.padding = '1.1rem 1.2rem'
      card.style.borderRadius = '12px'
  card.style.boxShadow = 'none'
      card.style.display = 'flex'
      card.style.flexDirection = 'column'
      card.style.alignItems = 'center'
      card.style.gap = '0.6rem'
      card.style.transform = 'translateY(8px) scale(0.98)'
      card.style.opacity = '0'
      card.style.transition = 'transform 420ms cubic-bezier(.2,.8,.2,1), opacity 320ms ease'

      const logo = document.createElement('img')
      logo.src = 'Imagenes - Web Becas/unaj-removebg-preview becas2png.png'
      logo.alt = 'UNAJ'
  logo.style.width = '110px'
  logo.style.height = 'auto'
  logo.style.borderRadius = '8px'
  logo.style.boxShadow = 'none'
  logo.style.transform = 'scale(1)'
  logo.style.transition = 'transform 220ms ease'

      const title = document.createElement('div')
      title.textContent = 'Gracias por usar Sistema de Becas'
      title.style.color = '#eaf6ff'
      title.style.fontWeight = '700'
      title.style.fontSize = '1.05rem'

      const subtitle = document.createElement('div')
      subtitle.textContent = 'Universidad Nacional Arturo Jauretche — Redirigiendo al login…'
      subtitle.style.color = 'rgba(234,246,255,0.85)'
      subtitle.style.fontSize = '0.95rem'

      card.appendChild(logo)
      card.appendChild(title)
      card.appendChild(subtitle)
      overlay.appendChild(card)
      document.body.appendChild(overlay)

      requestAnimationFrame(() => {
  overlay.style.opacity = '1'
  card.style.opacity = '1'
  card.style.transform = 'translateY(0) scale(1.02)'
  logo.style.transform = 'scale(1)'
      })

      setTimeout(() => {
        try { localStorage.removeItem('authToken'); localStorage.removeItem('authUser') } catch (e) {}
        try { location.href = 'login.html' } catch (e) { window.location.assign('login.html') }
  }, 2200)
      return
    } catch (err) {
      try { localStorage.removeItem('authToken'); localStorage.removeItem('authUser') } catch (e) {}
      try { location.href = 'login.html' } catch (e) { }
    }
  } catch (e) {}
}

const RTDB_URL = 'https://sistema-de-becas-unaj-default-rtdb.firebaseio.com'

async function sha256Hex(str) {
  const enc = new TextEncoder()
  const data = enc.encode(str)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('')
}

async function getRemoteAuth() {
  try {
    const r = await fetch(`${RTDB_URL}/auth.json`)
    if (!r.ok) return null
    return await r.json()
  } catch (e) { return null }
}

async function setRemoteAuth(obj) {
  try {
    const r = await fetch(`${RTDB_URL}/auth.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) })
    return r.ok
  } catch (e) { return false }
}

function openChangePasswordModal() {
  try {
    window._pwdVerified = false
    const cur = document.getElementById('currentPassword')
    const neu = document.getElementById('newPassword')
    const conf = document.getElementById('confirmNewPassword')
    const submit = document.getElementById('changePasswordSubmit')
    const msg = document.getElementById('currentVerifyMsg')
    if (cur) cur.value = ''
    if (neu) { neu.value = ''; neu.disabled = true }
    if (conf) { conf.value = ''; conf.disabled = true }
    if (submit) submit.disabled = true
    if (msg) msg.textContent = ''
  } catch (e) {}
  openModal('changePasswordModal')
}

async function handleChangePassword(e) {
  try {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    try {
      if (!window._pwdVerified) {
        const ok = await verifyCurrentPassword()
        if (!ok) return
      }
    } catch (err) {
      console.warn('Error verificando contraseña antes de guardar', err)
      return
    }

    const neu = (document.getElementById('newPassword').value || '')
    const conf = (document.getElementById('confirmNewPassword').value || '')
    if (!neu || !conf) { showToast('Complete la nueva contraseña y su confirmación', 'error'); return }
    if (neu !== conf) { showToast('La nueva contraseña y confirmación no coinciden', 'error'); return }
    if (neu.length < 4) { showToast('La contraseña debe tener al menos 4 caracteres', 'error'); return }

    const okRemote = await setRemoteAuth({ password: neu, updatedAt: new Date().toISOString() })
    if (!okRemote) {
      localStorage.setItem('becaPass', neu)
      showToast('No se pudo guardar en Firebase. Contraseña guardada localmente.', 'warning')
    } else {
      showToast('Contraseña actualizada y guardada en Firebase', 'success')
    }

    window._pwdVerified = false
    try { document.getElementById('newPassword').value = ''; document.getElementById('confirmNewPassword').value = ''; document.getElementById('currentPassword').value = ''; } catch (e) {}
    try { document.getElementById('newPassword').disabled = true; document.getElementById('confirmNewPassword').disabled = true; document.getElementById('changePasswordSubmit').disabled = true; document.getElementById('currentVerifyMsg').textContent = '' } catch (e) {}
    closeModal('changePasswordModal')
  } catch (err) {
    console.error('handleChangePassword error', err)
    showToast('Error cambiando la contraseña', 'error')
  }
}

async function verifyCurrentPassword() {
  try {
    const current = (document.getElementById('currentPassword').value || '')
    const msgEl = document.getElementById('currentVerifyMsg')
    if (!current) {
      if (msgEl) msgEl.textContent = 'Ingrese la contraseña actual para continuar.'
      showToast('Ingrese la contraseña actual', 'error')
      return false
    }

    let remote = await getRemoteAuth()
    if (remote && remote.password) {
      if (remote.password !== current) {
        if (msgEl) { msgEl.textContent = 'Contraseña actual incorrecta.' }
        showToast('Contraseña actual incorrecta', 'error')
        return false
      }
    } else {
      const localPass = localStorage.getItem('becaPass')
      if (localPass && localPass !== current) {
        if (msgEl) { msgEl.textContent = 'Contraseña actual incorrecta (local).' }
        showToast('Contraseña actual incorrecta (local)', 'error')
        return false
      }
      if (!localPass && current !== 'becas123') {
        if (msgEl) { msgEl.textContent = 'No hay contraseña remota: use la contraseña por defecto "becas123".' }
        showToast('No hay contraseña remota: ingrese la contraseña por defecto "becas123" como actual', 'error')
        return false
      }
    }

    window._pwdVerified = true
    if (msgEl) { msgEl.textContent = 'Contraseña verificada. Ingrese la nueva contraseña.' }
    try { document.getElementById('newPassword').disabled = false; document.getElementById('confirmNewPassword').disabled = false; document.getElementById('changePasswordSubmit').disabled = false } catch (e) {}
    showToast('Contraseña verificada', 'success')
    return true
  } catch (err) {
    console.error('verifyCurrentPassword error', err)
    showToast('Error verificando la contraseña', 'error')
    return false
  }
}

try { window.openChangePasswordModal = openChangePasswordModal } catch (e) {}

const MAX_CARILLAS_PER_IMPRESION = 10000

function getCurrentSearchTerm() {
  try {
    const main = document.getElementById('searchInput')
    const floating = document.getElementById('floatingSearchInput')
    const term = (main && main.value && main.value.toString()) ? main.value.toString() : ((floating && floating.value && floating.value.toString()) ? floating.value.toString() : '')
    return (term || '').toString()
  } catch (e) { return '' }
}

function getPricePerCarilla() {
  try {
    const raw = localStorage.getItem('precioCarilla')
    const v = raw !== null ? Number(raw) : NaN
    if (!isFinite(v) || v <= 0) return 40
    return v
  } catch (e) { return 40 }
}

function setPricePerCarilla(value) {
  try {
    const v = Number(value) || 0
    localStorage.setItem('precioCarilla', String(v))
    const btn = document.getElementById('btnPrice')
    if (btn) btn.title = `Precio por carilla: $${v}`
    showToast('Precio por carilla guardado: $' + v, 'success')
    return true
  } catch (e) {
    console.error('setPricePerCarilla error', e)
    return false
  }
}

function formatCurrency(amount) {
  try {
    const n = Number(amount) || 0
    return '$' + n.toLocaleString('es-AR')
  } catch (e) { return '$' + (amount || 0) }
}

function openPriceModal() {
  const input = document.getElementById('pricePerCarilla')
  if (input) input.value = getPricePerCarilla()
  openModal('priceModal')
}

let clients = []
let impresiones = []
let currentFilters = {}
let currentTurno = "Mañana"
let clientToDelete = null
let currentHistorialClientId = null
let _firstRenderDone = false
let currentPage = 1
let pageSize = 6
let __justPaginated = false
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
    try { window.runDownloadClientsHandler = runDownloadClientsHandler } catch (e) {}
})

window.addEventListener('load', () => {
  try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) } catch (e) { window.scrollTo(0,0) }
})

async function ensureJsPDF() {
  if (window.jspdf && (window.jspdf.jsPDF)) {
    return window.jspdf
  }

  try {
    const mod = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
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

    if (jsPDFctor && (typeof jsPDFctor === 'function' || typeof jsPDFctor === 'object')) {
      window.jspdf = { jsPDF: jsPDFctor }
      console.debug('ensureJsPDF: cargado vía import dinámico y normalizado', window.jspdf)
      return window.jspdf
    }

    console.warn('ensureJsPDF: import dinámico devolvió forma inesperada, caeremos a fallback por <script>', { mod })
  } catch (err) {
    console.warn('ensureJsPDF: import dinámico falló, intentando fallback por <script>:', err)
  }

  const loadScript = (src) => new Promise((resolve, reject) => {
    try {
      const existing = Array.from(document.getElementsByTagName('script')).find(s => s.src && s.src.indexOf(src) !== -1)
      if (existing) {
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
    }
  }

  const err = new Error('No se pudo localizar el constructor jsPDF tras intentar import y fallback por CDN')
  console.error('ensureJsPDF:', err)
  throw err
}

async function generateBookPDF(options = { all: true, clientIds: [] }) {
  options = Object.assign({ all: true, clientIds: [] }, options || {})
  if (!Array.isArray(options.clientIds)) options.clientIds = []

  const jspdfModule = await ensureJsPDF()
  const jsPDF = (jspdfModule && jspdfModule.jsPDF) || jspdfModule

  const createDoc = () => new jsPDF({ unit: 'mm', format: 'a4' })
  const doc = createDoc()

  let selectedClients = []
  if (options.all) {
    selectedClients = [...clients]
  } else if (Array.isArray(options.clientIds) && options.clientIds.length > 0) {
    selectedClients = clients.filter(c => options.clientIds.includes(c.id))
  } else {
    selectedClients = [...clients]
  }

  if (options.instituto) selectedClients = selectedClients.filter(c => (c.instituto || '').toString() === options.instituto)
  if (options.tipoBeca) selectedClients = selectedClients.filter(c => (c.tipoBeca || '').toString().toUpperCase() === (options.tipoBeca || '').toString().toUpperCase())

  if (!selectedClients || selectedClients.length === 0) throw new Error('No hay clientes seleccionados')

  selectedClients.forEach((c, idx) => {
  if (idx !== 0) doc.addPage()

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

    doc.setDrawColor(200)
    doc.setLineWidth(0.5)
    doc.line(14, 48, 196, 48)

    const startY = 54
    const rowHeight = 8
    const cols = [14, 36, 72, 120, 160]
    doc.setFontSize(10)
    doc.setTextColor(60)

    doc.text('FECHA', cols[0], startY - 2)
    doc.text('MONTO', cols[1], startY - 2)
    doc.text('MATERIAL', cols[2], startY - 2)
    doc.text('ATENDIDO POR', cols[3], startY - 2)
    doc.text('FIRMA', cols[4], startY - 2)

    for (let r = 0; r < 12; r++) {
      const y = startY + r * rowHeight
      doc.line(14, y + 2, 196, y + 2)
    }

    doc.setFontSize(9)
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 287)
    doc.text(`${idx + 1} / ${selectedClients.length}`, 180, 287)
  })

  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const sanitize = s => (s || '').toString().trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-()]/g, '')
  const instPart = sanitize(options.instituto || (selectedClients[0] && selectedClients[0].instituto) || 'Todos')
  const tipoPart = sanitize(options.tipoBeca || (selectedClients[0] && selectedClients[0].tipoBeca) || 'Todos')
  a.download = `Libro de becas (${instPart})(${tipoPart}).pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function createBookPdfBlob({ instituto = null, tipoBeca = null, clientsForBook = [] }) {
  const jspdfModule = await ensureJsPDF()
  const jsPDF = jspdfModule.jsPDF || jspdfModule
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const selectedClients = Array.isArray(clientsForBook) ? clientsForBook : []

  doc.setDrawColor(0)
  doc.setFillColor(255,255,255)
  doc.setFontSize(22)
  doc.setTextColor(30)
  doc.setFont(undefined, 'bold')
  const title = `Libro de ${instituto || 'Todos'} — Tipo: ${tipoBeca || 'Todos'}`
  doc.text(title, 105, 80, { align: 'center' })
  doc.setFontSize(18)
  doc.text('Beca de apuntes 2025', 105, 110, { align: 'center' })
  doc.setLineWidth(0.8)
  doc.line(40, 130, 170, 130)

  if (!selectedClients || selectedClients.length === 0) {
    return doc.output('blob')
  }

  selectedClients.forEach((c, idx) => {
    if (idx === 0) {
      doc.addPage()
    } else {
      doc.addPage()
    }

  doc.setFontSize(13)
  doc.setTextColor(30)

  const labelGap = 4
  doc.setFont(undefined, 'bold')
  const nameLabel = 'Nombre:'
  doc.text(nameLabel, 14, 24)
  doc.setFont(undefined, 'normal')
  doc.text(`${c.nombreApellido}`, 14 + doc.getTextWidth(nameLabel) + labelGap, 24)

  doc.setFont(undefined, 'bold')
  const dniLabel = 'DNI:'
  doc.text(dniLabel, 14, 34)
  doc.setFont(undefined, 'normal')
  doc.text(`${c.dni}`, 14 + doc.getTextWidth(dniLabel) + labelGap, 34)

  doc.setFont(undefined, 'bold')
  const carreraLabel = 'Carrera:'
  doc.text(carreraLabel, 14, 44)
  doc.setFont(undefined, 'normal')
  doc.text(`${c.carrera || '-'}`, 14 + doc.getTextWidth(carreraLabel) + labelGap, 44)

  doc.setFont(undefined, 'bold')
  const tipoLabel = 'Tipo:'
  const tipoX = 140
  doc.text(tipoLabel, tipoX, 24)
  doc.setFont(undefined, 'normal')
  doc.text(`${c.tipoBeca || '-'}`, tipoX + doc.getTextWidth(tipoLabel) + labelGap, 24)

  doc.setDrawColor(200)
  doc.setLineWidth(0.5)
  doc.line(14, 52, 196, 52)

  const startY = 58
    const endY = 280
    const rowHeight = 9
    const colX = [14, 44, 74, 114, 154]
    const tableRight = 196
    const tableWidth = tableRight - colX[0]

    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    const rectY = startY - 2
    doc.rect(colX[0], rectY, tableWidth, endY - rectY)

    for (let i = 0; i < colX.length; i++) {
      const x = colX[i]
      doc.line(x, rectY, x, endY)
    }
    doc.line(tableRight, rectY, tableRight, endY)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    const headers = ['Fecha', 'Monto', 'Material', 'Atendido por', 'Firma']
    for (let i = 0; i < headers.length; i++) {
      const x = colX[i]
      const nextX = (i < colX.length - 1) ? colX[i + 1] : tableRight
      const w = nextX - x
      const cx = x + w / 2
      doc.text(headers[i], cx, startY + 3, { align: 'center' })
    }

    doc.setFont('helvetica', 'normal')
    let y = startY
    while (y + rowHeight <= endY) {
      doc.line(colX[0], y + rowHeight - 2, tableRight, y + rowHeight - 2)
      y += rowHeight
    }

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

async function createClientsPdfBlob({ instituto = null, tipoBeca = null, clientsList = [] }) {
  const jspdfModule = await ensureJsPDF()
  const jsPDF = jspdfModule.jsPDF || jspdfModule
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const margin = 14
  const pageWidth = 210
  const usableWidth = pageWidth - margin * 2
  let y = 20

  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  const mainTitle = 'Base de datos - Beca de apuntes 2025'
  doc.text(mainTitle, pageWidth / 2, y, { align: 'center' })
  y += 10

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

  const institutosOrden = ['Salud', 'Sociales', 'Ingeniería']
  const colPercents = [0.38, 0.16, 0.28, 0.08, 0.10]
  const cols = colPercents.map(p => Math.floor(p * usableWidth))
  const baseRowHeight = 8
  const lineHeight = 4.2

  const instituteHeaderColor = (inst) => {
    if (inst === 'Salud') return [255, 204, 0]
    if (inst === 'Sociales') return [153, 204, 255] 
    if (inst === 'Ingeniería') return [220, 53, 69] 
    return [240,240,240]
  }
  const colWidths = cols
  const colX = []
  colX[0] = margin
  for (let i = 1; i < colWidths.length; i++) {
    colX[i] = colX[i - 1] + colWidths[i - 1]
  }
  const tableRight = margin + colWidths.reduce((s, v) => s + v, 0)

  const renderTableHeader = (inst) => {
    const headerBarHeight = 10
    const [r,g,b] = instituteHeaderColor(inst)
    doc.setFillColor(r,g,b)
    doc.rect(margin, y - 6, usableWidth, headerBarHeight, 'F')
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(0)
    doc.text(inst, margin + 2, y)
    y += headerBarHeight + 4

    const headerHeight = 9
    doc.setFillColor(245,245,245)
    doc.rect(margin, y - 2, usableWidth, headerHeight, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    const headers = ['Nombre', 'DNI', 'Carrera', 'Tipo', 'N° Orden']
    for (let i = 0; i < headers.length; i++) {
      const x = colX[i]
      const w = colWidths[i]
      doc.text(headers[i], x + w / 2, y + headerHeight / 2 + 1, { align: 'center' })
      doc.setDrawColor(180)
      doc.setLineWidth(0.4)
      doc.line(x, y - 2, x, y - 2 + Math.max(headerHeight, baseRowHeight))
    }
    doc.line(tableRight, y - 2, tableRight, y - 2 + Math.max(headerHeight, baseRowHeight))
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
    if (instituto && instituto !== inst) continue

    const items = clientsList
      .filter(c => (c.instituto || '') === inst)
      .sort((a,b) => {
        const ta = (a.tipoBeca||'').toString().toUpperCase()
        const tb = (b.tipoBeca||'').toString().toUpperCase()
        if (ta !== tb) return ta.localeCompare(tb)
        const na = Number.parseInt(a.numeroOrden) || 0
        const nb = Number.parseInt(b.numeroOrden) || 0
        return na - nb
      })

    if (!items || items.length === 0) continue

    if (y + 60 > 287) {
      doc.setFontSize(9)
      doc.text(`Generado: ${new Date().toLocaleDateString()}`, margin, 287)
      doc.text(`Página ${page}`, pageWidth - margin, 287, { align: 'right' })
      doc.addPage()
      page++
      y = 20
    }

    renderTableHeader(inst)

    for (const c of items) {
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

      const neededHeight = Math.max(baseRowHeight, Math.ceil(maxLines * lineHeight)) + 4 

      if (y + neededHeight > bottomLimit) {
        doc.setFontSize(9)
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, margin, bottomLimit)
        doc.text(`Página ${page}`, pageWidth - margin, bottomLimit, { align: 'right' })
        doc.addPage()
        page++
        y = 20
        renderTableHeader(inst)
      }

      doc.setDrawColor(170)
      doc.setLineWidth(0.35)
      for (let j = 0; j < colWidths.length; j++) {
        const x = colX[j]
        const w = colWidths[j]
        doc.rect(x, y - 2, w, neededHeight)
      }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      for (let j = 0; j < wrappedCols.length; j++) {
        const x = colX[j]
        const w = colWidths[j]
        const lines = wrappedCols[j]
        const textX = x + 2
        const textY = y + 3
        doc.text(lines, textX, textY)
      }

      y += neededHeight + 2
    }

    y += 6
  }

  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleDateString()}`, margin, 287)
  doc.text(`Página ${page}`, pageWidth - margin, 287, { align: 'right' })

  return doc.output('blob')
}

async function generateAllBooksZip() {
  if (!window.JSZip) {
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js')
      let ctor = mod && (mod.default || mod.JSZip || mod)
      if (ctor && ctor.default) ctor = ctor.default
      window.JSZip = ctor
    } catch (err) {
      console.warn('generateAllBooksZip: import dinámico JSZip falló, intentando fallback por <script>', err)
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
          if (window.JSZip) { loaded = true; break }
          if (window.jszip) { window.JSZip = window.jszip; loaded = true; break }
          if (window.JSZip === undefined && (window.JSZip || window.JSZip === null)) {
          }
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

document.addEventListener('DOMContentLoaded', () => {
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

  const btn = document.getElementById('btnGenerateBook')
  if (btn) {
    btn.addEventListener('click', runGenerateBookHandler)
  } else {
    console.debug('btnGenerateBook no encontrado al inicializar el listener; se agrega listener delegado como fallback')

    document.addEventListener('click', (ev) => {
      try {
        const target = ev.target || ev.srcElement
        const btnEl = target && typeof target.closest === 'function' ? target.closest('#btnGenerateBook') : null
        if (btnEl) runGenerateBookHandler(ev)
      } catch (e) {
        console.warn('Error en listener delegado de btnGenerateBook', e)
      }
    })
  }

  try { window.runGenerateBookHandler = runGenerateBookHandler } catch (e) {}
})

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light')
    localStorage.setItem('theme', 'light')
    const toggle = document.getElementById('btnThemeToggle')
    if (toggle) toggle.setAttribute('aria-pressed', 'true')
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

function animateInitialCards(limit = 6) {
  const clientsList = document.getElementById('clientsList')
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
          <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary); display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <div>Restantes: <strong style="color: var(--text-primary);">${remaining} carillas</strong></div>
            <div style="font-size:0.9rem; color:var(--text-secondary);">Equivale a: <strong style="color:var(--text-primary);">${formatCurrency(remaining * getPricePerCarilla())}</strong></div>
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

  const importFileInput = document.getElementById('importFileInput')
  const btnConfirmImport = document.getElementById('btnConfirmImport')

  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      handleImportFileChange(e)
    })
  }

  if (btnConfirmImport) {
    btnConfirmImport.addEventListener('click', async (e) => {
      try {
        await confirmImport()
      } catch (err) {
        console.error('confirmImport error', err)
        showToast('Error durante importación: ' + (err && err.message ? err.message : ''), 'error')
      }
    })
  }

  const btnPrice = document.getElementById('btnPrice')
  if (btnPrice) {
    btnPrice.addEventListener('click', () => openPriceModal())
    try { btnPrice.title = `Precio por carilla: $${getPricePerCarilla()}` } catch (e) {}
  }

  const btnLogout = document.getElementById('btnLogout')
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault && e.preventDefault()
      logout()
    })
  }
  const btnSettings = document.getElementById('btnSettings')
  if (btnSettings) {
    btnSettings.addEventListener('click', (e) => {
      e.preventDefault && e.preventDefault()
      openChangePasswordModal()
    })
  }

  const changeForm = document.getElementById('changePasswordForm')
  if (changeForm) {
    changeForm.addEventListener('submit', handleChangePassword)
    const btnVerify = document.getElementById('btnVerifyCurrent')
    if (btnVerify) btnVerify.addEventListener('click', async (ev) => { ev.preventDefault && ev.preventDefault(); await verifyCurrentPassword() })

    const toggleNew = document.getElementById('toggleNewPwd')
    const toggleConf = document.getElementById('toggleConfirmPwd')
    if (toggleNew) toggleNew.addEventListener('click', () => {
      try { const inp = document.getElementById('newPassword'); if (!inp) return; inp.type = inp.type === 'password' ? 'text' : 'password' } catch (e) {}
    })
    if (toggleConf) toggleConf.addEventListener('click', () => {
      try { const inp = document.getElementById('confirmNewPassword'); if (!inp) return; inp.type = inp.type === 'password' ? 'text' : 'password' } catch (e) {}
    })
  }

  const btnSavePrice = document.getElementById('btnSavePrice')
  if (btnSavePrice) {
    btnSavePrice.addEventListener('click', (e) => {
      try {
        const input = document.getElementById('pricePerCarilla')
        if (!input) return
        const val = Number(input.value) || 0
        if (val <= 0) {
          showToast('Ingrese un precio válido (> 0)', 'error')
          return
        }
        setPricePerCarilla(val)
        closeModal('priceModal')
      } catch (err) { console.error('btnSavePrice click error', err) }
    })
  }

  const institutoEl = document.getElementById('instituto')
  const tipoBecaEl = document.getElementById('tipoBeca')
  const autoCheckbox = document.getElementById('autoNumeroOrden')
  const numeroInput = document.getElementById('numeroOrden')
  const previewWrap = document.getElementById('numeroOrdenPreview')
  const previewSuggested = document.getElementById('numeroOrdenSuggested')

  async function updateNumeroPreview() {
    try {
      if (!previewWrap || !previewSuggested) return
      const inst = institutoEl ? institutoEl.value : ''
      const tipo = tipoBecaEl ? tipoBecaEl.value : ''
      if (!inst || !tipo) {
        previewWrap.style.display = 'none'
        return
      }
      const localSuggested = computeNextNumeroOrdenLocal(inst, tipo)
      previewSuggested.textContent = localSuggested
      previewWrap.style.display = 'block'

      if (window.AppFirebase && window.AppFirebase.db) {
        const unique = await computeNextNumeroOrdenUnique(inst, tipo)
        previewSuggested.textContent = unique
        if (autoCheckbox && autoCheckbox.checked && numeroInput) {
          numeroInput.value = unique
        }
      } else {
        if (autoCheckbox && autoCheckbox.checked && numeroInput) {
          numeroInput.value = localSuggested
        }
      }
    } catch (err) {
      console.warn('updateNumeroPreview error', err)
    }
  }

  if (institutoEl) institutoEl.addEventListener('change', updateNumeroPreview)
  if (tipoBecaEl) tipoBecaEl.addEventListener('change', updateNumeroPreview)
  if (autoCheckbox) {
    autoCheckbox.addEventListener('change', (e) => {
      if (numeroInput) {
        numeroInput.disabled = e.target.checked
        if (e.target.checked) {
          updateNumeroPreview()
        }
      }
    })
    if (autoCheckbox.checked && numeroInput) numeroInput.disabled = true
  }


  const btnStats = document.getElementById('btnStats')
  if (btnStats) btnStats.addEventListener('click', () => openStatsModal())
  const btnRefresh = document.getElementById('btnRefresh')
  if (btnRefresh) btnRefresh.addEventListener('click', async () => {
    setSyncStatus('warning')
    showToast('Iniciando sincronización con Realtime Database...', 'warning')
    try {
      if (window.forcePushLocalsToRTDB) {
        await window.forcePushLocalsToRTDB()
      }
      const ok = await fetchRemoteClientsOnce()
      if (ok) {
        showToast('Sincronización RTDB completada', 'success')
        setSyncStatus('online')
        return
      }
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

  const floatingInput = document.getElementById('floatingSearchInput')
  const mainSearch = document.getElementById('searchInput')
  if (floatingInput && mainSearch) {
    floatingInput.addEventListener('input', (e) => { mainSearch.value = e.target.value; renderClients(e.target.value) })
    mainSearch.addEventListener('input', (e) => { floatingInput.value = e.target.value })
  }

  const backToTop = document.getElementById('backToTop')
  if (backToTop) {
    backToTop.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }) })
  }

  let lastKnownScrollY = 0
  let ticking = false
  const floating = document.getElementById('floatingSearch')
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

  if (floating) {
    floating.addEventListener('click', () => {
      const fi = document.getElementById('floatingSearchInput')
      if (fi) fi.focus()
    })
  }

  const pageSizeSelect = document.getElementById('pageSizeSelect')
  if (pageSizeSelect) {
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
      e.preventDefault()
    } catch (err) {
    }
  })

  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return
    if (e.key === 'ArrowLeft') {
      const newPage = Math.max(1, currentPage - 1)
      if (newPage !== currentPage) {
        currentPage = newPage
        animatePageChange()
      }
      e.preventDefault()
    } else if (e.key === 'ArrowRight') {

      let filteredLen = clients.length
      const searchInput = document.getElementById('searchInput')
      const term = searchInput ? (searchInput.value || '').toString().toLowerCase() : ''
      if (term) filteredLen = clients.filter(c => (c.nombreApellido||'').toLowerCase().includes(term) || (c.dni||'').includes(term)).length
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

function normalizeKey(k) {
  return (k || '').toString().toLowerCase().replace(/\s+/g, '').replace(/[_\-]/g, '').normalize('NFD').replace(/[^\w\s]/g, '').replace(/[\u0300-\u036f]/g, '')
}

function detectMapping(keys = []) {
  const mapping = {}
  const norm = keys.map(k => ({ raw: k, n: normalizeKey(k) }))

  const findKey = (...candidates) => {
    for (const cand of candidates) {
      const nc = normalizeKey(cand)
      const found = norm.find(x => x.n === nc || x.n.indexOf(nc) !== -1 || nc.indexOf(x.n) !== -1)
      if (found) return found.raw
    }
    return null
  }

  mapping.nombreApellido = findKey('nombre', 'nombreapellido', 'nombre_apellido', 'nombre y apellido', 'apellido', 'nombreApellido')
  mapping.dni = findKey('dni', 'documento', 'nrodni')
  mapping.carrera = findKey('carrera', 'estudio', 'curso')
  mapping.instituto = findKey('instituto', 'facultad', 'area')
  mapping.tipoBeca = findKey('tipobeca', 'tipo', 'beca', 'tipo_beca')

  return mapping
}

function mapRowToClient(row, mapping) {
  const get = (k) => {
    if (!k) return ''
    return row[k] !== undefined ? row[k] : row[k.toLowerCase()] || ''
  }
  const nombre = get(mapping.nombreApellido) || get('nombre') || get('nombreApellido') || ''
  const dni = (get(mapping.dni) || get('dni') || '').toString().trim()
  const carrera = get(mapping.carrera) || ''
  const instituto = get(mapping.instituto) || ''
  let tipo = (get(mapping.tipoBeca) || '').toString().toUpperCase()
  if (!['A','B','C'].includes(tipo)) tipo = tipo.charAt(0) || 'A'

  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2,7),
    nombreApellido: nombre.toString().trim(),
    dni: dni,
    carrera: carrera.toString().trim(),
    instituto: instituto.toString().trim() || 'Sin Instituto',
    tipoBeca: tipo || 'A',
    numeroOrden: null,
    fechaRegistro: new Date().toISOString()
  }
}

async function handleImportFileChange(e) {
  try {
    const target = e && e.target ? e.target : null
    const file = target && target.files && target.files.length ? target.files[0] : null
    if (!file) return
    const name = (file.name || '').toLowerCase()
    if (name.endsWith('.csv') || file.type.indexOf('csv') !== -1) {
      parseCsvFile(file)
    } else if (name.endsWith('.xls') || name.endsWith('.xlsx') || file.type.indexOf('spreadsheet') !== -1) {
      parseExcelFile(file)
    } else {
      parseCsvFile(file)
    }
  } catch (err) {
    console.error('handleImportFileChange error', err)
    showToast('Error leyendo archivo de importación', 'error')
  }
}

function parseCsvFile(file) {
  if (!window.Papa) {
    showToast('PapaParse no está disponible', 'error')
    return
  }
  document.getElementById('importReport').textContent = 'Parseando CSV...'
  window.Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      processParsedRows(results.data || [], file.name)
    },
    error: function(err) {
      console.error('PapaParse error', err)
      showToast('Error parseando CSV: ' + (err && err.message ? err.message : ''), 'error')
    }
  })
}

function parseExcelFile(file) {
  const reader = new FileReader()
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result)
      const wb = window.XLSX.read(data, { type: 'array' })
      const first = wb.SheetNames && wb.SheetNames.length ? wb.SheetNames[0] : null
      if (!first) {
        showToast('Hoja no encontrada en el archivo Excel', 'error')
        return
      }
      const ws = wb.Sheets[first]
      const json = window.XLSX.utils.sheet_to_json(ws, { defval: '' })
      processParsedRows(json || [], file.name)
    } catch (err) {
      console.error('parseExcelFile error', err)
      showToast('Error parseando Excel: ' + (err && err.message ? err.message : ''), 'error')
    }
  }
  reader.onerror = function(err) {
    console.error('FileReader error', err)
    showToast('Error leyendo archivo Excel', 'error')
  }
  reader.readAsArrayBuffer(file)
}

function processParsedRows(rows, filename) {
  const previewEl = document.getElementById('importPreview')
  const reportEl = document.getElementById('importReport')
  if (!Array.isArray(rows) || rows.length === 0) {
    if (reportEl) reportEl.textContent = 'No se encontraron filas en el archivo.'
    if (previewEl) previewEl.innerHTML = ''
    return
  }

  const keys = Object.keys(rows[0] || {})
  const mapping = detectMapping(keys)

  const parsed = rows.map(r => mapRowToClient(r, mapping))

  assignNumeroOrdenBatch(parsed)

  const sample = parsed.slice(0, 12)
  let html = '<div style="font-size:0.92rem; color:var(--text-secondary); margin-bottom:0.5rem">Archivo: ' + (filename || '') + ' — Filas detectadas: ' + parsed.length + '</div>'
  html += '<table style="width:100%; border-collapse:collapse; font-size:0.9rem">'
  html += '<thead><tr><th style="text-align:left; padding:6px; border-bottom:1px solid rgba(0,0,0,0.06)">Nombre</th><th style="text-align:left; padding:6px; border-bottom:1px solid rgba(0,0,0,0.06)">DNI</th><th style="text-align:left; padding:6px; border-bottom:1px solid rgba(0,0,0,0.06)">Instituto</th><th style="text-align:left; padding:6px; border-bottom:1px solid rgba(0,0,0,0.06)">Tipo</th><th style="text-align:left; padding:6px; border-bottom:1px solid rgba(0,0,0,0.06)">N° Orden</th></tr></thead>'
  html += '<tbody>'
  sample.forEach(s => {
    html += `<tr><td style="padding:6px; border-bottom:1px solid rgba(0,0,0,0.04)">${escapeHtml(s.nombreApellido)}</td><td style="padding:6px; border-bottom:1px solid rgba(0,0,0,0.04)">${escapeHtml(s.dni)}</td><td style="padding:6px; border-bottom:1px solid rgba(0,0,0,0.04)">${escapeHtml(s.instituto)}</td><td style="padding:6px; border-bottom:1px solid rgba(0,0,0,0.04)">${escapeHtml(s.tipoBeca)}</td><td style="padding:6px; border-bottom:1px solid rgba(0,0,0,0.04)">${escapeHtml(s.numeroOrden)}</td></tr>`
  })
  html += '</tbody></table>'

  if (previewEl) previewEl.innerHTML = html

  const existingDnis = new Set((clients || []).map(c => (c.dni || '').toString()))
  const duplicates = parsed.filter(p => existingDnis.has((p.dni || '').toString()))

  if (reportEl) {
    reportEl.textContent = `Listo. Filas: ${parsed.length}. Duplicados detectados (no importados si confirma): ${duplicates.length}. Revise la previsualización y confirme.`
  }

  window._lastParsedImport = { parsedClients: parsed, filename: filename }
}

function assignNumeroOrdenBatch(parsedClients = []) {
  const groups = {}
  clients.forEach(c => {
    const key = `${(c.instituto||'').toString()}|${(c.tipoBeca||'').toString().toUpperCase()}`
    const no = Number.parseInt(c.numeroOrden) || 0
    groups[key] = Math.max(groups[key] || 0, no)
  })

  for (const p of parsedClients) {
    const key = `${(p.instituto||'').toString()}|${(p.tipoBeca||'').toString().toUpperCase()}`
    if (!groups[key]) groups[key] = 0
    if (!p.numeroOrden || Number.parseInt(p.numeroOrden) <= 0) {
      groups[key] = groups[key] + 1
      p.numeroOrden = groups[key]
    }
  }
}

function computeNextNumeroOrdenLocal(instituto, tipoBeca) {
  const keyInst = (instituto || '').toString()
  const keyTipo = (tipoBeca || '').toString().toUpperCase()
  let max = 0
  for (const c of clients) {
    if (((c.instituto || '').toString() === keyInst) && ((c.tipoBeca || '').toString().toUpperCase() === keyTipo)) {
      const no = Number.parseInt(c.numeroOrden) || 0
      if (no > max) max = no
    }
  }
  return max + 1
}

async function computeNextNumeroOrdenUnique(instituto, tipoBeca) {
  let candidate = computeNextNumeroOrdenLocal(instituto, tipoBeca)
  if (!window.AppFirebase || !window.AppFirebase.db) return candidate
  try {
    let tries = 0
    while (await checkOrderExistsRemote(instituto, tipoBeca, candidate) && tries < 5000) {
      candidate++
      tries++
    }
    return candidate
  } catch (err) {
    console.warn('computeNextNumeroOrdenUnique error, retornando local:', err)
    return candidate
  }
}

function escapeHtml(s) {
  return (s || '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

async function confirmImport() {
  const info = window._lastParsedImport
  if (!info || !Array.isArray(info.parsedClients) || info.parsedClients.length === 0) {
    showToast('No hay datos para importar. Seleccione un archivo válido primero.', 'warning')
    return
  }

  const parsed = info.parsedClients
  const existingDnis = new Set((clients || []).map(c => (c.dni || '').toString()))
  const toInsert = []
  const skipped = []
  for (const p of parsed) {
    if (!p.dni) {
      skipped.push({ reason: 'sin DNI', row: p })
      continue
    }
    if (existingDnis.has(p.dni.toString())) {
      skipped.push({ reason: 'dni duplicado', row: p })
      continue
    }
    toInsert.push(p)
    existingDnis.add(p.dni.toString())
  }

  if (toInsert.length === 0) {
    showToast('No hay filas válidas para importar (todos duplicados o inválidos)', 'warning')
    return
  }

  for (const c of toInsert) {
    clients.push(c)
    try { saveClientToFirestore && saveClientToFirestore(c) } catch (e) { console.warn('saveClientToFirestore error', e) }
  }
  saveData()
  renderClients()
  closeModal('importModal')

  showToast(`Importación completada. Importados: ${toInsert.length}. Omitidos: ${skipped.length}`, 'success')
  window._lastParsedImport = null
}

function openImportModal() {
  const previewEl = document.getElementById('importPreview')
  const reportEl = document.getElementById('importReport')
  const fileEl = document.getElementById('importFileInput')
  if (previewEl) previewEl.innerHTML = ''
  if (reportEl) reportEl.textContent = ''
  if (fileEl) fileEl.value = ''
  window._lastParsedImport = null
  openModal('importModal')
}

/* ------------------------- FIN IMPORTADOR ------------------------- */

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
        clients = Object.keys(remoteClients).map(k => ({ id: k, ...remoteClients[k] }))
        localStorage.setItem('becaClients', JSON.stringify(clients))
      }
    } catch (err) {
      console.warn('Error comprobando clientes remotos RTDB inicial', err)
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

function normalizeStr(s) {
  return (s || '').toString().trim()
}

function isOrderConflictLocal(instituto, tipoBeca, numeroOrden, excludeId = null) {
  const ni = normalizeStr(instituto)
  const tb = (tipoBeca || '').toString().toUpperCase()
  const no = Number.parseInt(numeroOrden) || 0
  return clients.some(c => {
    if (excludeId && c.id === excludeId) return false
    return Number.parseInt(c.numeroOrden) === no && normalizeStr(c.instituto) === ni && (c.tipoBeca || '').toString().toUpperCase() === tb
  })
}

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

async function handleAddClient(event) {
  event.preventDefault()

  try {
    const auto = document.getElementById('autoNumeroOrden') ? document.getElementById('autoNumeroOrden').checked : false
    const nombre = document.getElementById('nombreApellido').value || ''
    const dni = document.getElementById('dni').value || ''
    const carrera = document.getElementById('carrera').value || ''
    const instituto = document.getElementById('instituto').value || ''
    const tipoBeca = document.getElementById('tipoBeca').value || ''

    if (!nombre || !dni || !instituto || !tipoBeca) {
      showToast('Complete los campos obligatorios antes de agregar el cliente', 'error')
      return
    }

    let numeroOrden = null
    if (auto) {
      numeroOrden = await computeNextNumeroOrdenUnique(instituto, tipoBeca)
    } else {
      const nVal = document.getElementById('numeroOrden').value
      numeroOrden = Number.parseInt(nVal)
      if (!numeroOrden || numeroOrden <= 0) {
        showToast('Ingrese un número de orden válido o active la asignación automática', 'error')
        return
      }
    }

    const formData = {
      id: Date.now().toString(),
      nombreApellido: nombre,
      dni: dni,
      carrera: carrera,
      instituto: instituto,
      tipoBeca: tipoBeca,
      numeroOrden: numeroOrden,
      fechaRegistro: new Date().toISOString(),
    }

    if (clients.some((c) => c.dni === formData.dni)) {
      showToast('Ya existe un cliente con este DNI (local)', 'error')
      return
    }

    if (window.AppFirebase && window.AppFirebase.db) {
      try {
        const existsDni = await checkDniExistsRemote(formData.dni)
        if (existsDni) {
          showToast('Ya existe un cliente con este DNI (remoto)', 'error')
          return
        }

        const orderExists = await checkOrderExistsRemote(formData.instituto, formData.tipoBeca, formData.numeroOrden)
        if (orderExists) {
          showToast('Ya existe un cliente con este número de orden en ese instituto y tipo de beca (remoto)', 'error')
          return
        }
      } catch (err) {
        console.error('Error verificando conflictos remotos', err)
        showToast('Error verificando conflictos remotos — operación cancelada', 'error')
        return
      }
    } else {
      if (isOrderConflictLocal(formData.instituto, formData.tipoBeca, formData.numeroOrden)) {
        showToast('Ya existe un cliente con este número de orden en el mismo instituto y tipo de beca', 'error')
        return
      }
    }

    clients.push(formData)
    saveData()
    try { saveClientToFirestore(formData) } catch (e) { /* ignore */ }
    renderClients()
    closeModal('addClientModal')
    const form = document.getElementById('addClientForm')
    if (form) form.reset()
    showToast('Cliente agregado exitosamente', 'success')
  } catch (err) {
    console.error('handleAddClient error', err)
    showToast('Error agregando cliente: ' + (err && err.message ? err.message : ''), 'error')
  }
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

  if (clients.some((c) => c.dni === formData.dni && c.id !== clientId)) {
    showToast("Ya existe un cliente con este DNI (local)", "error")
    return
  }

  if (window.AppFirebase && window.AppFirebase.db) {
    checkDniExistsRemote(formData.dni, clientId).then((exists) => {
      if (exists) {
        showToast('Ya existe un cliente con este DNI (remoto)', 'error')
        return
      }
      checkOrderExistsRemote(formData.instituto, formData.tipoBeca, formData.numeroOrden, clientId).then((orderExists) => {
        if (orderExists) {
          showToast('Ya existe un cliente con este número de orden en ese instituto y tipo de beca (remoto)', 'error')
          return
        }
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
  if (isOrderConflictLocal(formData.instituto, formData.tipoBeca, formData.numeroOrden, clientId)) {
    showToast("Ya existe un cliente con este número de orden en el mismo instituto y tipo de beca", "error")
    return
  }

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
  renderClients(getCurrentSearchTerm())
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

  try {
    const precio = getPricePerCarilla()
    const previewVal = document.getElementById('impresionAmountValue')
    if (previewVal) previewVal.textContent = formatCurrency(0)
    const limitEl = document.getElementById('impresionLimit')
    if (limitEl) limitEl.title = `Precio por carilla: ${formatCurrency(precio)}`
  } catch (e) {}

  openModal("addImpresionModal")
  setTimeout(() => {
    try {
      const cantidadEl = document.getElementById('cantidadCarillas')
      if (cantidadEl) {
        cantidadEl.focus()
        if (typeof cantidadEl.select === 'function') cantidadEl.select()
      }
    } catch (e) { }
  }, 60)
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

  const warningMax = document.getElementById('warningMessageMax')
  const btnRegister = document.getElementById('btnRegisterImpresion')
  if (cantidad > MAX_CARILLAS_PER_IMPRESION) {
    if (warningMax) warningMax.style.display = 'block'
    if (btnRegister) btnRegister.disabled = true
  } else {
    if (warningMax) warningMax.style.display = 'none'
    if (btnRegister) btnRegister.disabled = (cantidad > remaining || cantidad <= 0)
  }

  try { updateAmountPreview() } catch (e) {}
}

function updateAmountPreview() {
  const input = document.getElementById('cantidadCarillas')
  const raw = input ? (input.value || '') : ''
  let val = Number.parseInt(raw.toString().replace(/[^0-9]/g, '')) || 0
  const precio = getPricePerCarilla()

  const warningMax = document.getElementById('warningMessageMax')
  const btnRegister = document.getElementById('btnRegisterImpresion')

  if (val > MAX_CARILLAS_PER_IMPRESION) {
    const montoMax = Math.round(MAX_CARILLAS_PER_IMPRESION * precio)
    const el = document.getElementById('impresionAmountValue')
    if (el) el.textContent = formatCurrency(montoMax)
    if (warningMax) warningMax.style.display = 'block'
    if (btnRegister) btnRegister.disabled = true
    return montoMax
  }

  if (warningMax) warningMax.style.display = 'none'
  if (btnRegister) btnRegister.disabled = (val <= 0)
  const monto = Math.round(val * precio)
  const el = document.getElementById('impresionAmountValue')
  if (el) el.textContent = formatCurrency(monto)
  return monto
}

function handleAddImpresion(event) {
  event.preventDefault()

  const clientId = document.getElementById("impresionClientId").value
  let cantidad = Number.parseInt(document.getElementById("cantidadCarillas").value)

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    showToast('Ingrese una cantidad válida', 'error')
    return
  }

  if (cantidad > MAX_CARILLAS_PER_IMPRESION) {
    showToast(`La cantidad por impresión no puede superar ${MAX_CARILLAS_PER_IMPRESION}`, 'error')
    return
  }

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

  try {
    const precio = getPricePerCarilla()
    impresion.monto = Number((cantidad * precio).toFixed(0))
  } catch (e) {
    impresion.monto = cantidad * 40
  }

  impresiones.push(impresion)
  saveData()
  saveImpresionToFirestore(impresion)
  renderClients(getCurrentSearchTerm())
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
                          <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <div class="historial-carillas" style="font-weight:600">${imp.cantidad} carillas</div>
                            <div style="font-size:0.85rem; color:var(--text-secondary);">${formatCurrency(imp.monto || (imp.cantidad * getPricePerCarilla()))}</div>
                          </div>
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
  renderClients(getCurrentSearchTerm())

  const historialModal = document.getElementById('historialModal')
  if (historialModal && historialModal.classList.contains('active')) {
    if (currentHistorialClientId) {
      openHistorialModal(currentHistorialClientId)
    }
  }

  showToast('Impresión eliminada y carillas actualizadas', 'success')
}

function openStatsModal() {
  const statsContent = document.getElementById('statsContent')
  const mesSelect = document.getElementById('statsMes')
  const anoSelect = document.getElementById('statsAno')
  const instSelect = document.getElementById('statsInstituto')
  const tipoSelect = document.getElementById('statsTipo')
  const btnExport = document.getElementById('btnExportStats')

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  if (anoSelect && anoSelect.children.length === 0) {
    const empty = document.createElement('option')
    empty.value = ''
    empty.textContent = 'Este año'
    anoSelect.appendChild(empty)
    for (let y = currentYear; y >= currentYear - 5; y--) {
      const opt = document.createElement('option')
      opt.value = String(y)
      opt.textContent = String(y)
      anoSelect.appendChild(opt)
    }
  }

  if (mesSelect) mesSelect.value = ''
  if (anoSelect) anoSelect.value = ''
  if (instSelect) instSelect.value = ''
  if (tipoSelect) tipoSelect.value = ''

  function computeStats({ mes = '', ano = '', instituto = '', tipoBeca = '' } = {}) {
    const filteredImpresiones = impresiones.filter(i => {
      try {
        const d = new Date(i.fecha)
        if (ano && d.getFullYear() !== Number.parseInt(ano)) return false
        if (mes && (d.getMonth() + 1) !== Number.parseInt(mes)) return false
        return true
      } catch (e) { return false }
    })

    let filteredClients = clients.slice()
    if (instituto) filteredClients = filteredClients.filter(c => (c.instituto || '') === instituto)
    if (tipoBeca) filteredClients = filteredClients.filter(c => (c.tipoBeca || '') === tipoBeca)

    const clientIdsSet = new Set(filteredClients.map(c => c.id))
    const impresionesFinal = filteredImpresiones.filter(i => clientIdsSet.has(i.clienteId))

    const totalCarillas = impresionesFinal.reduce((s, it) => s + (it.cantidad || 0), 0)
    const totalImpresiones = impresionesFinal.length
    const clientesActivos = new Set(impresionesFinal.map(i => i.clienteId)).size
    const promedioPorCliente = clientesActivos > 0 ? Math.round(totalCarillas / clientesActivos) : 0

    const precioActual = getPricePerCarilla()
    const totalMoney = impresionesFinal.reduce((s, it) => {
      const m = (it && typeof it.monto !== 'undefined') ? Number(it.monto) : (Number(it.cantidad || 0) * precioActual)
      return s + (isFinite(m) ? m : 0)
    }, 0)

    const impresionesAllForClients = impresiones.filter(i => clientIdsSet.has(i.clienteId))
    const totalMoneyAll = impresionesAllForClients.reduce((s, it) => {
      const m = (it && typeof it.monto !== 'undefined') ? Number(it.monto) : (Number(it.cantidad || 0) * precioActual)
      return s + (isFinite(m) ? m : 0)
    }, 0)

    const institutos = ['Salud','Sociales','Ingeniería']
    const perInstituto = {}
    institutos.forEach(inst => { perInstituto[inst] = 0 })
    impresionesFinal.forEach(i => {
      const cli = clients.find(c => c.id === i.clienteId)
      if (!cli) return
      const inst = cli.instituto || 'Sin instituto'
      if (!perInstituto[inst]) perInstituto[inst] = 0
      perInstituto[inst] += (i.cantidad || 0)
    })

    const tipos = ['A','B','C']
    const perTipo = { A:0, B:0, C:0 }
    impresionesFinal.forEach(i => {
      const cli = clients.find(c => c.id === i.clienteId)
      if (!cli) return
      const t = cli.tipoBeca || 'N'
      if (perTipo[t] === undefined) perTipo[t] = 0
      perTipo[t] += (i.cantidad || 0)
    })

    const byClient = {}
    impresionesFinal.forEach(i => {
      byClient[i.clienteId] = (byClient[i.clienteId] || 0) + (i.cantidad || 0)
    })
    const topClients = Object.keys(byClient).map(id => ({ id, cantidad: byClient[id], nombre: (clients.find(c=>c.id===id)||{}).nombreApellido || 'Desconocido' }))
      .sort((a,b) => b.cantidad - a.cantidad)
      .slice(0,6)

    return {
      totalCarillas,
      totalImpresiones,
      clientesActivos,
      promedioPorCliente,
      perInstituto,
      perTipo,
      topClients,
      filteredClientsCount: filteredClients.length,
      totalMoney,
      totalMoneyAll
    }
  }

  function drawBars(container, dataArr, colorVar) {
    container.innerHTML = ''
    const max = Math.max(1, ...dataArr.map(d => d.value))
    dataArr.forEach(d => {
      const row = document.createElement('div')
      row.className = 'bar-row'
      const label = document.createElement('div')
      label.className = 'bar-label'
      label.textContent = d.label
      const bar = document.createElement('div')
      bar.className = 'bar'
      const inner = document.createElement('i')
      const percent = Math.round((d.value / max) * 100)
      inner.style.width = percent + '%'
      inner.style.background = `linear-gradient(90deg, var(${colorVar}), rgba(255,255,255,0.06))`
      bar.appendChild(inner)
      const value = document.createElement('div')
      value.style.width = '68px'
      value.style.textAlign = 'right'
      value.style.fontSize = '0.85rem'
      value.style.color = 'var(--text-secondary)'
      value.textContent = d.value
      row.appendChild(label)
      row.appendChild(bar)
      row.appendChild(value)
      container.appendChild(row)
    })
  }

  function render() {
    const filters = {
      mes: mesSelect ? mesSelect.value : '',
      ano: anoSelect ? anoSelect.value : '',
      instituto: instSelect ? instSelect.value : '',
      tipoBeca: tipoSelect ? tipoSelect.value : ''
    }

    const s = computeStats(filters)

    statsContent.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Carillas</div><div class="stat-value">${s.totalCarillas}</div><div class="stat-subtitle">Total</div></div>
        <div class="stat-card"><div class="stat-label">Impresiones</div><div class="stat-value">${s.totalImpresiones}</div><div class="stat-subtitle">Registros</div></div>
        <div class="stat-card"><div class="stat-label">Estudiantes activos</div><div class="stat-value">${s.clientesActivos}</div><div class="stat-subtitle">De ${s.filteredClientsCount} clientes filtrados</div></div>
        <div class="stat-card"><div class="stat-label">Promedio / Estuduante</div><div class="stat-value">${s.promedioPorCliente}</div><div class="stat-subtitle">Carillas</div></div>
        <div class="stat-card"><div class="stat-label">Monto (periodo)</div><div class="stat-value">${formatCurrency(s.totalMoney)}</div><div class="stat-subtitle">Equivalente al periodo filtrado</div></div>
        <div class="stat-card"><div class="stat-label">Monto (acumulado)</div><div class="stat-value">${formatCurrency(s.totalMoneyAll)}</div><div class="stat-subtitle">Total histórico para clientes</div></div>
      </div>

      <div class="stats-charts">
        <div class="stat-chart">
          <div class="chart-title">Uso por Instituto</div>
          <div id="chartInstituto"></div>
        </div>
        <div class="stat-chart">
          <div class="chart-title">Uso por Tipo de Beca</div>
          <div id="chartTipo"></div>
        </div>
      </div>
    `

    const chartInst = document.getElementById('chartInstituto')
    const chartTipo = document.getElementById('chartTipo')
    const instData = Object.keys(s.perInstituto).map(k => ({ label: k, value: s.perInstituto[k] }))
    const tipoData = Object.keys(s.perTipo).map(k => ({ label: k, value: s.perTipo[k] }))

    if (chartInst) drawBars(chartInst, instData, '--blue-primary')
    if (chartTipo) drawBars(chartTipo, tipoData, '--green-primary')

    if (btnExport) {
      btnExport.onclick = () => exportStatsPdf(s, filters)
    }
  }
  async function exportStatsPdf(statsObj, filters) {
    try {
      const jspdfModule = await ensureJsPDF()
      const jsPDF = (jspdfModule && jspdfModule.jsPDF) || jspdfModule
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const margin = 36
      let y = margin

      doc.setFontSize(16)
      doc.setFont(undefined, 'bold')
      doc.text('Resumen de Estadísticas', 210, y, { align: 'center' })
      y += 28

      doc.setFontSize(11)
      doc.setFont(undefined, 'normal')
      doc.text(`Filtros: Mes: ${filters.mes || 'Actual'} — Año: ${filters.ano || 'Actual'} — Instituto: ${filters.instituto || 'Todos'} — Tipo: ${filters.tipoBeca || 'Todos'}`, margin, y, { maxWidth: 540 })
      y += 22

      const metrics = [
        ['Total carillas', statsObj.totalCarillas],
        ['Total impresiones', statsObj.totalImpresiones],
        ['Clientes activos', statsObj.clientesActivos],
        ['Promedio / cliente', statsObj.promedioPorCliente]
      ]

      metrics.push(['Monto (periodo)', formatCurrency(statsObj.totalMoney)])
      metrics.push(['Monto (acumulado)', formatCurrency(statsObj.totalMoneyAll)])

      metrics.forEach(row => {
        doc.setFont(undefined, 'bold')
        doc.text(row[0] + ':', margin, y)
        doc.setFont(undefined, 'normal')
        doc.text(String(row[1]), margin + 240, y)
        y += 18
      })

      y += 8

      doc.setFont(undefined, 'bold')
      doc.text('Uso por Instituto', margin, y)
      y += 14
      const perInst = statsObj.perInstituto || {}
      const instKeys = Object.keys(perInst)
      const maxInst = Math.max(1, ...instKeys.map(k => perInst[k] || 0))
      instKeys.forEach(k => {
        const val = perInst[k] || 0
        doc.setFont(undefined, 'normal')
        doc.text(k, margin, y + 10)
        const barX = margin + 120
        const barW = Math.round((val / maxInst) * 300)
        doc.setFillColor(80, 140, 255)
        doc.rect(barX, y, barW, 10, 'F')
        doc.setDrawColor(200)
        doc.rect(barX, y, 300, 10)
        doc.text(String(val), barX + 308, y + 8)
        y += 18
      })

      y += 8

      doc.setFont(undefined, 'bold')
      doc.text('Uso por Tipo de Beca', margin, y)
      y += 14
      const perTipo = statsObj.perTipo || {}
      const tipoKeys = Object.keys(perTipo)
      const maxTipo = Math.max(1, ...tipoKeys.map(k => perTipo[k] || 0))
      tipoKeys.forEach(k => {
        const val = perTipo[k] || 0
        doc.setFont(undefined, 'normal')
        doc.text(k, margin, y + 10)
        const barX = margin + 120
        const barW = Math.round((val / maxTipo) * 300)
        doc.setFillColor(34, 197, 94)
        doc.rect(barX, y, barW, 10, 'F')
        doc.setDrawColor(200)
        doc.rect(barX, y, 300, 10)
        doc.text(String(val), barX + 308, y + 8)
        y += 18
      })

      y = Math.min(y + 24, 760)
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(`Generado: ${new Date().toLocaleString()}`, margin, y)

      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const sanitize = s => (s || '').toString().trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-()]/g, '')
      const instPart = sanitize(filters.instituto || 'Todos')
      const tipoPart = sanitize(filters.tipoBeca || 'Todos')
      a.download = `estadisticas_${filters.ano || currentYear}_${filters.mes || currentMonth}(${instPart})(${tipoPart}).pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Exportando estadísticas (PDF)', 'success')
    } catch (err) {
      console.error('Error generando PDF de estadísticas', err)
      showToast('No se pudo generar PDF: ' + (err && err.message ? err.message : ''), 'error')
    }
  }

  if (mesSelect) mesSelect.addEventListener('change', render)
  if (anoSelect) anoSelect.addEventListener('change', render)
  if (instSelect) instSelect.addEventListener('change', render)
  if (tipoSelect) tipoSelect.addEventListener('change', render)

  render()
  openModal('statsModal')
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

  const mesSelect = document.getElementById('filterMes')
  if (mesSelect) {
    mesSelect.innerHTML = ''
    const allOpt = document.createElement('option')
    allOpt.value = ''
    allOpt.textContent = 'Todos'
    mesSelect.appendChild(allOpt)
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    months.forEach((m, idx) => {
      const o = document.createElement('option')
      o.value = String(idx + 1)
      o.textContent = m
      mesSelect.appendChild(o)
    })
  }

  const statsAno = document.getElementById('statsAno')
  if (statsAno) {
    statsAno.innerHTML = ''
    const emptyOpt2 = document.createElement('option')
    emptyOpt2.value = ''
    emptyOpt2.textContent = 'Todos'
    statsAno.appendChild(emptyOpt2)
    for (let year = currentYear; year >= currentYear - 5; year--) {
      const opt = document.createElement('option')
      opt.value = year
      opt.textContent = year
      statsAno.appendChild(opt)
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
      turno: i.turno || '',
      monto: (typeof i.monto !== 'undefined') ? i.monto : (i.cantidad * getPricePerCarilla())
    })
  })

  const header = ['fecha','cliente','dni','instituto','tipoBeca','cantidad','turno','monto']
  const csvContent = [header.join(',')].concat(rows.map(r => [
    `"${new Date(r.fecha).toLocaleString('es-AR')}"`,
    `"${(r.cliente || '').replace(/"/g,'""') }"`,
    `"${r.dni}"`,
    `"${(r.instituto || '').replace(/"/g,'""') }"`,
    `"${r.tipoBeca || ''}"`,
    r.cantidad,
    `"${r.turno || ''}"`,
    r.monto
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

function updateTurnoAttention() {
  const turnoWrapper = document.querySelector('.turno-selector')
  const turnoSelect = document.getElementById('turnoSelect')
  if (!turnoWrapper || !turnoSelect) return

  const value = turnoSelect.value
  const now = new Date()
  const day = now.getDay()
  const isWeekday = day >= 1 && day <= 5
  const hours = now.getHours()

  if (value === 'Unico' || !isWeekday) {
    turnoWrapper.classList.remove('turno-attention')
    return
  }

  if (value === 'Mañana' && hours >= 14) {
    turnoWrapper.classList.add('turno-attention')
    turnoWrapper.setAttribute('title', 'Atención: turno Mañana fuera de horario esperado. Verificar.')
    turnoWrapper.setAttribute('aria-describedby', 'turno-warning')
    return
  }

  if (value === 'Tarde' && hours < 14) {
    turnoWrapper.classList.add('turno-attention')
    turnoWrapper.setAttribute('title', 'Atención: turno Tarde fuera de horario esperado. Verificar.')
    turnoWrapper.setAttribute('aria-describedby', 'turno-warning')
    return
  }

  turnoWrapper.classList.remove('turno-attention')
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

function openResetMonthModal() {
  openModal("resetMonthModal")
}

function confirmResetMonth() {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  impresiones = impresiones.filter((i) => {
    const impresionDate = new Date(i.fecha)
    return !(impresionDate.getMonth() === currentMonth && impresionDate.getFullYear() === currentYear)
  })

  saveData()
  renderClients(getCurrentSearchTerm())
  closeModal("resetMonthModal")
  showToast("Mes reiniciado exitosamente", "success")
}

function renderClients(searchTerm = "") {
  let filteredClients = [...clients]

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filteredClients = filteredClients.filter(
      (c) => c.nombreApellido.toLowerCase().includes(term) || c.dni.includes(term),
    )
  }
    function copyToClipboard(text) {
      if (!navigator.clipboard) {
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
  if (clientCountEl) {
    const numEl = clientCountEl.querySelector('.client-count-number')
    if (numEl) numEl.textContent = String(filteredClients.length)
    else clientCountEl.textContent = `${filteredClients.length} estudiantes`
    clientCountEl.title = `${filteredClients.length} estudiantes registrados`
  }

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

  const firstRects = Array.from(clientsList.children).map(el => el.getBoundingClientRect())


  const totalItems = filteredClients.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
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

  clientsList.innerHTML = html

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

  const btnShowAll = document.getElementById('btnShowAllClients')
  if (btnShowAll) {
    btnShowAll.addEventListener('click', () => {
      revealAllClients(filteredClients)
    })
  }

  const paginationEl = document.getElementById('pagination')
  if (paginationEl) {
    const makeBtn = (label, action, page = null, extraAttrs = '') => `<button class="btn btn-secondary" data-page-action="${action}" ${page !== null ? `data-page="${page}"` : ''} ${extraAttrs}>${label}</button>`

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
      for (let p = 1; p <= totalPages; p++) {
        if (p === currentPage) parts.push(`<button class="btn btn-primary" aria-current="page" data-page-action="goto" data-page="${p}" data-total-pages="${totalPages}">${p}</button>`)
        else parts.push(makeBtn(p, 'goto', p, `data-total-pages="${totalPages}"`))
      }
    } else {
      const leftSiblingCount = Math.floor((maxButtons - 1) / 2)
      const rightSiblingCount = Math.ceil((maxButtons - 1) / 2)

      let left = Math.max(1, currentPage - leftSiblingCount)
      let right = Math.min(totalPages, currentPage + rightSiblingCount)

      if (currentPage - left < leftSiblingCount) {
        right = Math.min(totalPages, right + (leftSiblingCount - (currentPage - left)))
      }
      if (right - currentPage < rightSiblingCount) {
        left = Math.max(1, left - (rightSiblingCount - (right - currentPage)))
      }

      const windowSize = right - left + 1
      if (windowSize < maxButtons) {
        if (left === 1) right = Math.min(totalPages, left + maxButtons - 1)
        else if (right === totalPages) left = Math.max(1, right - maxButtons + 1)
      }

      if (left > 1) {
        parts.push(makeBtn(1, 'goto', 1, `data-total-pages="${totalPages}"`))
        if (left > 2) parts.push(`<span class="pagination-ellipsis">…</span>`)
      }

      for (let p = left; p <= right; p++) {
        if (p === currentPage) parts.push(`<button class="btn btn-primary" aria-current="page" data-page-action="goto" data-page="${p}" data-total-pages="${totalPages}">${p}</button>`)
        else parts.push(makeBtn(p, 'goto', p, `data-total-pages="${totalPages}"`))
      }

      if (right < totalPages) {
        if (right < totalPages - 1) parts.push(`<span class="pagination-ellipsis">…</span>`)
        parts.push(makeBtn(totalPages, 'goto', totalPages, `data-total-pages="${totalPages}"`))
      }
    }

    parts.push(makeBtn('Siguiente', 'next', null, `data-total-pages="${totalPages}"`))
    parts.push(makeBtn('Último', 'last', totalPages, `data-total-pages="${totalPages}"`))

  paginationEl.innerHTML = `<div class="pagination-inner">${parts.join('')}</div>`
  }

  if (!_firstRenderDone) {
    requestAnimationFrame(() => {
      animateInitialCards()
      _firstRenderDone = true
    })
  }

  if (__justPaginated) {
    __justPaginated = false
    requestAnimationFrame(() => {
      const cards = Array.from(clientsList.querySelectorAll('[data-client-id]'))
      cards.forEach((c, idx) => {
        c.classList.remove('page-enter', 'page-enter-active')
        c.classList.add('page-enter')
        void c.offsetWidth
        setTimeout(() => { c.classList.add('page-enter-active') }, 20 + idx * 25)
        setTimeout(() => { c.classList.remove('page-enter', 'page-enter-active') }, 480 + idx * 25)
      })
    })
  }
}

function animatePageChange() {
  const clientsList = document.getElementById('clientsList')
  if (!clientsList) { renderClients(document.getElementById('searchInput') ? document.getElementById('searchInput').value : ''); return }
  const cards = Array.from(clientsList.querySelectorAll('[data-client-id]'))
  if (cards.length === 0) { renderClients(document.getElementById('searchInput') ? document.getElementById('searchInput').value : ''); return }

  cards.forEach((c, i) => {
    setTimeout(() => {
      c.classList.remove('page-enter', 'page-enter-active')
      c.classList.add('page-exit')
      void c.offsetWidth
      c.classList.add('page-exit-active')
    }, i * 30)
  })

  const totalDuration = 30 * cards.length + 280
  setTimeout(() => {
    __justPaginated = true
    renderClients(document.getElementById('searchInput') ? document.getElementById('searchInput').value : '')
  }, totalDuration)
}

function revealAllClients(filteredClients) {
  showAllClients = true
  const clientsList = document.getElementById('clientsList')
  if (!clientsList) return

  const existingIds = new Set(Array.from(clientsList.querySelectorAll('[data-client-id]')).map(el => el.getAttribute('data-client-id')))
  const missing = filteredClients.filter(c => !existingIds.has(c.id))
  if (missing.length === 0) {
    renderClients()
    return
  }

  const frag = document.createDocumentFragment()
  missing.forEach((c) => {
    const temp = document.createElement('div')
  temp.innerHTML = generateClientCardHtml(c)
    Array.from(temp.children).forEach(ch => {
      ch.style.opacity = '0'
      ch.style.transform = 'translateY(18px)'
      ch.style.transition = 'opacity 420ms ease, transform 420ms cubic-bezier(.2,.8,.2,1)'
      frag.appendChild(ch)
    })
  })

  const moreTrigger = document.getElementById('clientsMoreTrigger')
  if (moreTrigger) moreTrigger.remove()

  clientsList.appendChild(frag)

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
  if (!modal) return
  try {
    if (modal.parentElement && modal.parentElement !== document.body) {
      modal.__origParent = modal.parentElement
      modal.__origNext = modal.nextSibling
      document.body.appendChild(modal)
      modal.style.zIndex = '11000'
    }
  } catch (err) { /* ignore */ }

  modal.classList.remove('modal-closing')
  modal.classList.add('active', 'modal-opening')

  modal.offsetHeight

  const onIn = (ev) => {
    if (ev && ev.target && ev.target !== modal && ev.target !== modal.querySelector('.modal-content')) return
    modal.classList.remove('modal-opening')
    modal.removeEventListener('animationend', onIn)
  }
  modal.addEventListener('animationend', onIn)

  try {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0
    document.body.dataset.modalScrollY = String(scrollY)
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.classList.add('modal-open')
  } catch (e) {
    document.body.style.overflow = "hidden"
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (!modal) return
  if (modal.classList.contains('modal-closing')) return

  modal.classList.remove('modal-opening')
  modal.classList.add('modal-closing')

  let cleaned = false
  const finishClose = () => {
    if (cleaned) return
    cleaned = true
    modal.classList.remove('active', 'modal-closing', 'modal-opening')
    try {
      const prev = document.body.dataset.modalScrollY ? parseInt(document.body.dataset.modalScrollY, 10) : null
      document.body.classList.remove('modal-open')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      if (prev !== null && !Number.isNaN(prev)) {
        window.scrollTo({ top: prev, left: 0, behavior: 'auto' })
      }
      delete document.body.dataset.modalScrollY
      try {
        if (modal.__origParent) {
          if (modal.__origNext && modal.__origNext.parentNode === modal.__origParent) {
            modal.__origParent.insertBefore(modal, modal.__origNext)
          } else {
            modal.__origParent.appendChild(modal)
          }
          delete modal.__origParent
          delete modal.__origNext
          modal.style.zIndex = ''
        }
      } catch (err) { /* ignore */ }
    } catch (e) {
      document.body.style.overflow = "auto"
    }
  }

  const onOut = (ev) => {
    finishClose()
    modal.removeEventListener('animationend', onOut)
  }
  modal.addEventListener('animationend', onOut)

  setTimeout(() => finishClose(), 400)
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

function openClientsGridModal(selectedInstituto = '') {
  try {
    const el = document.getElementById('clientsGridModal')
    if (!el) return
    openModal('clientsGridModal')
    const buttons = Array.from(document.querySelectorAll('.institute-filter'))
    buttons.forEach(b => {
      const inst = b.getAttribute('data-inst') || ''
      if ((inst || '') === (selectedInstituto || '')) {
        b.classList.remove('btn-secondary')
        b.classList.add('btn-primary')
        b.setAttribute('aria-pressed', 'true')
      } else {
        b.classList.remove('btn-primary')
        b.classList.add('btn-secondary')
        b.setAttribute('aria-pressed', 'false')
      }
    })

    try {
      const searchEl = document.getElementById('clientsGridSearch')
      if (searchEl) { searchEl.value = '' }
    } catch(e) {}

    renderClientsGrid(selectedInstituto)
    try { const searchEl2 = document.getElementById('clientsGridSearch'); if (searchEl2) setTimeout(() => { try { searchEl2.focus() } catch(e){} }, 40) } catch(e) {}
  } catch (err) {
    console.error('openClientsGridModal error', err)
  }
}

function renderClientsGrid(instituto = '') {
  try {
    const tbody = document.getElementById('clientsGridBody')
    if (!tbody) return
    const instFilter = (instituto || '').toString()
    let filtered = [...clients]
    if (instFilter) filtered = filtered.filter(c => (c.instituto || '') === instFilter)

    try {
      const searchEl = document.getElementById('clientsGridSearch')
      const term = searchEl ? (searchEl.value || '').toString().trim().toLowerCase() : ''
      if (term) {
        filtered = filtered.filter(c => {
          const name = (c.nombreApellido || '').toString().toLowerCase()
          const dni = (c.dni || '').toString().toLowerCase()
          return name.indexOf(term) !== -1 || dni.indexOf(term) !== -1
        })
      }
    } catch (e) {  }

    const instituteOrder = ['Salud', 'Sociales', 'Ingeniería']
    const tipoOrder = { 'A': 1, 'B': 2, 'C': 3 }
    filtered.sort((a, b) => {
      const ia = instituteOrder.indexOf(a.instituto) === -1 ? 99 : instituteOrder.indexOf(a.instituto)
      const ib = instituteOrder.indexOf(b.instituto) === -1 ? 99 : instituteOrder.indexOf(b.instituto)
      if (ia !== ib) return ia - ib
      const ta = (a.tipoBeca || '').toString().toUpperCase()
      const tb = (b.tipoBeca || '').toString().toUpperCase()
      const tva = tipoOrder[ta] || 99
      const tvb = tipoOrder[tb] || 99
      if (tva !== tvb) return tva - tvb
      const na = Number.parseInt(a.numeroOrden) || 0
      const nb = Number.parseInt(b.numeroOrden) || 0
      return na - nb
    })

    if (!filtered || filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding:10px; color:var(--text-muted)">No hay clientes para el filtro seleccionado.</td></tr>`
      return
    }

    const instClassMap = { 'Salud': 'instituto-salud', 'Sociales': 'instituto-sociales', 'Ingeniería': 'instituto-ingenieria' }

    const rows = filtered.map(c => {
      const used = getUsedCarillasThisMonth(c.id)
      const limit = BECA_LIMITS[c.tipoBeca] || 0
      const remaining = Math.max(0, limit - used)
      const inst = (c.instituto || '')
      const instClass = instClassMap[inst] || ''
      return `
        <tr data-client-id="${c.id}" class="grid-row ${instClass}" style="border-bottom:1px solid rgba(255,255,255,0.03)">
          <td style="padding:8px 10px">${escapeHtml(c.nombreApellido)}</td>
          <td style="padding:8px 10px">${escapeHtml(c.dni)}</td>
          <td style="padding:8px 10px">${escapeHtml(c.carrera)}</td>
          <td style="padding:8px 10px"><span class="grid-institute-badge ${instClass}">${escapeHtml(inst)}</span></td>
          <td style="padding:8px 10px">${escapeHtml(c.tipoBeca)}</td>
          <td style="padding:8px 10px">${escapeHtml(c.numeroOrden)}</td>
          <td style="padding:8px 10px; text-align:right">${used} / ${limit}</td>
          <td style="padding:8px 10px; text-align:right">${remaining}</td>
        </tr>
      `
    }).join('')

    tbody.innerHTML = rows

    Array.from(tbody.querySelectorAll('tr[data-client-id]')).forEach(tr => {
      tr.addEventListener('dblclick', () => {
        const id = tr.getAttribute('data-client-id')
        if (id) openEditClientModal(id)
      })

      tr.addEventListener('click', () => {
        try {
          const id = tr.getAttribute('data-client-id')
          if (!id) return
          const client = clients.find(c => c.id === id)
          if (!client) return

          closeModal('clientsGridModal')
          const mainSearch = document.getElementById('searchInput')
          const floating = document.getElementById('floatingSearchInput')
          const term = (client.dni && client.dni.toString()) ? client.dni.toString() : client.nombreApellido
          if (mainSearch) {
            mainSearch.value = term
            currentPage = 1
            renderClients(term)
          }
          if (floating) floating.value = mainSearch ? mainSearch.value : ''
          showToast('Cliente seleccionado: ' + (client.nombreApellido || ''), 'success')
        } catch (err) {
          console.error('Error seleccionando cliente desde grilla', err)
        }
      })
    })
  } catch (err) {
    console.error('renderClientsGrid error', err)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const clientCountEl = document.getElementById('clientCount')
    if (clientCountEl) {
      clientCountEl.style.cursor = 'pointer'
      clientCountEl.setAttribute('role', 'button')
      clientCountEl.addEventListener('click', () => openClientsGridModal(''))
    }

    try {
      const btnClearMain = document.getElementById('btnClearMainSearch')
      const mainSearch = document.getElementById('searchInput')
      if (btnClearMain && mainSearch) {
        btnClearMain.addEventListener('click', () => {
          mainSearch.value = ''
          renderClients('')
          const floating = document.getElementById('floatingSearchInput')
          if (floating) floating.value = ''
        })
      }

      const btnClearFloating = document.getElementById('btnClearFloatingSearch')
      const floatingSearch = document.getElementById('floatingSearchInput')
      if (btnClearFloating && floatingSearch) {
        btnClearFloating.addEventListener('click', () => {
          floatingSearch.value = ''
          const main = document.getElementById('searchInput')
          if (main) { main.value = ''; renderClients('') }
        })
      }

      const btnClearGrid = document.getElementById('btnClearGridSearch')
      if (btnClearGrid) {
        btnClearGrid.addEventListener('click', () => {
          const gridSearch = document.getElementById('clientsGridSearch')
          if (gridSearch) gridSearch.value = ''
          const selected = Array.from(document.querySelectorAll('.institute-filter')).find(b => b.classList.contains('btn-primary'))
          const inst = selected ? (selected.getAttribute('data-inst') || '') : ''
          renderClientsGrid(inst)
        })
      }
    } catch (err) { /* ignore */ }

    document.addEventListener('click', (e) => {
      try {
        const btn = e.target.closest && e.target.closest('.institute-filter')
        if (!btn) return
        const inst = btn.getAttribute('data-inst') || ''
        document.querySelectorAll('.institute-filter').forEach(b => {
          b.classList.remove('btn-primary')
          b.classList.add('btn-secondary')
          b.setAttribute('aria-pressed', 'false')
        })
        btn.classList.remove('btn-secondary')
        btn.classList.add('btn-primary')
        btn.setAttribute('aria-pressed', 'true')
        renderClientsGrid(inst)
      } catch (err) {  }
    })

    const btnExport = document.getElementById('btnExportClientsGrid')
    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        try {
          const selected = Array.from(document.querySelectorAll('.institute-filter')).find(b => b.classList.contains('btn-primary'))
          const inst = selected ? (selected.getAttribute('data-inst') || '') : ''
          let clientsForPdf = [...clients]
          if (inst) clientsForPdf = clientsForPdf.filter(c => (c.instituto || '') === inst)
          if (!clientsForPdf || clientsForPdf.length === 0) {
            showToast('No hay clientes para exportar con ese filtro', 'warning')
            return
          }
          const blob = await createClientsPdfBlob({ instituto: inst || null, tipoBeca: null, clientsList: clientsForPdf })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          const sanitize = s => (s || '').toString().trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-()]/g, '')
          const instPart = sanitize(inst || 'Todos')
          a.download = `Base_de_datos_${instPart}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          showToast('PDF generado y descargado', 'success')
        } catch (err) {
          console.error('Error exportando grilla a PDF', err)
          showToast('Error generando PDF: ' + (err && err.message ? err.message : ''), 'error')
        }
      })
    }

    try {
      const gridSearch = document.getElementById('clientsGridSearch')
      if (gridSearch) {
        gridSearch.addEventListener('input', () => {
          const selected = Array.from(document.querySelectorAll('.institute-filter')).find(b => b.classList.contains('btn-primary'))
          const inst = selected ? (selected.getAttribute('data-inst') || '') : ''
          renderClientsGrid(inst)
        })
      }
    } catch (err) {  }
  } catch (err) {
    console.error('Inicialización clientsGrid listeners error', err)
  }
})

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
window.openImportModal = openImportModal

document.addEventListener('keydown', (e) => {
  try {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const actives = Array.from(document.querySelectorAll('.modal.active'))
      if (!actives || actives.length === 0) return
      actives.forEach((m) => {
        try {
          if (m && m.id) closeModal(m.id)
          else if (m) m.classList.remove('active')
        } catch (err) {
        }
      })
    }
  } catch (err) {
  }
})
