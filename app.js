let perfilActivo = null;

/* LOGIN */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const mensajeError = document.getElementById("mensajeError");

    mensajeError.textContent = "";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      mensajeError.textContent = "Correo o contraseña incorrectos.";
      return;
    }

    const user = data.user;

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      mensajeError.textContent = "No se encontró el perfil del usuario.";
      await supabaseClient.auth.signOut();
      return;
    }

    if (!profile.approved) {
      mensajeError.textContent = "Su cuenta aún está pendiente de aprobación por el administrador.";
      await supabaseClient.auth.signOut();
      return;
    }

    window.location.href = "dashboard.html";
  });
}

/* REGISTRO */

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const role = document.getElementById("registerRole").value;
    const registerMessage = document.getElementById("registerMessage");

    registerMessage.textContent = "";

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (error) {
      registerMessage.textContent = "Error al crear la cuenta: " + error.message;
      registerMessage.className = "error";
      return;
    }

    registerMessage.textContent = "Solicitud enviada correctamente. Espere la aprobación del administrador.";
    registerMessage.className = "message success";

    registerForm.reset();
  });
}

/* VERIFICAR SESIÓN EN DASHBOARD */

async function cargarDashboard() {
  const bienvenida = document.getElementById("bienvenida");

  if (!bienvenida) return;

  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile || !profile.approved) {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
    return;
  }

perfilActivo = profile;

bienvenida.textContent = `Bienvenido, ${profile.full_name} | Rol: ${profile.role.toUpperCase()}`;

filtrarModulos(profile.role);

if (document.body.classList.contains("laboratorio-body")) {
  if (profile.role !== "admin" && profile.role !== "laboratorio") {
    alert("No tiene permiso para ingresar al módulo de laboratorio.");
    window.location.href = "dashboard.html";
    return;
  }

  await cargarModuloLaboratorio();
}
}

cargarDashboard();

/* CERRAR SESIÓN */

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function() {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });
}

/* FILTRAR MÓDULOS POR ROL */

function filtrarModulos(role) {
  const laboratorio = document.querySelector(".access-button.laboratorio");
  const veterinaria = document.querySelector(".access-button.veterinaria");
  const adm = document.querySelector(".access-button.adm");

  if (role === "admin") {
    return;
  }

  if (role === "laboratorio") {
    if (veterinaria) veterinaria.style.display = "none";
    if (adm) adm.style.display = "none";
  }

  if (role === "veterinaria") {
    if (laboratorio) laboratorio.style.display = "none";
    if (adm) adm.style.display = "none";
  }
}

/* ACCESOS DEL DASHBOARD */

const accesos = document.querySelectorAll("[data-module]");

accesos.forEach(acceso => {
  acceso.addEventListener("click", async function(e) {
    e.preventDefault();

    const modulo = this.getAttribute("data-module");
    const modulePreview = document.getElementById("modulePreview");

    if (!modulePreview) return;

    if (modulo === "laboratorio") {
  window.location.href = "laboratorio.html";
  return;
}

    if (modulo === "veterinaria") {
      modulePreview.innerHTML = `
        <h2>Veterinaria</h2>
        <p>En este módulo se podrá gestionar pacientes veterinarios, dueños, consultas, tratamientos y vacunas.</p>

        <div class="mini-panel">
          <p><strong>Funciones futuras:</strong></p>
          <ul>
            <li>Registro de mascotas</li>
            <li>Registro de propietarios</li>
            <li>Consultas médicas</li>
            <li>Control de vacunas</li>
          </ul>
        </div>
      `;
    }

    if (modulo === "adm") {
      if (perfilActivo.role !== "admin") {
        modulePreview.innerHTML = `
          <h2>Acceso denegado</h2>
          <p>Este módulo solo está disponible para administradores.</p>
        `;
        return;
      }

      await cargarModuloADM();
    }
  });
});

/* MÓDULO ADM */

