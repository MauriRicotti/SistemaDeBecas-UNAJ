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
      const firestoreModule = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js')

      const app = initializeApp(firebaseConfig)
      const { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, where, getDocs, writeBatch, getDoc } = firestoreModule
      const db = getFirestore(app)

      window.AppFirebase = { db, collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, where, getDocs, writeBatch, getDoc }
      console.log('Firebase inicializado (inlined) — AppFirebase disponible')

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

document.addEventListener("DOMContentLoaded", () => {
  loadData()
  initializeYearFilter()
  setupEventListeners()
  renderClients()

  const turnoSelect = document.getElementById("turnoSelect")
  turnoSelect.value = currentTurno
  setupTurnoTimers()
  startDigitalClock()
})

function setupEventListeners() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    renderClients(e.target.value)
  })

  document.getElementById("turnoSelect").addEventListener("change", (e) => {
    currentTurno = e.target.value
    saveData()
    // Re-evaluar el resalte según la nueva selección y la hora actual
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

  const btnRefresh = document.getElementById('btnRefresh')
  if (btnRefresh) btnRefresh.addEventListener('click', () => {
    loadData()
    renderClients()
    showToast('Datos recargados', 'success')
  })

  const btnDownload = document.getElementById('btnDownload')
  if (btnDownload) btnDownload.addEventListener('click', () => {
    initializeYearFilter()
    openModal('downloadModal')
  })

  const btnStats = document.getElementById('btnStats')
  if (btnStats) btnStats.addEventListener('click', () => openStatsModal())
}

// Gestión de datos
function loadData() {
  const savedClients = localStorage.getItem("becaClients")
  const savedImpresiones = localStorage.getItem("becaImpresiones")
  const savedTurno = localStorage.getItem("currentTurno")

  if (savedClients) clients = JSON.parse(savedClients)
  if (savedImpresiones) impresiones = JSON.parse(savedImpresiones)
  if (savedTurno) currentTurno = savedTurno

  // Si Firebase está disponible, inicializar suscripciones en tiempo real
  if (window.AppFirebase && window.AppFirebase.db) {
    setupFirebaseSync()
  }
}

// Inicialización y sincronización con Firestore (si AppFirebase está disponible)
function setupFirebaseSync() {
  try {
    const { db, collection, onSnapshot, query, orderBy } = window.AppFirebase

    // Helper para subir locales si la colección remota está vacía
    const pushLocalsIfRemoteEmpty = async (colName, localArray) => {
      try {
        const colRef = collection(db, colName)
        // leemos la colección remota (una vez)
        const q = query(colRef)
        let anyRemote = false
        // onSnapshot lo usaremos para suscribirse; aquí consultamos rápidamente con onSnapshot temporal
        const unsub = onSnapshot(q, (snap) => {
          if (snap.size > 0) anyRemote = true
        })
        // pequeña espera para que el snapshot inicial llegue
        await new Promise((r) => setTimeout(r, 250))
        unsub()

        if (!anyRemote && Array.isArray(localArray) && localArray.length > 0) {
          // subir cada elemento local si no existe ya (por id)
          for (const item of localArray) {
            try {
              const { doc, setDoc } = window.AppFirebase
              const ref = doc(db, colName, item.id)
              await setDoc(ref, item)
            } catch (err) {
              console.warn('Error subiendo item local a', colName, item.id, err)
            }
          }
        }
      } catch (err) {
        console.warn('Error comprobando/llenando colección remota', colName, err)
      }
    }

    // Suscribirse a la colección clients
    const clientsCol = collection(db, 'clients')
    onSnapshot(clientsCol, (snapshot) => {
      const remoteClients = []
      snapshot.forEach(doc => {
        const data = doc.data()
        remoteClients.push({ id: doc.id, ...data })
      })
      // Si hay datos remotos, preferimos estos; si no, conservamos locales
      if (remoteClients.length > 0) {
        setSyncStatus('online')
        clients = remoteClients
        localStorage.setItem('becaClients', JSON.stringify(clients))
        renderClients()
      }
    })

    // Suscribirse a la colección impresiones
    const impresCol = collection(db, 'impresiones')
    onSnapshot(impresCol, (snapshot) => {
      const remoteImpres = []
      snapshot.forEach(doc => {
        const data = doc.data()
        remoteImpres.push({ id: doc.id, ...data })
      })
      if (remoteImpres.length > 0) {
        setSyncStatus('online')
        impresiones = remoteImpres
        localStorage.setItem('becaImpresiones', JSON.stringify(impresiones))
        renderClients()
      }
    })

    // Chequear si debemos empujar locales a remoto (solo si remotos vacíos)
    pushLocalsIfRemoteEmpty('clients', clients)
    pushLocalsIfRemoteEmpty('impresiones', impresiones)

  // indicar que la sincronización inicial se intentó
  setSyncStatus('online')

    console.log('Suscripciones Firestore activas (setupFirebaseSync)')
  } catch (err) {
    console.warn('Error configurando sincronización con Firebase:', err)
    setSyncStatus('offline')
  }
}

// Actualizar badge de sincronización en UI
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

// Helpers para escribir en Firestore si está disponible
async function saveClientToFirestore(client) {
  if (!window.AppFirebase || !window.AppFirebase.db) {
    console.log('saveClientToFirestore: Firebase no disponible, skip')
    return
  }
  const { db, doc, setDoc } = window.AppFirebase
  const ref = doc(db, 'clients', client.id)
  try {
    await setDoc(ref, client)
    console.log('Cliente guardado en Firestore:', client.id)
  } catch (err) {
    console.error('Error guardando cliente en Firestore', err)
  }
}

async function deleteClientFromFirestore(clientId) {
  if (!window.AppFirebase || !window.AppFirebase.db) {
    console.log('deleteClientFromFirestore: Firebase no disponible, skip')
    return
  }
  const { db, doc, deleteDoc, collection, query, where, getDocs, writeBatch } = window.AppFirebase
  const clientRef = doc(db, 'clients', clientId)
  try {
    // Primero eliminar impresiones asociadas en batch
    try {
      const impresCol = collection(db, 'impresiones')
      const q = query(impresCol, where('clienteId', '==', clientId))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const batch = writeBatch(db)
        snap.forEach(d => batch.delete(doc(db, 'impresiones', d.id)))
        await batch.commit()
        console.log('Impresiones asociadas eliminadas en Firestore para cliente:', clientId)
      }
    } catch (err) {
      console.warn('Error eliminando impresiones asociadas en Firestore (continuando):', err)
    }

    // Finalmente eliminar el documento del cliente
    await deleteDoc(clientRef)
    console.log('Cliente eliminado en Firestore:', clientId)
  } catch (err) {
    console.error('Error eliminando cliente en Firestore', err)
  }
}