async function cargarModuloADM() {
  const modulePreview = document.getElementById("modulePreview");

  modulePreview.innerHTML = `
    <h2>ADM</h2>
    <p>Solicitudes pendientes de aprobación.</p>
    <div id="usuariosPendientes">Cargando usuarios...</div>
  `;

  const contenedor = document.getElementById("usuariosPendientes");

  const { data: usuarios, error } = await supabaseClient
    .from("profiles")
    .select("id, full_name, email, role, approved, created_at")
    .eq("approved", false)
    .order("created_at", { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="error">No se pudieron cargar los usuarios pendientes.</p>`;
    return;
  }

  if (!usuarios || usuarios.length === 0) {
    contenedor.innerHTML = `<p>No hay usuarios pendientes.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Área</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${usuarios.map(usuario => `
            <tr>
              <td>${usuario.full_name}</td>
              <td>${usuario.email}</td>
              <td>${usuario.role}</td>
              <td>
                <button class="approve-btn" data-id="${usuario.id}">
                  Aprobar
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  const botonesAprobar = document.querySelectorAll(".approve-btn");

  botonesAprobar.forEach(boton => {
    boton.addEventListener("click", async function() {
      const userId = this.getAttribute("data-id");

      const { data: userData } = await supabaseClient.auth.getUser();

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
          approved_by: userData.user.id
        })
        .eq("id", userId);

      if (updateError) {
        alert("No se pudo aprobar el usuario.");
        return;
      }

      alert("Usuario aprobado correctamente.");
      await cargarModuloADM();
    });
  });
}

async function cargarModuloLaboratorio() {
  const modulePreview = document.getElementById("modulePreview");

  modulePreview.innerHTML = `
    <h2>Servicio de Laboratorio</h2>
    <p>Panel general y gestión interna del área de laboratorio.</p>

    <div class="lab-menu">
      <button class="lab-option active-lab-option" data-lab="resumen">Resumen</button>
      <button class="lab-option" data-lab="pacientes">Ingreso de pacientes</button>
      <button class="lab-option" data-lab="pruebas">Registro de pruebas</button>
      <button class="lab-option" data-lab="entregas">Entregas impresas</button>
      <button class="lab-option" data-lab="inventario">Manejo de inventario</button>
      <button class="lab-option" data-lab="historial">Historial</button>
    </div>

    <div id="labContent" class="lab-content">
      Cargando resumen...
    </div>
  `;

  const opciones = document.querySelectorAll(".lab-option");

  opciones.forEach(opcion => {
    opcion.addEventListener("click", async function() {
      opciones.forEach(btn => btn.classList.remove("active-lab-option"));
      this.classList.add("active-lab-option");

      const modulo = this.getAttribute("data-lab");

      if (modulo === "resumen") {
        await cargarResumenLaboratorio();
      }

      if (modulo === "pacientes") {
        await cargarIngresoPacientes();
      }

      if (modulo === "pruebas") {
        await cargarRegistroPruebas();
      }

      if (modulo === "entregas") {
        await cargarEntregasImpresas();
      }

      if (modulo === "inventario") {
        await cargarInventarioLaboratorio();
      }

      if (modulo === "historial") {
        await cargarHistorialLaboratorio();
      }
    });
  });

  await cargarResumenLaboratorio();
}

async function cargarIngresoPacientes() {
  const labContent = document.getElementById("labContent");

  labContent.innerHTML = `
    <h3>Ingreso de pacientes</h3>
    <p>Registro de pacientes que ingresan al servicio de laboratorio.</p>

    <form id="labPatientForm" class="module-form">
      <input type="hidden" id="labPatientId">

      <div class="form-grid">
        <div class="form-group">
          <label>Código de paciente</label>
          <input type="text" id="patientCode" placeholder="Ej: PAC-001">
        </div>

        <div class="form-group">
          <label>Nombre completo</label>
          <input type="text" id="patientFullName" placeholder="Nombre del paciente" required>
        </div>

        <div class="form-group">
          <label>CI / Documento</label>
          <input type="text" id="patientDocument" placeholder="CI o documento">
        </div>

        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" id="patientPhone" placeholder="Número de contacto">
        </div>

        <div class="form-group">
          <label>Edad</label>
          <input type="number" id="patientAge" placeholder="Edad">
        </div>

        <div class="form-group">
          <label>Género</label>
          <select id="patientGender">
            <option value="">Seleccione</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Observaciones</label>
        <textarea id="patientObservations" rows="3" placeholder="Observaciones del ingreso"></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" class="save-btn">Guardar paciente</button>
        <button type="button" class="clear-btn" id="clearPatientForm">Limpiar</button>
      </div>
    </form>

    <hr class="separator">

    <h3>Pacientes registrados</h3>
    <div id="patientsList">Cargando pacientes...</div>
  `;

  document
    .getElementById("labPatientForm")
    .addEventListener("submit", guardarPacienteLab);

  document
    .getElementById("clearPatientForm")
    .addEventListener("click", limpiarFormularioPacienteLab);

  await listarPacientesLab();
}

async function cargarRegistroPruebas() {
  const labContent = document.getElementById("labContent");

  labContent.innerHTML = `
    <h3>Registro de pruebas</h3>
    <p>Registro de análisis o pruebas solicitadas al laboratorio.</p>

    <form id="labTestForm" class="module-form">
      <input type="hidden" id="labTestId">

      <div class="form-grid">

        <div class="form-group">
          <label>Paciente</label>
          <select id="testPatient" required>
            <option value="">Cargando pacientes...</option>
          </select>
        </div>

        <div class="form-group">
          <label>Código de prueba</label>
          <input type="text" id="testCode" placeholder="Ej: LAB-001">
        </div>

        <div class="form-group">
          <label>Tipo de prueba</label>
          <input type="text" id="testType" placeholder="Ej: Hemograma, química sanguínea" required>
        </div>

        <div class="form-group">
          <label>Tipo de muestra</label>
          <input type="text" id="sampleType" placeholder="Ej: Sangre, orina, heces">
        </div>

        <div class="form-group">
          <label>Estado</label>
          <select id="testStatus">
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="finalizado">Finalizado</option>
            <option value="entregado">Entregado</option>
          </select>
        </div>

      </div>

      <div class="form-group">
        <label>Resultado</label>
        <textarea id="testResult" rows="3" placeholder="Resultado de la prueba"></textarea>
      </div>

      <div class="form-group">
        <label>Observaciones</label>
        <textarea id="testObservations" rows="3" placeholder="Observaciones adicionales"></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" class="save-btn">Guardar prueba</button>
        <button type="button" class="clear-btn" id="clearTestForm">Limpiar</button>
      </div>
    </form>

    <hr class="separator">

    <h3>Pruebas registradas</h3>
    <div id="testsList">Cargando pruebas...</div>
  `;

  await cargarPacientesEnSelect();

  document
    .getElementById("labTestForm")
    .addEventListener("submit", guardarPruebaLab);

  document
    .getElementById("clearTestForm")
    .addEventListener("click", limpiarFormularioPruebaLab);

  await listarPruebasLab();
}

async function cargarEntregasImpresas() {
  const labContent = document.getElementById("labContent");

  labContent.innerHTML = `
    <h3>Entregas impresas</h3>
    <p>Control de resultados impresos y entregados al paciente.</p>

    <form id="labDeliveryForm" class="module-form">
      <input type="hidden" id="labDeliveryId">

      <div class="form-grid">
        <div class="form-group">
          <label>Prueba finalizada</label>
          <select id="deliveryTest" required>
            <option value="">Cargando pruebas...</option>
          </select>
        </div>

        <div class="form-group">
          <label>Entregado a</label>
          <input type="text" id="deliveredTo" placeholder="Nombre de quien recibe" required>
        </div>

        <div class="form-group">
          <label>Fecha de entrega</label>
          <input type="date" id="deliveryDate" required>
        </div>

        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" id="printedCheck">
            Resultado impreso
          </label>

          <label>
            <input type="checkbox" id="deliveredCheck">
            Resultado entregado
          </label>
        </div>
      </div>

      <div class="form-group">
        <label>Observaciones</label>
        <textarea id="deliveryObservations" rows="3" placeholder="Observaciones de la entrega"></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" class="save-btn">Registrar entrega</button>
        <button type="button" class="clear-btn" id="clearDeliveryForm">Limpiar</button>
      </div>
    </form>

    <hr class="separator">

    <h3>Entregas registradas</h3>
    <div id="deliveriesList">Cargando entregas...</div>
  `;

  document.getElementById("deliveryDate").valueAsDate = new Date();

  await cargarPruebasFinalizadasSelect();

  document
    .getElementById("labDeliveryForm")
    .addEventListener("submit", guardarEntregaLab);

  document
    .getElementById("clearDeliveryForm")
    .addEventListener("click", limpiarFormularioEntregaLab);

  await listarEntregasLab();
}

async function cargarInventarioLaboratorio() {
  const labContent = document.getElementById("labContent");

  labContent.innerHTML = `
    <h3>Manejo de inventario</h3>
    <p>Control de insumos, reactivos, materiales y equipos del laboratorio.</p>

    <form id="inventoryForm" class="module-form">
      <input type="hidden" id="inventoryId">

      <div class="form-grid">
        <div class="form-group">
          <label>Nombre del insumo</label>
          <input type="text" id="itemName" placeholder="Ej: Tubos de ensayo" required>
        </div>

        <div class="form-group">
          <label>Categoría</label>
          <input type="text" id="itemCategory" placeholder="Ej: Reactivo, material, equipo">
        </div>

        <div class="form-group">
          <label>Cantidad actual</label>
          <input type="number" id="itemQuantity" placeholder="Cantidad actual" required>
        </div>

        <div class="form-group">
          <label>Stock mínimo</label>
          <input type="number" id="minimumStock" placeholder="Cantidad mínima permitida" required>
        </div>

        <div class="form-group">
          <label>Fecha de vencimiento</label>
          <input type="date" id="expirationDate">
        </div>
      </div>

      <div class="form-group">
        <label>Observaciones</label>
        <textarea id="inventoryObservations" rows="3" placeholder="Observaciones del insumo"></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" class="save-btn">Guardar insumo</button>
        <button type="button" class="clear-btn" id="clearInventoryForm">Limpiar</button>
      </div>
    </form>

    <hr class="separator">

    <h3>Inventario registrado</h3>
    <div id="inventoryList">Cargando inventario...</div>
  `;

  document
    .getElementById("inventoryForm")
    .addEventListener("submit", guardarInventarioLab);

  document
    .getElementById("clearInventoryForm")
    .addEventListener("click", limpiarFormularioInventarioLab);

  await listarInventarioLab();
}

async function cargarHistorialLaboratorio() {
  const labContent = document.getElementById("labContent");

  labContent.innerHTML = `
    <h3>Historial de laboratorio</h3>
    <p>Vista general de pacientes, pruebas, entregas e inventario del laboratorio.</p>

    <div id="historyStats" class="history-stats">
      Cargando resumen...
    </div>

    <div class="history-filters">
      <div class="form-group">
        <label>Buscar</label>
        <input type="text" id="historySearch" placeholder="Buscar por paciente, código o prueba">
      </div>

      <div class="form-group">
        <label>Estado de prueba</label>
        <select id="historyStatus">
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="finalizado">Finalizado</option>
          <option value="entregado">Entregado</option>
        </select>
      </div>

      <div class="form-group filter-button-group">
        <button type="button" class="save-btn" id="refreshHistoryBtn">
          Actualizar historial
        </button>
      </div>
    </div>

    <hr class="separator">

    <h3>Historial de pruebas</h3>
    <div id="historyTestsList">Cargando pruebas...</div>

    <hr class="separator">

    <h3>Entregas registradas</h3>
    <div id="historyDeliveriesList">Cargando entregas...</div>

    <hr class="separator">

    <h3>Alertas de inventario</h3>
    <div id="historyInventoryList">Cargando inventario...</div>
  `;

  document.getElementById("historySearch").addEventListener("input", renderHistorialLaboratorio);
  document.getElementById("historyStatus").addEventListener("change", renderHistorialLaboratorio);

  document.getElementById("refreshHistoryBtn").addEventListener("click", async function() {
    await cargarDatosHistorialLaboratorio();
  });

  await cargarDatosHistorialLaboratorio();
}

async function guardarRegistroLaboratorio(e) {
  e.preventDefault();

  const labId = document.getElementById("labId").value;

  const registro = {
    patient_name: document.getElementById("patientName").value.trim(),
    owner_name: document.getElementById("ownerName").value.trim(),
    species: document.getElementById("species").value.trim(),
    analysis_type: document.getElementById("analysisType").value.trim(),
    sample_code: document.getElementById("sampleCode").value.trim(),
    status: document.getElementById("labStatus").value,
    result: document.getElementById("labResult").value.trim(),
    observations: document.getElementById("labObservations").value.trim()
  };

  let response;

  if (labId) {
    response = await supabaseClient
      .from("laboratory_services")
      .update(registro)
      .eq("id", labId);
  } else {
    response = await supabaseClient
      .from("laboratory_services")
      .insert(registro);
  }

  if (response.error) {
    alert("Error al guardar el registro: " + response.error.message);
    return;
  }

  alert(labId ? "Registro actualizado correctamente." : "Registro guardado correctamente.");

  limpiarFormularioLaboratorio();
  await listarRegistrosLaboratorio();
}

async function listarRegistrosLaboratorio() {
  const contenedor = document.getElementById("laboratorioListado");

  const { data, error } = await supabaseClient
    .from("laboratory_services")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="error">No se pudieron cargar los registros.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = `<p>No hay registros de laboratorio todavía.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Propietario</th>
            <th>Especie</th>
            <th>Análisis</th>
            <th>Código</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(registro => `
            <tr>
              <td>${registro.patient_name}</td>
              <td>${registro.owner_name}</td>
              <td>${registro.species || "-"}</td>
              <td>${registro.analysis_type}</td>
              <td>${registro.sample_code || "-"}</td>
              <td>
                <span class="status-badge ${registro.status}">
                  ${formatearEstado(registro.status)}
                </span>
              </td>
              <td>
                <button class="edit-btn" onclick='editarRegistroLaboratorio(${JSON.stringify(registro)})'>
                  Editar
                </button>
                <button class="delete-btn" onclick="eliminarRegistroLaboratorio('${registro.id}')">
                  Eliminar
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function editarRegistroLaboratorio(registro) {
  document.getElementById("labId").value = registro.id;
  document.getElementById("patientName").value = registro.patient_name || "";
  document.getElementById("ownerName").value = registro.owner_name || "";
  document.getElementById("species").value = registro.species || "";
  document.getElementById("analysisType").value = registro.analysis_type || "";
  document.getElementById("sampleCode").value = registro.sample_code || "";
  document.getElementById("labStatus").value = registro.status || "pendiente";
  document.getElementById("labResult").value = registro.result || "";
  document.getElementById("labObservations").value = registro.observations || "";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function eliminarRegistroLaboratorio(id) {
  const confirmar = confirm("¿Seguro que desea eliminar este registro?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("laboratory_services")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar el registro.");
    return;
  }

  alert("Registro eliminado correctamente.");
  await listarRegistrosLaboratorio();
}

function limpiarFormularioLaboratorio() {
  document.getElementById("labId").value = "";
  document.getElementById("laboratorioForm").reset();
}

function formatearEstado(estado) {
  if (estado === "pendiente") return "Pendiente";
  if (estado === "en_proceso") return "En proceso";
  if (estado === "finalizado") return "Finalizado";
  return estado;
}

async function guardarPacienteLab(e) {
  e.preventDefault();

  const patientId = document.getElementById("labPatientId").value;

  const paciente = {
    patient_code: document.getElementById("patientCode").value.trim() || null,
    full_name: document.getElementById("patientFullName").value.trim(),
    document_number: document.getElementById("patientDocument").value.trim() || null,
    phone: document.getElementById("patientPhone").value.trim() || null,
    age: document.getElementById("patientAge").value || null,
    gender: document.getElementById("patientGender").value || null,
    observations: document.getElementById("patientObservations").value.trim() || null
  };

  let response;

  if (patientId) {
    response = await supabaseClient
      .from("lab_patients")
      .update(paciente)
      .eq("id", patientId);
  } else {
    response = await supabaseClient
      .from("lab_patients")
      .insert(paciente);
  }

  if (response.error) {
    alert("Error al guardar el paciente: " + response.error.message);
    return;
  }

  alert(patientId ? "Paciente actualizado correctamente." : "Paciente registrado correctamente.");

  limpiarFormularioPacienteLab();
  await listarPacientesLab();
}

async function listarPacientesLab() {
  const contenedor = document.getElementById("patientsList");

  const { data, error } = await supabaseClient
    .from("lab_patients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="error">No se pudieron cargar los pacientes.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = `<p>Todavía no hay pacientes registrados.</p>`;
    return;
  }

  window.labPatientsData = data;

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Teléfono</th>
            <th>Edad</th>
            <th>Género</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(paciente => `
            <tr>
              <td>${paciente.patient_code || "-"}</td>
              <td>${paciente.full_name}</td>
              <td>${paciente.document_number || "-"}</td>
              <td>${paciente.phone || "-"}</td>
              <td>${paciente.age || "-"}</td>
              <td>${paciente.gender || "-"}</td>
              <td>
                <button class="edit-btn" data-id="${paciente.id}">
                  Editar
                </button>
                <button class="delete-btn" data-id="${paciente.id}">
                  Eliminar
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const id = this.getAttribute("data-id");
      const paciente = window.labPatientsData.find(item => item.id === id);
      editarPacienteLab(paciente);
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async function() {
      const id = this.getAttribute("data-id");
      await eliminarPacienteLab(id);
    });
  });
}

function editarPacienteLab(paciente) {
  document.getElementById("labPatientId").value = paciente.id;
  document.getElementById("patientCode").value = paciente.patient_code || "";
  document.getElementById("patientFullName").value = paciente.full_name || "";
  document.getElementById("patientDocument").value = paciente.document_number || "";
  document.getElementById("patientPhone").value = paciente.phone || "";
  document.getElementById("patientAge").value = paciente.age || "";
  document.getElementById("patientGender").value = paciente.gender || "";
  document.getElementById("patientObservations").value = paciente.observations || "";

  document.querySelector("#labContent").scrollIntoView({
    behavior: "smooth"
  });
}

async function eliminarPacienteLab(id) {
  const confirmar = confirm("¿Seguro que desea eliminar este paciente?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("lab_patients")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar el paciente.");
    return;
  }

  alert("Paciente eliminado correctamente.");
  await listarPacientesLab();
}

function limpiarFormularioPacienteLab() {
  document.getElementById("labPatientId").value = "";
  document.getElementById("labPatientForm").reset();
}

async function cargarPacientesEnSelect() {
  const selectPaciente = document.getElementById("testPatient");

  const { data, error } = await supabaseClient
    .from("lab_patients")
    .select("id, patient_code, full_name, document_number")
    .order("created_at", { ascending: false });

  if (error) {
    selectPaciente.innerHTML = `<option value="">Error al cargar pacientes</option>`;
    return;
  }

  if (!data || data.length === 0) {
    selectPaciente.innerHTML = `<option value="">No hay pacientes registrados</option>`;
    return;
  }

  selectPaciente.innerHTML = `
    <option value="">Seleccione un paciente</option>
    ${data.map(paciente => `
      <option value="${paciente.id}">
        ${paciente.patient_code || "Sin código"} - ${paciente.full_name}
      </option>
    `).join("")}
  `;
}

async function guardarPruebaLab(e) {
  e.preventDefault();

  const testId = document.getElementById("labTestId").value;

  const prueba = {
    patient_id: document.getElementById("testPatient").value,
    test_code: document.getElementById("testCode").value.trim() || null,
    test_type: document.getElementById("testType").value.trim(),
    sample_type: document.getElementById("sampleType").value.trim() || null,
    status: document.getElementById("testStatus").value,
    result: document.getElementById("testResult").value.trim() || null,
    observations: document.getElementById("testObservations").value.trim() || null
  };

  if (!prueba.patient_id) {
    alert("Debe seleccionar un paciente.");
    return;
  }

  let response;

  if (testId) {
    response = await supabaseClient
      .from("lab_tests")
      .update(prueba)
      .eq("id", testId);
  } else {
    response = await supabaseClient
      .from("lab_tests")
      .insert(prueba);
  }

  if (response.error) {
    alert("Error al guardar la prueba: " + response.error.message);
    return;
  }

  alert(testId ? "Prueba actualizada correctamente." : "Prueba registrada correctamente.");

  limpiarFormularioPruebaLab();
  await listarPruebasLab();
}

async function listarPruebasLab() {
  const contenedor = document.getElementById("testsList");

  const { data, error } = await supabaseClient
    .from("lab_tests")
    .select(`
      *,
      patient:lab_patients (
        full_name,
        patient_code,
        document_number
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="error">No se pudieron cargar las pruebas.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = `<p>Todavía no hay pruebas registradas.</p>`;
    return;
  }

  window.labTestsData = data;

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Paciente</th>
            <th>Prueba</th>
            <th>Muestra</th>
            <th>Estado</th>
            <th>Resultado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(prueba => `
            <tr>
              <td>${prueba.test_code || "-"}</td>
              <td>
                ${prueba.patient?.full_name || "Sin paciente"}
                <br>
                <small>${prueba.patient?.patient_code || ""}</small>
              </td>
              <td>${prueba.test_type}</td>
              <td>${prueba.sample_type || "-"}</td>
              <td>
                <span class="status-badge ${prueba.status}">
                  ${formatearEstadoPrueba(prueba.status)}
                </span>
              </td>
              <td>${prueba.result || "-"}</td>
              <td>
                <button class="edit-btn test-edit-btn" data-id="${prueba.id}">
                  Editar
                </button>
                <button class="delete-btn test-delete-btn" data-id="${prueba.id}">
                  Eliminar
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll(".test-edit-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const id = this.getAttribute("data-id");
      const prueba = window.labTestsData.find(item => item.id === id);
      editarPruebaLab(prueba);
    });
  });

  document.querySelectorAll(".test-delete-btn").forEach(btn => {
    btn.addEventListener("click", async function() {
      const id = this.getAttribute("data-id");
      await eliminarPruebaLab(id);
    });
  });
}

function editarPruebaLab(prueba) {
  document.getElementById("labTestId").value = prueba.id;
  document.getElementById("testPatient").value = prueba.patient_id || "";
  document.getElementById("testCode").value = prueba.test_code || "";
  document.getElementById("testType").value = prueba.test_type || "";
  document.getElementById("sampleType").value = prueba.sample_type || "";
  document.getElementById("testStatus").value = prueba.status || "pendiente";
  document.getElementById("testResult").value = prueba.result || "";
  document.getElementById("testObservations").value = prueba.observations || "";

  document.querySelector("#labContent").scrollIntoView({
    behavior: "smooth"
  });
}

async function eliminarPruebaLab(id) {
  const confirmar = confirm("¿Seguro que desea eliminar esta prueba?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("lab_tests")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar la prueba.");
    return;
  }

  alert("Prueba eliminada correctamente.");
  await listarPruebasLab();
}

function limpiarFormularioPruebaLab() {
  document.getElementById("labTestId").value = "";
  document.getElementById("labTestForm").reset();
}

function formatearEstadoPrueba(estado) {
  if (estado === "pendiente") return "Pendiente";
  if (estado === "en_proceso") return "En proceso";
  if (estado === "finalizado") return "Finalizado";
  if (estado === "entregado") return "Entregado";
  return estado;
}