async function saveImpresionToFirestore(imp) {
  if (!window.AppFirebase || !window.AppFirebase.db) {
    console.log('saveImpresionToFirestore: Firebase no disponible, skip')
    return
  }
  const { db, doc, setDoc } = window.AppFirebase
  const ref = doc(db, 'impresiones', imp.id)
  try {
    await setDoc(ref, imp)
    console.log('Impresion guardada en Firestore:', imp.id)
  } catch (err) {
    console.error('Error guardando impresion en Firestore', err)
  }
}

async function deleteImpresionFromFirestore(id) {
  if (!window.AppFirebase || !window.AppFirebase.db) {
    console.log('deleteImpresionFromFirestore: Firebase no disponible, skip')
    return
  }
  const { db, doc, deleteDoc } = window.AppFirebase
  const ref = doc(db, 'impresiones', id)
  try {
    await deleteDoc(ref)
    console.log('Impresion eliminada en Firestore:', id)
  } catch (err) {
    console.error('Error eliminando impresion en Firestore', err)
  }
}

function saveData() {
  localStorage.setItem("becaClients", JSON.stringify(clients))
  localStorage.setItem("becaImpresiones", JSON.stringify(impresiones))
  localStorage.setItem("currentTurno", currentTurno)
}

// Atajo: Ctrl+F o Ctrl+K para enfocar la búsqueda (se mantiene)
document.addEventListener('keydown', (e) => {
  const isMod = e.ctrlKey || e.metaKey
  if (isMod && (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    const input = document.getElementById('searchInput')
    if (input) { input.focus(); input.select() }
  }
})

// Funciones de clientes
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

  // Validar DNI duplicado
  if (clients.some((c) => c.dni === formData.dni)) {
    showToast("Ya existe un cliente con este DNI", "error")
    return
  }

  // Validar número de orden duplicado en mismo instituto y tipo de beca
  if (
    clients.some(
      (c) =>
        c.numeroOrden === formData.numeroOrden &&
        c.instituto === formData.instituto &&
        c.tipoBeca === formData.tipoBeca,
    )
  ) {
    showToast("Ya existe un cliente con este número de orden en el mismo instituto y tipo de beca", "error")
    return
  }

  clients.push(formData)
  saveData()
  // intentar escribir en Firestore también
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

  // Validar DNI duplicado (excepto el mismo cliente)
  if (clients.some((c) => c.dni === formData.dni && c.id !== clientId)) {
    showToast("Ya existe un cliente con este DNI", "error")
    return
  }

  // Validar número de orden duplicado
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

  clients[clientIndex] = formData
  saveData()
  // actualizar en Firestore
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
  // Propagar a Firestore
  deleteClientFromFirestore(clientToDelete)
  // eliminar impresiones relacionadas en Firestore no está hecho en batch aquí (puedes implementarlo en servidor)
  renderClients()
  closeModal("deleteClientModal")
  showToast("Cliente eliminado exitosamente", "success")
  clientToDelete = null
}