async function cargarPruebasFinalizadasSelect() {
  const selectPrueba = document.getElementById("deliveryTest");

  const { data, error } = await supabaseClient
    .from("lab_tests")
    .select(`
      id,
      test_code,
      test_type,
      status,
      patient:lab_patients (
        full_name,
        patient_code
      )
    `)
    .in("status", ["finalizado", "entregado"])
    .order("created_at", { ascending: false });

  if (error) {
    selectPrueba.innerHTML = `<option value="">Error al cargar pruebas</option>`;
    return;
  }

  if (!data || data.length === 0) {
    selectPrueba.innerHTML = `<option value="">No hay pruebas finalizadas</option>`;
    return;
  }

  selectPrueba.innerHTML = `
    <option value="">Seleccione una prueba</option>
    ${data.map(prueba => `
      <option value="${prueba.id}">
        ${prueba.test_code || "Sin código"} - ${prueba.test_type} - ${prueba.patient?.full_name || "Sin paciente"}
      </option>
    `).join("")}
  `;
}

async function guardarEntregaLab(e) {
  e.preventDefault();

  const deliveryId = document.getElementById("labDeliveryId").value;

  const entrega = {
    test_id: document.getElementById("deliveryTest").value,
    delivered_to: document.getElementById("deliveredTo").value.trim(),
    delivery_date: document.getElementById("deliveryDate").value,
    printed: document.getElementById("printedCheck").checked,
    delivered: document.getElementById("deliveredCheck").checked,
    observations: document.getElementById("deliveryObservations").value.trim() || null
  };

  if (!entrega.test_id) {
    alert("Debe seleccionar una prueba finalizada.");
    return;
  }

  let response;

  if (deliveryId) {
    response = await supabaseClient
      .from("lab_deliveries")
      .update(entrega)
      .eq("id", deliveryId);
  } else {
    response = await supabaseClient
      .from("lab_deliveries")
      .insert(entrega);
  }

  if (response.error) {
    alert("Error al registrar la entrega: " + response.error.message);
    return;
  }

  if (entrega.delivered) {
    await supabaseClient
      .from("lab_tests")
      .update({ status: "entregado" })
      .eq("id", entrega.test_id);
  }

  alert(deliveryId ? "Entrega actualizada correctamente." : "Entrega registrada correctamente.");

  limpiarFormularioEntregaLab();
  await cargarPruebasFinalizadasSelect();
  await listarEntregasLab();
}