// Funciones de impresiones
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
  // guardar impresión en Firestore
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

// Funciones de historial
function openHistorialModal(clientId) {
  const client = clients.find((c) => c.id === clientId)
  if (!client) return

  // recordar qué cliente tiene el historial abierto
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
  
  // Attach delete handlers for each historial-delete button
  document.querySelectorAll('.historial-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-impresion-id')
      if (!id) return
      // confirmar y eliminar
      if (confirm('¿Eliminar esta impresión y restar las carillas?')) {
        deleteImpresionById(id)
      }
    })
  })
}

// Eliminar una impresión por id y actualizar datos
function deleteImpresionById(impresionId) {
  const index = impresiones.findIndex(i => i.id === impresionId)
  if (index === -1) return

  // Eliminar la impresión
  impresiones.splice(index, 1)
  saveData()
  // eliminar en Firestore
  deleteImpresionFromFirestore(impresionId)
  renderClients()

  // Si el modal de historial está abierto, volver a generarlo para reflejar cambios
  const historialModal = document.getElementById('historialModal')
  if (historialModal && historialModal.classList.contains('active')) {
    // Si el historial está abierto, cerrarlo y reabrir (simple) para regenerar el contenido
    // Alternativa: podríamos re-renderizar el contenido directamente
    if (currentHistorialClientId) {
      openHistorialModal(currentHistorialClientId)
    }
  }

  showToast('Impresión eliminada y carillas actualizadas', 'success')
}

// Funciones de estadísticas
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

// Funciones de filtros
function initializeYearFilter() {
  const yearSelect = document.getElementById("filterAno")
  const currentYear = new Date().getFullYear()

  for (let year = currentYear; year >= currentYear - 5; year--) {
    const option = document.createElement("option")
    option.value = year
    option.textContent = year
    yearSelect.appendChild(option)
  }

  // También popular el select del modal de descarga si existe
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

// Generar y descargar CSV para el mes/año seleccionado
function downloadMonthData() {
  const mes = document.getElementById('downloadMes').value
  const ano = document.getElementById('downloadAno').value

  if (!mes || !ano) {
    showToast('Seleccione mes y año para descargar', 'error')
    return
  }

  const month = Number.parseInt(mes) - 1
  const year = Number.parseInt(ano)

  // Filtrar impresiones por mes y año
  const impresionesFiltradas = impresiones.filter(i => {
    const d = new Date(i.fecha)
    return d.getMonth() === month && d.getFullYear() === year
  })

  // Construir un mapa por cliente con resumen
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

// Timers y lógica para alertas de cambio de turno
function setupTurnoTimers() {
  // Chequear cada 20 segundos
  setInterval(checkTurnoAlerts, 20 * 1000)
  // Ejecutar inmediatamente al iniciar
  checkTurnoAlerts()
}

function checkTurnoAlerts() {
  const now = new Date()
  const day = now.getDay() // 0 domingo .. 6 sabado
  const hours = now.getHours()
  const minutes = now.getMinutes()

  // Solo lunes a viernes para avisos programados
  const isWeekday = day >= 1 && day <= 5

  const turnoWrapper = document.querySelector('.turno-selector')

  // Aviso a las 13:45
  if (isWeekday && hours === 13 && minutes === 45) {
    showToast('Cambio de turno en 15 minutos (14:00). Prepárense.', 'warning')
  }

  // Re-evaluar el resalte según las reglas centralizadas
  if (typeof updateTurnoAttention === 'function') updateTurnoAttention()

  // Sábados: si existe opción Único, dejar seleccionado y no mostrar alertas
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
    return
  }

  // Regla 2: si está seleccionado 'Tarde' y son antes de las 14:00 -> resaltar
  if (value === 'Tarde' && hours < 14) {
    turnoWrapper.classList.add('turno-attention')
    return
  }

  // En cualquier otro caso quitar el resalte
  turnoWrapper.classList.remove('turno-attention')
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

    // Atajo: Ctrl+F enfoca la búsqueda (también captura Ctrl+K como alternativa ligera)
    document.addEventListener('keydown', (e) => {
      const isMod = e.ctrlKey || e.metaKey
      if (isMod && (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K')) {
        // evitar comportamiento por defecto (buscar del navegador)
        e.preventDefault()
        const input = document.getElementById('searchInput')
        if (input) {
          input.focus()
          input.select()
        }
      }
    })

    // Exponer nueva función globalmente por compatibilidad con HTML inline (si se vuelve a usar)
    window.copyDNI = copyDNI

  // Aplicar filtros
  if (currentFilters.tipoBeca) {
    filteredClients = filteredClients.filter((c) => c.tipoBeca === currentFilters.tipoBeca)
  }
  if (currentFilters.instituto) {
    filteredClients = filteredClients.filter((c) => c.instituto === currentFilters.instituto)
  }

  // Filtrar por impresiones si hay filtros de fecha o turno
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

  // Actualizar contador
  document.getElementById("clientCount").textContent =
    `${filteredClients.length} cliente${filteredClients.length !== 1 ? "s" : ""}`

  // Renderizar lista
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

  // Asegurarse de remover clase 'empty' si hay resultados
  clientsList.classList.remove('empty')

  clientsList.innerHTML = filteredClients
    .map((client) => {
      const usedCarillas = getUsedCarillasThisMonth(client.id)
      const limit = BECA_LIMITS[client.tipoBeca]
      const remaining = limit - usedCarillas
      const percentage = (usedCarillas / limit) * 100

      let progressClass = ""
      if (percentage >= 90) progressClass = "danger"
      else if (percentage >= 70) progressClass = "warning"

      return `
            <div class="client-card">
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
    })
    .join("")
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