async function listarEntregasLab() {
  const contenedor = document.getElementById("deliveriesList");

  const { data, error } = await supabaseClient
    .from("lab_deliveries")
    .select(`
      *,
      test:lab_tests (
        id,
        test_code,
        test_type,
        sample_type,
        status,
        result,
        observations,
        patient:lab_patients (
          full_name,
          patient_code,
          document_number
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="error">No se pudieron cargar las entregas.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = `<p>Todavía no hay entregas registradas.</p>`;
    return;
  }

  window.labDeliveriesData = data;

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Prueba</th>
            <th>Paciente</th>
            <th>Entregado a</th>
            <th>Fecha</th>
            <th>Impreso</th>
            <th>Entregado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(entrega => `
            <tr>
              <td>
                ${entrega.test?.test_code || "-"}
                <br>
                <small>${entrega.test?.test_type || ""}</small>
              </td>

              <td>
                ${entrega.test?.patient?.full_name || "Sin paciente"}
                <br>
                <small>${entrega.test?.patient?.patient_code || ""}</small>
              </td>

              <td>${entrega.delivered_to}</td>
              <td>${entrega.delivery_date}</td>

              <td>
                <span class="status-badge ${entrega.printed ? "finalizado" : "pendiente"}">
                  ${entrega.printed ? "Sí" : "No"}
                </span>
              </td>

              <td>
                <span class="status-badge ${entrega.delivered ? "entregado" : "pendiente"}">
                  ${entrega.delivered ? "Sí" : "No"}
                </span>
              </td>

              <td>
                <button class="edit-btn delivery-edit-btn" data-id="${entrega.id}">
                  Editar
                </button>

                <button class="delete-btn delivery-delete-btn" data-id="${entrega.id}">
                  Eliminar
                </button>

                <div class="action-buttons">
                  <button class="print-btn" onclick="imprimirResultadoLab('${entrega.id}')">
                    Imprimir
                  </button>

                  <button type="button" class="pdf-btn" onclick="generarPDFResultadoLab('${entrega.id}')">
                    Generar PDF
                    </button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll(".delivery-edit-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const id = this.getAttribute("data-id");
      const entrega = window.labDeliveriesData.find(item => item.id === id);
      editarEntregaLab(entrega);
    });
  });

  document.querySelectorAll(".delivery-delete-btn").forEach(btn => {
    btn.addEventListener("click", async function() {
      const id = this.getAttribute("data-id");
      await eliminarEntregaLab(id);
    });
  });
}

function editarEntregaLab(entrega) {
  document.getElementById("labDeliveryId").value = entrega.id;
  document.getElementById("deliveryTest").value = entrega.test_id || "";
  document.getElementById("deliveredTo").value = entrega.delivered_to || "";
  document.getElementById("deliveryDate").value = entrega.delivery_date || "";
  document.getElementById("printedCheck").checked = entrega.printed || false;
  document.getElementById("deliveredCheck").checked = entrega.delivered || false;
  document.getElementById("deliveryObservations").value = entrega.observations || "";

  document.querySelector("#labContent").scrollIntoView({
    behavior: "smooth"
  });
}

async function eliminarEntregaLab(id) {
  const confirmar = confirm("¿Seguro que desea eliminar esta entrega?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("lab_deliveries")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar la entrega.");
    return;
  }

  alert("Entrega eliminada correctamente.");
  await listarEntregasLab();
}

function limpiarFormularioEntregaLab() {
  document.getElementById("labDeliveryId").value = "";
  document.getElementById("labDeliveryForm").reset();
  document.getElementById("deliveryDate").valueAsDate = new Date();
}

function imprimirResultadoLab(id) {
  const entrega = window.labDeliveriesData.find(item => item.id === id);

  if (!entrega) {
    alert("No se encontró la entrega.");
    return;
  }

  const ventana = window.open("", "_blank");

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Resultado de Laboratorio</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 40px;
          color: #111827;
        }

        .header {
          text-align: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 15px;
          margin-bottom: 25px;
        }

        .header h1 {
          margin: 0;
          color: #2563eb;
        }

        .section {
          margin-bottom: 20px;
        }

        .section h3 {
          background: #f3f4f6;
          padding: 10px;
          border-radius: 8px;
        }

        p {
          line-height: 1.5;
        }

        .footer {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }

        .firma {
          width: 220px;
          text-align: center;
          border-top: 1px solid #111827;
          padding-top: 8px;
        }

        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>

      <div class="header">
        <h1>Resultado de Laboratorio</h1>
        <p>Servicio de Laboratorio</p>
      </div>

      <div class="section">
        <h3>Datos del paciente</h3>
        <p><strong>Paciente:</strong> ${entrega.test?.patient?.full_name || "-"}</p>
        <p><strong>Código paciente:</strong> ${entrega.test?.patient?.patient_code || "-"}</p>
        <p><strong>Documento:</strong> ${entrega.test?.patient?.document_number || "-"}</p>
      </div>

      <div class="section">
        <h3>Datos de la prueba</h3>
        <p><strong>Código de prueba:</strong> ${entrega.test?.test_code || "-"}</p>
        <p><strong>Tipo de prueba:</strong> ${entrega.test?.test_type || "-"}</p>
        <p><strong>Estado:</strong> ${entrega.test?.status || "-"}</p>
      </div>

      <div class="section">
        <h3>Entrega</h3>
        <p><strong>Entregado a:</strong> ${entrega.delivered_to}</p>
        <p><strong>Fecha:</strong> ${entrega.delivery_date}</p>
        <p><strong>Observaciones:</strong> ${entrega.observations || "-"}</p>
      </div>

      <div class="footer">
        <div class="firma">Responsable de laboratorio</div>
        <div class="firma">Recibí conforme</div>
      </div>

      <br><br>
      <button onclick="window.print()">Imprimir</button>

    </body>
    </html>
  `);

  ventana.document.close();
}

window.generarPDFResultadoLab = function(id) {
  try {
    if (!window.jspdf) {
      alert("No se cargó la librería jsPDF. Revisa el script en dashboard.html.");
      return;
    }

    if (!window.labDeliveriesData) {
      alert("No hay datos de entregas cargados.");
      return;
    }

    const entrega = window.labDeliveriesData.find(item => item.id === id);

    if (!entrega) {
      alert("No se encontró la entrega.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const paciente = entrega.test?.patient?.full_name || "-";
    const codigoPaciente = entrega.test?.patient?.patient_code || "-";
    const documento = entrega.test?.patient?.document_number || "-";
    const codigoPrueba = entrega.test?.test_code || "-";
    const tipoPrueba = entrega.test?.test_type || "-";
    const tipoMuestra = entrega.test?.sample_type || "-";
    const estado = entrega.test?.status || "-";
    const resultado = entrega.test?.result || "Sin resultado registrado.";
    const observacionesPrueba = entrega.test?.observations || "-";
    const observacionesEntrega = entrega.observations || "-";

    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Resultado de Laboratorio", 105, y, { align: "center" });

    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Servicio de Laboratorio", 105, y, { align: "center" });

    y += 10;
    doc.line(20, y, 190, y);

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Datos del paciente", 20, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Paciente: ${paciente}`, 20, y);

    y += 8;
    doc.text(`Código paciente: ${codigoPaciente}`, 20, y);

    y += 8;
    doc.text(`Documento: ${documento}`, 20, y);

    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Datos de la prueba", 20, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Código de prueba: ${codigoPrueba}`, 20, y);

    y += 8;
    doc.text(`Tipo de prueba: ${tipoPrueba}`, 20, y);

    y += 8;
    doc.text(`Tipo de muestra: ${tipoMuestra}`, 20, y);

    y += 8;
    doc.text(`Estado: ${estado}`, 20, y);

    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Resultado", 20, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const resultadoTexto = doc.splitTextToSize(resultado, 170);
    doc.text(resultadoTexto, 20, y);
    y += resultadoTexto.length * 7;

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones de la prueba", 20, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    const obsPruebaTexto = doc.splitTextToSize(observacionesPrueba, 170);
    doc.text(obsPruebaTexto, 20, y);
    y += obsPruebaTexto.length * 7;

    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Datos de entrega", 20, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Entregado a: ${entrega.delivered_to}`, 20, y);

    y += 8;
    doc.text(`Fecha de entrega: ${entrega.delivery_date}`, 20, y);

    y += 8;
    doc.text(`Resultado impreso: ${entrega.printed ? "Sí" : "No"}`, 20, y);

    y += 8;
    doc.text(`Resultado entregado: ${entrega.delivered ? "Sí" : "No"}`, 20, y);

    y += 10;
    const obsEntregaTexto = doc.splitTextToSize(`Observaciones: ${observacionesEntrega}`, 170);
    doc.text(obsEntregaTexto, 20, y);

    y = 260;
    doc.line(25, y, 85, y);
    doc.line(125, y, 185, y);

    y += 7;
    doc.setFontSize(10);
    doc.text("Responsable de laboratorio", 55, y, { align: "center" });
    doc.text("Recibí conforme", 155, y, { align: "center" });

    const nombreArchivo = `resultado_${codigoPrueba}_${paciente}`
      .replaceAll(" ", "_")
      .replaceAll("/", "-");

    doc.save(`${nombreArchivo}.pdf`);

  } catch (error) {
    console.error(error);
    alert("Error al generar el PDF. Revisa la consola del navegador.");
  }
};

async function guardarInventarioLab(e) {
  e.preventDefault();

  const inventoryId = document.getElementById("inventoryId").value;

  const inventario = {
    item_name: document.getElementById("itemName").value.trim(),
    category: document.getElementById("itemCategory").value.trim() || null,
    quantity: parseInt(document.getElementById("itemQuantity").value) || 0,
    minimum_stock: parseInt(document.getElementById("minimumStock").value) || 0,
    expiration_date: document.getElementById("expirationDate").value || null,
    observations: document.getElementById("inventoryObservations").value.trim() || null
  };

  let response;

  if (inventoryId) {
    response = await supabaseClient
      .from("lab_inventory")
      .update(inventario)
      .eq("id", inventoryId);
  } else {
    response = await supabaseClient
      .from("lab_inventory")
      .insert(inventario);
  }

  if (response.error) {
    alert("Error al guardar el insumo: " + response.error.message);
    return;
  }

  alert(inventoryId ? "Insumo actualizado correctamente." : "Insumo registrado correctamente.");

  limpiarFormularioInventarioLab();
  await listarInventarioLab();
}

async function listarInventarioLab() {
  const contenedor = document.getElementById("inventoryList");

  const { data, error } = await supabaseClient
    .from("lab_inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    contenedor.innerHTML = `<p class="error">No se pudo cargar el inventario.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = `<p>Todavía no hay insumos registrados.</p>`;
    return;
  }

  window.labInventoryData = data;

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Categoría</th>
            <th>Cantidad</th>
            <th>Stock mínimo</th>
            <th>Estado</th>
            <th>Vencimiento</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => {
            const bajoStock = item.quantity <= item.minimum_stock;

            return `
              <tr class="${bajoStock ? "low-stock-row" : ""}">
                <td>${item.item_name}</td>
                <td>${item.category || "-"}</td>
                <td>${item.quantity}</td>
                <td>${item.minimum_stock}</td>
                <td>
                  <span class="status-badge ${bajoStock ? "pendiente" : "finalizado"}">
                    ${bajoStock ? "Stock bajo" : "Stock suficiente"}
                  </span>
                </td>
                <td>${item.expiration_date || "-"}</td>
                <td>
                  <button class="edit-btn inventory-edit-btn" data-id="${item.id}">
                    Editar
                  </button>

                  <button class="delete-btn inventory-delete-btn" data-id="${item.id}">
                    Eliminar
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll(".inventory-edit-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const id = this.getAttribute("data-id");
      const item = window.labInventoryData.find(elemento => elemento.id === id);
      editarInventarioLab(item);
    });
  });

  document.querySelectorAll(".inventory-delete-btn").forEach(btn => {
    btn.addEventListener("click", async function() {
      const id = this.getAttribute("data-id");
      await eliminarInventarioLab(id);
    });
  });
}

function editarInventarioLab(item) {
  document.getElementById("inventoryId").value = item.id;
  document.getElementById("itemName").value = item.item_name || "";
  document.getElementById("itemCategory").value = item.category || "";
  document.getElementById("itemQuantity").value = item.quantity || 0;
  document.getElementById("minimumStock").value = item.minimum_stock || 0;
  document.getElementById("expirationDate").value = item.expiration_date || "";
  document.getElementById("inventoryObservations").value = item.observations || "";

  document.querySelector("#labContent").scrollIntoView({
    behavior: "smooth"
  });
}

async function eliminarInventarioLab(id) {
  const confirmar = confirm("¿Seguro que desea eliminar este insumo del inventario?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("lab_inventory")
    .delete()
    .eq("id", id);

  if (error) {
    alert("No se pudo eliminar el insumo.");
    return;
  }

  alert("Insumo eliminado correctamente.");
  await listarInventarioLab();
}

function limpiarFormularioInventarioLab() {
  document.getElementById("inventoryId").value = "";
  document.getElementById("inventoryForm").reset();
}

async function cargarDatosHistorialLaboratorio() {
  const testsList = document.getElementById("historyTestsList");
  const deliveriesList = document.getElementById("historyDeliveriesList");
  const inventoryList = document.getElementById("historyInventoryList");
  const stats = document.getElementById("historyStats");

  if (!testsList || !deliveriesList || !inventoryList || !stats) return;

  stats.innerHTML = "Cargando resumen...";
  testsList.innerHTML = "Cargando pruebas...";
  deliveriesList.innerHTML = "Cargando entregas...";
  inventoryList.innerHTML = "Cargando inventario...";

  const [testsResponse, deliveriesResponse, inventoryResponse] = await Promise.all([
    supabaseClient
      .from("lab_tests")
      .select(`
        id,
        test_code,
        test_type,
        sample_type,
        status,
        result,
        observations,
        created_at,
        patient:lab_patients (
          full_name,
          patient_code,
          document_number
        )
      `)
      .order("created_at", { ascending: false }),

    supabaseClient
      .from("lab_deliveries")
      .select(`
        id,
        delivered_to,
        delivery_date,
        printed,
        delivered,
        observations,
        created_at,
        test:lab_tests (
          test_code,
          test_type,
          patient:lab_patients (
            full_name,
            patient_code
          )
        )
      `)
      .order("created_at", { ascending: false }),

    supabaseClient
      .from("lab_inventory")
      .select("*")
      .order("created_at", { ascending: false })
  ]);

  if (testsResponse.error || deliveriesResponse.error || inventoryResponse.error) {
    stats.innerHTML = `<p class="error">No se pudo cargar el historial.</p>`;
    testsList.innerHTML = "";
    deliveriesList.innerHTML = "";
    inventoryList.innerHTML = "";
    return;
  }

  window.labHistoryData = {
    tests: testsResponse.data || [],
    deliveries: deliveriesResponse.data || [],
    inventory: inventoryResponse.data || []
  };

  renderHistorialLaboratorio();
}

function renderHistorialLaboratorio() {
  const historyData = window.labHistoryData;

  if (!historyData) return;

  const searchInput = document.getElementById("historySearch");
  const statusInput = document.getElementById("historyStatus");

  const search = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const status = statusInput ? statusInput.value : "";

  let tests = historyData.tests;

  if (status) {
    tests = tests.filter(test => test.status === status);
  }

  if (search) {
    tests = tests.filter(test => {
      const paciente = test.patient?.full_name?.toLowerCase() || "";
      const codigoPaciente = test.patient?.patient_code?.toLowerCase() || "";
      const codigoPrueba = test.test_code?.toLowerCase() || "";
      const tipoPrueba = test.test_type?.toLowerCase() || "";

      return (
        paciente.includes(search) ||
        codigoPaciente.includes(search) ||
        codigoPrueba.includes(search) ||
        tipoPrueba.includes(search)
      );
    });
  }

  const totalPruebas = historyData.tests.length;
  const pendientes = historyData.tests.filter(test => test.status === "pendiente").length;
  const enProceso = historyData.tests.filter(test => test.status === "en_proceso").length;
  const finalizadas = historyData.tests.filter(test => test.status === "finalizado").length;
  const entregadas = historyData.tests.filter(test => test.status === "entregado").length;
  const totalEntregas = historyData.deliveries.length;
  const stockBajo = historyData.inventory.filter(item => item.quantity <= item.minimum_stock).length;

  document.getElementById("historyStats").innerHTML = `
    <div class="stat-card">
      <h4>Total pruebas</h4>
      <strong>${totalPruebas}</strong>
    </div>

    <div class="stat-card">
      <h4>Pendientes</h4>
      <strong>${pendientes}</strong>
    </div>

    <div class="stat-card">
      <h4>En proceso</h4>
      <strong>${enProceso}</strong>
    </div>

    <div class="stat-card">
      <h4>Finalizadas</h4>
      <strong>${finalizadas}</strong>
    </div>

    <div class="stat-card">
      <h4>Entregadas</h4>
      <strong>${entregadas}</strong>
    </div>

    <div class="stat-card alert-stat">
      <h4>Stock bajo</h4>
      <strong>${stockBajo}</strong>
    </div>
  `;

  renderTablaHistorialPruebas(tests);
  renderTablaHistorialEntregas(historyData.deliveries);
  renderTablaHistorialInventario(historyData.inventory);
}

function renderTablaHistorialPruebas(tests) {
  const contenedor = document.getElementById("historyTestsList");

  if (!tests || tests.length === 0) {
    contenedor.innerHTML = `<p>No hay pruebas para mostrar.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Código prueba</th>
            <th>Paciente</th>
            <th>Prueba</th>
            <th>Muestra</th>
            <th>Estado</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          ${tests.map(test => `
            <tr>
              <td>${formatearFechaLab(test.created_at)}</td>
              <td>${test.test_code || "-"}</td>
              <td>
                ${test.patient?.full_name || "Sin paciente"}
                <br>
                <small>${test.patient?.patient_code || ""}</small>
              </td>
              <td>${test.test_type || "-"}</td>
              <td>${test.sample_type || "-"}</td>
              <td>
                <span class="status-badge ${test.status}">
                  ${formatearEstadoPrueba(test.status)}
                </span>
              </td>
              <td>${test.result || "Sin resultado"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTablaHistorialEntregas(deliveries) {
  const contenedor = document.getElementById("historyDeliveriesList");

  if (!deliveries || deliveries.length === 0) {
    contenedor.innerHTML = `<p>No hay entregas registradas.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Fecha entrega</th>
            <th>Prueba</th>
            <th>Paciente</th>
            <th>Entregado a</th>
            <th>Impreso</th>
            <th>Entregado</th>
          </tr>
        </thead>
        <tbody>
          ${deliveries.map(entrega => `
            <tr>
              <td>${entrega.delivery_date || "-"}</td>
              <td>
                ${entrega.test?.test_code || "-"}
                <br>
                <small>${entrega.test?.test_type || ""}</small>
              </td>
              <td>
                ${entrega.test?.patient?.full_name || "Sin paciente"}
                <br>
                <small>${entrega.test?.patient?.patient_code || ""}</small>
              </td>
              <td>${entrega.delivered_to || "-"}</td>
              <td>
                <span class="status-badge ${entrega.printed ? "finalizado" : "pendiente"}">
                  ${entrega.printed ? "Sí" : "No"}
                </span>
              </td>
              <td>
                <span class="status-badge ${entrega.delivered ? "entregado" : "pendiente"}">
                  ${entrega.delivered ? "Sí" : "No"}
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTablaHistorialInventario(inventory) {
  const contenedor = document.getElementById("historyInventoryList");

  const stockBajo = inventory.filter(item => item.quantity <= item.minimum_stock);

  if (!stockBajo || stockBajo.length === 0) {
    contenedor.innerHTML = `<p>No hay alertas de stock bajo.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Categoría</th>
            <th>Cantidad</th>
            <th>Stock mínimo</th>
            <th>Vencimiento</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${stockBajo.map(item => `
            <tr class="low-stock-row">
              <td>${item.item_name}</td>
              <td>${item.category || "-"}</td>
              <td>${item.quantity}</td>
              <td>${item.minimum_stock}</td>
              <td>${item.expiration_date || "-"}</td>
              <td>
                <span class="status-badge pendiente">
                  Stock bajo
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatearFechaLab(fecha) {
  if (!fecha) return "-";

  const date = new Date(fecha);

  return date.toLocaleDateString("es-BO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function destruirGraficosLab() {
  if (window.labCharts && Array.isArray(window.labCharts)) {
    window.labCharts.forEach(chart => chart.destroy());
  }

  window.labCharts = [];
}

async function cargarResumenLaboratorio() {
  destruirGraficosLab();

  const labContent = document.getElementById("labContent");

  labContent.innerHTML = `
    <h3>Resumen general de laboratorio</h3>
    <p>Vista rápida de pacientes, pruebas, entregas e inventario.</p>

    <div id="labSummaryCards" class="lab-summary-grid">
      Cargando indicadores...
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <h4>Estado de pruebas</h4>
        <canvas id="chartEstadosPruebas"></canvas>
      </div>

      <div class="chart-card">
        <h4>Inventario crítico</h4>
        <canvas id="chartInventario"></canvas>
      </div>
    </div>

    <div class="summary-tables-grid">
      <div class="summary-table-card">
        <h4>Últimos 3 pacientes</h4>
        <div id="lastPatientsTable">Cargando...</div>
      </div>

      <div class="summary-table-card">
        <h4>Últimas 3 pruebas</h4>
        <div id="lastTestsTable">Cargando...</div>
      </div>

      <div class="summary-table-card">
        <h4>Inventario bajo</h4>
        <div id="lowStockTable">Cargando...</div>
      </div>

      <div class="summary-table-card">
        <h4>Próximos a vencer</h4>
        <div id="expiringStockTable">Cargando...</div>
      </div>
    </div>
  `;

  const hoy = new Date();
  const fechaHoy = hoy.toISOString().split("T")[0];

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + 30);
  const fechaLimiteTexto = fechaLimite.toISOString().split("T")[0];

  const [
    pacientesResponse,
    pruebasResponse,
    entregasResponse,
    inventarioResponse,
    ultimosPacientesResponse,
    ultimasPruebasResponse,
    proximosVencerResponse
  ] = await Promise.all([
    supabaseClient
      .from("lab_patients")
      .select("*"),

    supabaseClient
      .from("lab_tests")
      .select(`
        *,
        patient:lab_patients (
          full_name,
          patient_code
        )
      `),

    supabaseClient
      .from("lab_deliveries")
      .select("*"),

    supabaseClient
      .from("lab_inventory")
      .select("*"),

    supabaseClient
      .from("lab_patients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3),

    supabaseClient
      .from("lab_tests")
      .select(`
        *,
        patient:lab_patients (
          full_name,
          patient_code
        )
      `)
      .order("created_at", { ascending: false })
      .limit(3),

    supabaseClient
      .from("lab_inventory")
      .select("*")
      .gte("expiration_date", fechaHoy)
      .lte("expiration_date", fechaLimiteTexto)
      .order("expiration_date", { ascending: true })
  ]);

  if (
    pacientesResponse.error ||
    pruebasResponse.error ||
    entregasResponse.error ||
    inventarioResponse.error
  ) {
    labContent.innerHTML = `
      <h3>Resumen general de laboratorio</h3>
      <p class="error">No se pudo cargar el resumen del laboratorio.</p>
    `;
    return;
  }

  const pacientes = pacientesResponse.data || [];
  const pruebas = pruebasResponse.data || [];
  const entregas = entregasResponse.data || [];
  const inventario = inventarioResponse.data || [];
  const ultimosPacientes = ultimosPacientesResponse.data || [];
  const ultimasPruebas = ultimasPruebasResponse.data || [];
  const proximosVencer = proximosVencerResponse.data || [];

  const pendientes = pruebas.filter(item => item.status === "pendiente").length;
  const enProceso = pruebas.filter(item => item.status === "en_proceso").length;
  const finalizadas = pruebas.filter(item => item.status === "finalizado").length;
  const entregadas = pruebas.filter(item => item.status === "entregado").length;

  const inventarioBajo = inventario.filter(item => item.quantity <= item.minimum_stock);

  document.getElementById("labSummaryCards").innerHTML = `
    <div class="summary-card">
      <span>Total pacientes</span>
      <strong>${pacientes.length}</strong>
    </div>

    <div class="summary-card">
      <span>Total pruebas</span>
      <strong>${pruebas.length}</strong>
    </div>

    <div class="summary-card">
      <span>Pruebas pendientes</span>
      <strong>${pendientes}</strong>
    </div>

    <div class="summary-card">
      <span>Pruebas finalizadas</span>
      <strong>${finalizadas}</strong>
    </div>

    <div class="summary-card">
      <span>Entregas impresas</span>
      <strong>${entregas.length}</strong>
    </div>

    <div class="summary-card danger-card">
      <span>Stock bajo</span>
      <strong>${inventarioBajo.length}</strong>
    </div>

    <div class="summary-card warning-card">
      <span>Próximos a vencer</span>
      <strong>${proximosVencer.length}</strong>
    </div>
  `;

  renderUltimosPacientes(ultimosPacientes);
  renderUltimasPruebas(ultimasPruebas);
  renderInventarioBajo(inventarioBajo);
  renderProximosVencer(proximosVencer);

  crearGraficosResumenLab({
    pendientes,
    enProceso,
    finalizadas,
    entregadas,
    inventarioBajo,
    inventarioOk: inventario.length - inventarioBajo.length
  });
}

function renderUltimosPacientes(pacientes) {
  const contenedor = document.getElementById("lastPatientsTable");

  if (!pacientes || pacientes.length === 0) {
    contenedor.innerHTML = `<p>No hay pacientes registrados.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <table class="mini-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Paciente</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        ${pacientes.map(paciente => `
          <tr>
            <td>${paciente.patient_code || "-"}</td>
            <td>${paciente.full_name}</td>
            <td>${formatearFechaLab(paciente.created_at)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderUltimasPruebas(pruebas) {
  const contenedor = document.getElementById("lastTestsTable");

  if (!pruebas || pruebas.length === 0) {
    contenedor.innerHTML = `<p>No hay pruebas registradas.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <table class="mini-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Paciente</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${pruebas.map(prueba => `
          <tr>
            <td>${prueba.test_code || "-"}</td>
            <td>${prueba.patient?.full_name || "Sin paciente"}</td>
            <td>
              <span class="status-badge ${prueba.status}">
                ${formatearEstadoPrueba(prueba.status)}
              </span>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderInventarioBajo(items) {
  const contenedor = document.getElementById("lowStockTable");

  if (!items || items.length === 0) {
    contenedor.innerHTML = `<p>No hay inventario bajo.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <table class="mini-table">
      <thead>
        <tr>
          <th>Insumo</th>
          <th>Cantidad</th>
          <th>Mínimo</th>
        </tr>
      </thead>
      <tbody>
        ${items.slice(0, 5).map(item => `
          <tr>
            <td>${item.item_name}</td>
            <td>${item.quantity}</td>
            <td>${item.minimum_stock}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderProximosVencer(items) {
  const contenedor = document.getElementById("expiringStockTable");

  if (!items || items.length === 0) {
    contenedor.innerHTML = `<p>No hay insumos próximos a vencer.</p>`;
    return;
  }

  contenedor.innerHTML = `
    <table class="mini-table">
      <thead>
        <tr>
          <th>Insumo</th>
          <th>Categoría</th>
          <th>Vence</th>
        </tr>
      </thead>
      <tbody>
        ${items.slice(0, 5).map(item => `
          <tr>
            <td>${item.item_name}</td>
            <td>${item.category || "-"}</td>
            <td>${item.expiration_date || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function crearGraficosResumenLab(datos) {
  if (!window.Chart) {
    console.warn("Chart.js no está cargado.");
    return;
  }

  const estadoCanvas = document.getElementById("chartEstadosPruebas");
  const inventarioCanvas = document.getElementById("chartInventario");

  if (!estadoCanvas || !inventarioCanvas) return;

  const chartEstados = new Chart(estadoCanvas, {
    type: "doughnut",
    data: {
      labels: ["Pendientes", "En proceso", "Finalizadas", "Entregadas"],
      datasets: [{
        data: [
          datos.pendientes,
          datos.enProceso,
          datos.finalizadas,
          datos.entregadas
        ],
        backgroundColor: [
          "#f59e0b",
          "#2563eb",
          "#16a34a",
          "#7c3aed"
        ]
      }]
    },
    options: {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "65%",
  plugins: {
    legend: {
      position: "bottom"
    }
  }
}
  });

  const chartInventario = new Chart(inventarioCanvas, {
    type: "bar",
    data: {
      labels: ["Stock suficiente", "Stock bajo"],
      datasets: [{
        label: "Inventario",
        data: [
          datos.inventarioOk,
          datos.inventarioBajo.length
        ],
        backgroundColor: [
          "#16a34a",
          "#dc2626"
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });

  window.labCharts.push(chartEstados, chartInventario);
}