(function () {
    'use strict';

    var CONFIG = {
        TELEGRAM_TOKEN: '8932763182:AAEdN8TfO1u0iaGLbdkltDn2AsUHFT4R5Xk',
        TELEGRAM_CHAT_ID: '-1004456380737',
        HISTORY_KEY: 'permisosAlturas',
        PENDING_KEY: 'alturas_pending'
    };

    var toastTimer = null;
    var techCounter = 0;

    function $(id) { return document.getElementById(id); }

    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ===== INIT =====
    document.addEventListener('DOMContentLoaded', function () {
        initApp();
        bindEvents();
        checkDependencies();
    });

    function checkDependencies() {
        var missing = [];
        if (typeof html2canvas === 'undefined') missing.push('html2canvas');
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') missing.push('jsPDF');
        if (missing.length > 0) {
            console.warn('Librerías no cargadas:', missing.join(', '));
            setTimeout(function () {
                var stillMissing = [];
                if (typeof html2canvas === 'undefined') stillMissing.push('html2canvas');
                if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') stillMissing.push('jsPDF');
                if (stillMissing.length > 0) {
                    showToast('Error: ' + stillMissing.join(', ') + ' no se cargaron.', 'error');
                }
            }, 3000);
        }
    }

    function initApp() {
        agregarTecnico();
        iniciarCanvas('signatureCanvas_coord');
        iniciarCanvas('signatureCanvas_cierre_coord');
        iniciarCanvas('signatureCanvas_cierre_jefe');
        $('fecha').value = new Date().toISOString().split('T')[0];
        updatePendingUI();
        loadHistory();

        var radioSi = $('alturaSi');
        var radioNo = $('alturaNo');
        var divAlturaBaja = $('bloqueAlturaBaja');
        if (radioSi && radioNo) {
            radioSi.addEventListener('change', function () {
                if (this.checked) divAlturaBaja.style.display = 'block';
            });
            radioNo.addEventListener('change', function () {
                if (this.checked) divAlturaBaja.style.display = 'none';
            });
        }
    }

    // ===== NAVIGATION =====
    function showScreen(name) {
        document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
        document.querySelectorAll('.nav-btn').forEach(function (b) {
            b.classList.remove('active');
            var bar = b.querySelector('.nav-bar');
            if (bar) bar.style.display = 'none';
        });

        $('screen-' + name).classList.add('active');
        var navBtn = $('nav-' + name);
        if (navBtn) {
            navBtn.classList.add('active');
            var bar = navBtn.querySelector('.nav-bar');
            if (bar) bar.style.display = 'block';
        }

        window.scrollTo(0, 0);
        if (name === 'historial') renderHistorial();
    }

    // ===== STORAGE =====
    function getRegs() {
        return JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || '[]');
    }

    function loadHistory() {
        var regs = getRegs();
        var el = $('historyCount');
        if (el) {
            el.textContent = regs.length + ' registro' + (regs.length !== 1 ? 's' : '');
        }
    }

    function renderHistorial() {
        var list = $('historial-lista');
        var regs = getRegs();

        if (regs.length === 0) {
            list.innerHTML = [
                '<div class="empty-state">',
                '  <div class="empty-icon">📁</div>',
                '  <p>No se registran permisos guardados</p>',
                '</div>'
            ].join('\n');
            return;
        }

        var html = '';
        regs.forEach(function (r) {
            html += '<div class="record-item" onclick="window._verDetalle(\'' + r.id + '\')">';
            html += '  <div class="record-dot"></div>';
            html += '  <div class="record-info">';
            html += '    <div class="record-name">Sitio: ' + escHtml(r.sitio) + ' | Técnicos: ' + (r.tecnicos ? r.tecnicos.length : 0) + '</div>';
            html += '    <div class="record-date">' + escHtml(r.fecha) + ' ' + escHtml(r.horaInicio) + '</div>';
            html += '  </div>';
            html += '  <span class="record-badge" onclick="window._verDetalle(\'' + r.id + '\'); event.stopPropagation();">👁️ Ver / PDF</span>';
            html += '</div>';
        });
        list.innerHTML = html;
        loadHistory();
    }

    function verDetalle(id) {
        var r = getRegs().find(function (reg) { return reg.id === id; });
        if (!r) return;

        var textosPreguntas = [
            "1. ¿Algún trabajador ha sufrido traumas / golpes en cara o cráneo con pérdida de conocimiento o intenso aturdimiento en las últimas 72 horas?",
            "2. ¿Algún trabajador ha presentado enfermedad del oído que ameritó tratamiento médico durante las últimas 24 horas?",
            "3. ¿Algún trabajador ha ingerido medicamentos, bebidas alcohólicas o sustancias alucinógenas en las últimas 24 horas?",
            "4. ¿Se encuentran los trabajadores en condiciones físicas y anímicas aptas para realizar la labor?",
            "5. Los trabajadores cuentan con el CERTIFICADO DE CAPACITACIÓN y/o competencia laboral para el trabajo seguro en alturas.",
            "6. Los trabajadores cuentan con AFILIACIONES vigentes en seguridad social integral.",
            "7. Los trabajadores conocen los PASOS para realizar la tarea, sus riesgos y medidas preventivas.",
            "8. Existe supervisión directa para la realización de los trabajos. (COORDINADOR DE TRABAJO EN ALTURAS)",
            "9. Se observa que los SISTEMAS DE ACCESO como andamios, escaleras, plataformas elevadoras, estructuras, azoteas, están en buen estado.",
            "10. Se cuenta con PUNTOS DE ANCLAJE (estructura, ganchos, anclajes, vigas, etc).",
            "11. En la estructura donde se ejecuta la instalación se cuenta con los 3 PUNTOS DE APOYO para un posicionamiento seguro.",
            "12. Se verificó que los EPCC se encuentran libres de quemaduras, manchas de químicos, uniones rotas, desgaste abrasivo, costuras de hilo rotas, corrosión de argollas, rasgaduras, absorbedor roto, cortes, guaya deshilachada, gancho sin cierre seguro o alguna otra señal de daño importante que impida su uso.",
            "13. Se cuenta con LÍNEAS DE VIDA o guayas en buen estado y ancladas a sistemas fijos, por encima de la cabeza del trabajador.",
            "14. Se DELIMITÓ Y SEÑALIZÓ la zona de trabajo para establecer un perímetro de seguridad teniendo en cuenta el espacio de posible caída de objetos.",
            "15. Existen BARANDAS DE PROTECCIÓN en zonas donde hay exposición al vacío y están en buen estado.",
            "16. Los EQUIPOS Y HERRAMIETAS fueron revisados y se encuentran en buen estado.",
            "17. Se mantiene DISTANCIA MÍNIMA de separación de 3 m a LÍNEAS ELÉCTRICAS ENERGIZADAS.",
            "18. Los trabajadores conocen el PROTOCOLO a seguir en caso de accidentes o EMERGENCIAS.",
            "19. Se cuenta con ELEMENTOS DE PROTECCIÓN PERSONAL de acuerdo a los riesgos y están en buen estado."
        ];

        var checksHtml = '';
        for (var k = 1; k <= 19; k++) {
            checksHtml += '<div class="info-row"><span>' + textosPreguntas[k - 1] + '</span><strong>Respuesta: ' + (r.comprobacionesPreviasInicioTrabajo && r.comprobacionesPreviasInicioTrabajo['pregunta_' + k] || 'N/A') + '</strong></div>';
        }

        var techsHtml = '';
        if (r.tecnicos) {
            r.tecnicos.forEach(function (t, i) {
                techsHtml += [
                    '<div class="tech-detail-item">',
                    '<p><strong>Técnico #' + (i + 1) + '</strong></p>',
                    '<p>Nombre: ' + escHtml(t.nombre) + '</p>',
                    '<p>Cédula: ' + escHtml(t.cedula) + '</p>',
                    '<p>Teléfono: ' + escHtml(t.telefono) + '</p>',
                    '<p>Firma:<br><img src="' + t.firmaImagen + '" class="firma-img"/></p>',
                    '</div>'
                ].join('\n');
            });
        }

        var html = '';
        html += '<div class="detail-hdr"><h2>PERMISO PARA TRABAJO EN ALTURAS (FR-SST-027)</h2><p>Sitio: ' + escHtml(r.sitio) + ' | Fecha: ' + escHtml(r.fecha) + '</p></div>';

        html += '<div class="card"><div class="card-title"><div class="icon">📝</div>Datos Principales</div>' +
            '<div class="info-row"><span>Sitio:</span><strong>' + escHtml(r.sitio) + '</strong></div>' +
            '<div class="info-row"><span>Descripción:</span><strong>' + escHtml(r.descripcion) + '</strong></div>' +
            '<div class="info-row"><span>Horario:</span><strong>' + escHtml(r.horaInicio) + ' - ' + escHtml(r.horaFin) + '</strong></div>' +
            '<div class="info-row"><span>Altura Máxima:</span><strong>' + escHtml(r.alturaMax) + ' mts</strong></div>' +
            '</div>';

        html += '<div class="card"><div class="card-title"><div class="icon">🦺</div>EPP</div><p style="font-size:13px;">' + escHtml(r.epp || 'Ninguno seleccionado') + '</p></div>';

        html += '<div class="card"><div class="card-title"><div class="icon">👷</div>Personal Autorizado</div>' + techsHtml + '</div>';

        html += '<div class="card"><div class="card-title"><div class="icon">💂</div>Coordinador de Trabajo en Alturas (Emisor)</div>' +
            '<div class="info-row"><span>Nombre:</span><strong>' + escHtml(r.coordinador ? r.coordinador.nombre : '') + '</strong></div>' +
            '<div class="info-row"><span>Cédula:</span><strong>' + escHtml(r.coordinador ? r.coordinador.cedula : '') + '</strong></div>' +
            '<div class="info-row"><span>Teléfono:</span><strong>' + escHtml(r.coordinador ? r.coordinador.telefono : '') + '</strong></div>' +
            '<div class="info-row"><span>Firma:</span><br><img src="' + (r.coordinador ? r.coordinador.firmaImagen : '') + '" class="firma-img"/></div>' +
            '</div>';

        html += '<div class="card"><div class="card-title"><div class="icon">📋</div>Comprobaciones Previas</div>' + checksHtml + '</div>';

        if (r.verificacionAlturaBaja) {
            html += '<div class="card"><div class="card-title"><div class="icon">⚠️</div>Análisis Distancia Caída ≤6.2m</div>' +
                '<div class="info-row"><span>Q1 (¿Se verificó la distancia de desaceleración?):</span><strong>' + escHtml(r.verificacionAlturaBaja.q1) + '</strong></div>' +
                '<div class="info-row"><span>Q2 (¿Longitud total menor a distancia disponible?):</span><strong>' + escHtml(r.verificacionAlturaBaja.q2) + '</strong></div>' +
                '<div class="info-row"><span>Q3 (¿Espacio libre de caída verificado?):</span><strong>' + escHtml(r.verificacionAlturaBaja.q3) + '</strong></div>' +
                '<div class="info-row"><span>Observaciones:</span><strong>' + escHtml(r.verificacionAlturaBaja.observaciones) + '</strong></div>' +
                '</div>';
        }

        html += '<div class="card"><div class="card-title"><div class="icon">🔒</div>Cierre del Permiso</div>' +
            '<div class="info-row"><span>La tarea se ejecutó conforme a las especificaciones:</span><strong>' + (r.cierreDocumento ? r.cierreDocumento.q1 : '') + '</strong></div>' +
            '<div class="info-row"><span>Se aplicaron las medidas de control:</span><strong>' + (r.cierreDocumento ? r.cierreDocumento.q2 : '') + '</strong></div>' +
            '<div class="info-row"><span>Se evitan impactos ambientales (orden y aseo):</span><strong>' + (r.cierreDocumento ? r.cierreDocumento.q3 : '') + '</strong></div>' +
            '<div class="info-row"><span>Ausencia de accidentes o emergencias:</span><strong>' + (r.cierreDocumento ? r.cierreDocumento.q4 : '') + '</strong></div>' +
            '<p style="font-size:12px; margin-top:6px;"><strong>Coord. Cierre:</strong> ' + escHtml(r.cierreDocumento ? r.cierreDocumento.coordinadorCierreNombre : '') + '</p>' +
            '<img src="' + (r.cierreDocumento ? r.cierreDocumento.coordinadorCierreFirma : '') + '" class="firma-img" style="display:block;">' +
            '<p style="font-size:12px; margin-top:6px;"><strong>Jefe Cuadrilla:</strong> ' + escHtml(r.cierreDocumento ? r.cierreDocumento.jefeCuadrillaNombre : '') + '</p>' +
            '<img src="' + (r.cierreDocumento ? r.cierreDocumento.jefeCuadrillaFirma : '') + '" class="firma-img" style="display:block;">' +
            '</div>';

        $('detalleContenido').innerHTML = html;

        var pantallaDetalle = $('screen-detalle');
        var viejoBtn = pantallaDetalle.querySelector('.btn-pdf-dinamico');
        if (viejoBtn) viejoBtn.remove();

        var btnPdf = document.createElement('button');
        btnPdf.className = 'btn btn-success btn-pdf-dinamico';
        btnPdf.innerHTML = '📥 Guardar / Descargar en PDF';
        btnPdf.onclick = function () {
            var tituloOriginal = document.title;
            var sitioSanitizado = (r.sitio || 'Obra').trim().replace(/[/\\?%*:|"<> ]/g, '_');
            document.title = 'Permiso_Alturas_' + sitioSanitizado + '_' + r.fecha;
            window.print();
            setTimeout(function () { document.title = tituloOriginal; }, 1000);
        };

        $('btn-eliminar-reg').onclick = function () { eliminarReg(r.id); };
        pantallaDetalle.insertBefore(btnPdf, $('btn-eliminar-reg'));
        showScreen('detalle');
    }

    function eliminarReg(id) {
        if (!confirm('¿Seguro que desea eliminar este registro?')) return;
        var regs = getRegs().filter(function (r) { return r.id !== id; });
        localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(regs));
        showScreen('historial');
        showToast('🗑️ Registro eliminado', 'info');
    }

    function limpiarHistorial() {
        if (!confirm('🚨 ¿Está seguro de vaciar el historial local permanentemente?')) return;
        localStorage.removeItem(CONFIG.HISTORY_KEY);
        renderHistorial();
        loadHistory();
        showToast('🗑️ Historial vaciado', 'info');
    }

    function descargarHistorial() {
        var regs = getRegs();
        if (regs.length === 0) {
            showToast('No hay historial para descargar', 'info');
            return;
        }
        var lines = ['=== HISTORIAL DE PERMISOS DE ALTURAS ===', 'Total: ' + regs.length, ''];
        regs.forEach(function (r, i) {
            lines.push((i + 1) + '. Sitio: ' + (r.sitio || '—') + ' | Fecha: ' + (r.fecha || '—') + ' | Horario: ' + (r.horaInicio || '—') + ' - ' + (r.horaFin || '—'));
            lines.push('   Descripción: ' + (r.descripcion || '—'));
            lines.push('   Técnicos: ' + (r.tecnicos ? r.tecnicos.length : 0));
            lines.push('');
        });
        var blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'historial_alturas_' + new Date().toISOString().slice(0, 10) + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Historial descargado ✓', 'success');
    }

    // ===== TECNICOS =====
    function agregarTecnico() {
        techCounter++;
        var container = $('techContainer');
        var card = document.createElement('div');
        card.className = 'tech-card';
        card.id = 'techCard_' + techCounter;

        var html = '';
        if (techCounter > 1) {
            html += '<button type="button" class="btn-remove" onclick="window._removerTecnico(' + techCounter + ')">&times;</button>';
        }
        html += '<h4>Técnico #' + techCounter + '</h4>';
        html += '<label class="field-label">Nombres y Apellidos:</label>';
        html += '<input type="text" class="tech-nombre" placeholder="Nombre completo" required>';
        html += '<label class="field-label">Cédula (C.C.):</label>';
        html += '<input type="text" class="tech-cedula" placeholder="Número de documento" required>';
        html += '<label class="field-label">Número de Teléfono:</label>';
        html += '<input type="text" class="tech-telefono" placeholder="Móvil de contacto" required>';
        html += '<label class="field-label">Firma (Firme en el recuadro):</label>';
        html += '<canvas id="signatureCanvas_' + techCounter + '"></canvas>';
        html += '<button type="button" class="btn btn-outline btn-small" onclick="window._limpiarFirma(\'signatureCanvas_' + techCounter + '\')">Limpiar Firma</button>';

        card.innerHTML = html;
        container.appendChild(card);
        iniciarCanvas('signatureCanvas_' + techCounter);
    }

    function removerTecnico(id) {
        var card = $('techCard_' + id);
        if (card) card.remove();
    }

    // ===== SIGNATURE =====
    function iniciarCanvas(canvasId) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var dibujando = false;

        canvas.width = canvas.parentElement.clientWidth - 32;
        canvas.height = 100;

        ctx.strokeStyle = '#0d2b4e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        function obtenerPosicion(e) {
            var r = canvas.getBoundingClientRect();
            var cx = e.touches ? e.touches[0].clientX : e.clientX;
            var cy = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: cx - r.left, y: cy - r.top };
        }

        function empezarDibujo(e) {
            e.preventDefault();
            dibujando = true;
            ctx.beginPath();
            var p = obtenerPosicion(e);
            ctx.moveTo(p.x, p.y);
        }

        function dibujar(e) {
            if (!dibujando) return;
            e.preventDefault();
            var p = obtenerPosicion(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }

        function detenerDibujo(e) {
            if (!dibujando) return;
            dibujando = false;
            ctx.closePath();
        }

        canvas.addEventListener('mousedown', empezarDibujo);
        canvas.addEventListener('mousemove', dibujar);
        canvas.addEventListener('mouseup', detenerDibujo);
        canvas.addEventListener('mouseleave', detenerDibujo);

        canvas.addEventListener('touchstart', empezarDibujo, { passive: false });
        canvas.addEventListener('touchmove', dibujar, { passive: false });
        canvas.addEventListener('touchend', detenerDibujo);
    }

    function limpiarFirma(canvasId) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // ===== TOAST =====
    function showToast(msg, type) {
        var t = $('toast');
        if (!t) return;
        if (toastTimer) clearTimeout(toastTimer);
        t.textContent = msg;
        t.className = 'toast ' + (type || 'info');
        t.classList.remove('hidden');
        toastTimer = setTimeout(function () {
            t.classList.add('hidden');
        }, 2500);
    }

    // ===== TELEGRAM ───
    function buildReportHTML(r) {
        var textosPreguntas = [
            "1. ¿Algún trabajador ha sufrido traumas / golpes en cara o cráneo con pérdida de conocimiento o intenso aturdimiento en las últimas 72 horas?",
            "2. ¿Algún trabajador ha presentado enfermedad del oído que ameritó tratamiento médico durante las últimas 24 horas?",
            "3. ¿Algún trabajador ha ingerido medicamentos, bebidas alcohólicas o sustancias alucinógenas en las últimas 24 horas?",
            "4. ¿Se encuentran los trabajadores en condiciones físicas y anímicas aptas para realizar la labor?",
            "5. Los trabajadores cuentan con el CERTIFICADO DE CAPACITACIÓN y/o competencia laboral para el trabajo seguro en alturas.",
            "6. Los trabajadores cuentan con AFILIACIONES vigentes en seguridad social integral.",
            "7. Los trabajadores conocen los PASOS para realizar la tarea, sus riesgos y medidas preventivas.",
            "8. Existe supervisión directa para la realización de los trabajos. (COORDINADOR DE TRABAJO EN ALTURAS)",
            "9. Se observa que los SISTEMAS DE ACCESO como andamios, escaleras, plataformas elevadoras, estructuras, azoteas, están en buen estado.",
            "10. Se cuenta con PUNTOS DE ANCLAJE (estructura, ganchos, anclajes, vigas, etc).",
            "11. En la estructura donde se ejecuta la instalación se cuenta con los 3 PUNTOS DE APOYO para un posicionamiento seguro.",
            "12. Se verificó que los EPCC se encuentran libres de quemaduras, manchas de químicos, uniones rotas, desgaste abrasivo, costuras de hilo rotas, corrosión de argollas, rasgaduras, absorbedor roto, cortes, guaya deshilachada, gancho sin cierre seguro o alguna otra señal de daño importante que impida su uso.",
            "13. Se cuenta con LÍNEAS DE VIDA o guayas en buen estado y ancladas a sistemas fijos, por encima de la cabeza del trabajador.",
            "14. Se DELIMITÓ Y SEÑALIZÓ la zona de trabajo para establecer un perímetro de seguridad teniendo en cuenta el espacio de posible caída de objetos.",
            "15. Existen BARANDAS DE PROTECCIÓN en zonas donde hay exposición al vacío y están en buen estado.",
            "16. Los EQUIPOS Y HERRAMIETAS fueron revisados y se encuentran en buen estado.",
            "17. Se mantiene DISTANCIA MÍNIMA de separación de 3 m a LÍNEAS ELÉCTRICAS ENERGIZADAS.",
            "18. Los trabajadores conocen el PROTOCOLO a seguir en caso de accidentes o EMERGENCIAS.",
            "19. Se cuenta con ELEMENTOS DE PROTECCIÓN PERSONAL de acuerdo a los riesgos y están en buen estado."
        ];

        var checksHtml = '';
        for (var k = 1; k <= 19; k++) {
            checksHtml += '<div class="info-row"><span>' + textosPreguntas[k - 1] + '</span><strong>Respuesta: ' + (r.comprobacionesPreviasInicioTrabajo && r.comprobacionesPreviasInicioTrabajo['pregunta_' + k] || 'N/A') + '</strong></div>';
        }

        var techsHtml = '';
        if (r.tecnicos) {
            r.tecnicos.forEach(function (t, i) {
                techsHtml += [
                    '<div style="background:var(--gray2);padding:10px;border-radius:6px;margin-bottom:6px;font-size:12px;">',
                    '<p><strong>Técnico #' + (i + 1) + '</strong></p>',
                    '<p>Nombre: ' + escHtml(t.nombre) + '</p>',
                    '<p>Cédula: ' + escHtml(t.cedula) + '</p>',
                    '<p>Teléfono: ' + escHtml(t.telefono) + '</p>',
                    '<p>Firma:<br><img src="' + t.firmaImagen + '" style="max-height:50px;"></p></div>'
                ].join('\n');
            });
        }

        var h = '';
        h += '<div style="padding:20px;max-width:800px;margin:0 auto;font-family:sans-serif;">';
        h += '<div class="detail-hdr"><h2>PERMISO PARA TRABAJO EN ALTURAS (FR-SST-027)</h2><p>Sitio: ' + escHtml(r.sitio) + ' | Fecha: ' + escHtml(r.fecha) + '</p></div>';
        h += '<div class="card"><div class="card-title"><div class="icon">📝</div>Datos Principales</div>' +
            '<div class="info-row"><span>Sitio:</span><strong>' + escHtml(r.sitio) + '</strong></div>' +
            '<div class="info-row"><span>Descripción:</span><strong>' + escHtml(r.descripcion) + '</strong></div>' +
            '<div class="info-row"><span>Horario:</span><strong>' + escHtml(r.horaInicio) + ' - ' + escHtml(r.horaFin) + '</strong></div>' +
            '<div class="info-row"><span>Altura Máxima:</span><strong>' + escHtml(r.alturaMax) + ' mts</strong></div></div>';
        h += '<div class="card"><div class="card-title"><div class="icon">🦺</div>EPP</div><p style="font-size:13px;">' + escHtml(r.epp || 'Ninguno seleccionado') + '</p></div>';
        h += '<div class="card"><div class="card-title"><div class="icon">👷</div>Personal Autorizado</div>' + techsHtml + '</div>';
        h += '<div class="card"><div class="card-title"><div class="icon">💂</div>Coordinador de Trabajo en Alturas (Emisor)</div>' +
            '<div class="info-row"><span>Nombre:</span><strong>' + escHtml(r.coordinador ? r.coordinador.nombre : '') + '</strong></div>' +
            '<div class="info-row"><span>Cédula:</span><strong>' + escHtml(r.coordinador ? r.coordinador.cedula : '') + '</strong></div>' +
            '<div class="info-row"><span>Teléfono:</span><strong>' + escHtml(r.coordinador ? r.coordinador.telefono : '') + '</strong></div>' +
            '<div class="info-row"><span>Firma:</span><br><img src="' + (r.coordinador ? r.coordinador.firmaImagen : '') + '" style="max-height:50px;"></div></div>';
        h += '<div class="card"><div class="card-title"><div class="icon">📋</div>Comprobaciones Previas</div>' + checksHtml + '</div>';
        if (r.verificacionAlturaBaja) {
            h += '<div class="card"><div class="card-title"><div class="icon">⚠️</div>Análisis Distancia Caída ≤6.2m</div>' +
                '<div class="info-row"><span>Q1 (¿Se verificó la distancia de desaceleración?):</span><strong>' + escHtml(r.verificacionAlturaBaja.q1) + '</strong></div>' +
                '<div class="info-row"><span>Q2 (¿Longitud total menor a distancia disponible?):</span><strong>' + escHtml(r.verificacionAlturaBaja.q2) + '</strong></div>' +
                '<div class="info-row"><span>Q3 (¿Espacio libre de caída verificado?):</span><strong>' + escHtml(r.verificacionAlturaBaja.q3) + '</strong></div>' +
                '<div class="info-row"><span>Observaciones:</span><strong>' + escHtml(r.verificacionAlturaBaja.observaciones) + '</strong></div></div>';
        }
        h += '<div class="card"><div class="card-title"><div class="icon">🔒</div>Cierre del Permiso</div>' +
            '<div class="info-row"><span>La tarea se ejecutó conforme a las especificaciones:</span><strong>' + (r.cierreDocumento ? r.cierreDocumento.q1 : '') + '</strong></div>' +
            '<div class="info-row"><span>Se aplicaron las medidas de control:</span><strong>' + (r.cierreDocumento ? r.cierreDocumento.q2 : '') + '</strong></div>' +
            '<div class="info-row"><span>Se evitan impactos ambientales (orden y aseo):</span><strong>' + (r.cierreDocumento ? r.cierreDocumento.q3 : '') + '</strong></div>' +
            '<div class="info-row"><span>Ausencia de accidentes o emergencias:</span><strong>' + (r.cierreDocumento ? r.cierreDocumento.q4 : '') + '</strong></div>' +
            '<p style="font-size:12px;margin-top:6px;"><strong>Coord. Cierre:</strong> ' + escHtml(r.cierreDocumento ? r.cierreDocumento.coordinadorCierreNombre : '') + '</p>' +
            '<img src="' + (r.cierreDocumento ? r.cierreDocumento.coordinadorCierreFirma : '') + '" style="max-height:40px;display:block;">' +
            '<p style="font-size:12px;margin-top:6px;"><strong>Jefe Cuadrilla:</strong> ' + escHtml(r.cierreDocumento ? r.cierreDocumento.jefeCuadrillaNombre : '') + '</p>' +
            '<img src="' + (r.cierreDocumento ? r.cierreDocumento.jefeCuadrillaFirma : '') + '" style="max-height:40px;display:block;"></div>';
        h += '</div>';
        return h;
    }

    function generatePDFAndSend(data) {
        if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            showToast('Librerías PDF no disponibles. Pendiente guardado.', 'warning');
            savePendingTelegram(data);
            return;
        }
        showToast('Generando PDF para Telegram...', 'info');
        var div = document.createElement('div');
        div.innerHTML = buildReportHTML(data);
        div.style.cssText = 'position:fixed;top:0;left:-9999px;width:800px;background:white;z-index:-1;';
        document.body.appendChild(div);
        html2canvas(div, { scale: 2, useCORS: true, logging: false, allowTaint: true })
            .then(function (canvas) {
                var imgData = canvas.toDataURL('image/png');
                var { jsPDF } = window.jspdf;
                var pdf = new jsPDF('p', 'pt', 'a4');
                var pw = pdf.internal.pageSize.getWidth();
                var ph = pdf.internal.pageSize.getHeight();
                var iw = pw;
                var ih = (canvas.height * iw) / canvas.width;
                var hl = ih;
                var pos = 0;
                pdf.addImage(imgData, 'PNG', 0, pos, iw, ih);
                hl -= ph;
                while (hl > 0) {
                    pos -= ph;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, pos, iw, ih);
                    hl -= ph;
                }
                var blob = pdf.output('blob');
                var sit = (data.sitio || 'Obra').trim().replace(/[/\\?%*:|"<> ]/g, '_');
                var fn = 'Permiso_Alturas_' + sit + '_' + data.fecha + '.pdf';
                sendPDFToTelegram(blob, fn, data);
            })
            .catch(function (err) {
                console.error('html2canvas error:', err);
                showToast('Error al generar PDF. Pendiente guardado.', 'error');
                savePendingTelegram(data);
            })
            .finally(function () { if (div.parentNode) div.parentNode.removeChild(div); });
    }

    function sendPDFToTelegram(blob, filename, data) {
        var fd = new FormData();
        fd.append('chat_id', CONFIG.TELEGRAM_CHAT_ID);
        fd.append('document', blob, filename);
        fetch('https://api.telegram.org/bot' + CONFIG.TELEGRAM_TOKEN + '/sendDocument', { method: 'POST', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (resp) {
                if (resp.ok) showToast('✅ PDF enviado a Telegram', 'success');
                else {
                    console.error('Telegram error:', JSON.stringify(resp));
                    showToast('Error Telegram. Pendiente guardado.', 'warning');
                    savePendingTelegram(data);
                }
            })
            .catch(function (err) {
                console.error('Telegram fetch error:', err);
                showToast('Sin conexión. Pendiente guardado.', 'warning');
                savePendingTelegram(data);
            });
    }

    // ===== PENDING QUEUE =====
    function savePendingTelegram(data) {
        var p = JSON.parse(localStorage.getItem(CONFIG.PENDING_KEY) || '[]');
        p.push({ data: data, timestamp: new Date().toISOString() });
        localStorage.setItem(CONFIG.PENDING_KEY, JSON.stringify(p));
        updatePendingUI();
    }

    function updatePendingUI() {
        var p = JSON.parse(localStorage.getItem(CONFIG.PENDING_KEY) || '[]');
        var bar = $('pendingBar');
        var cnt = $('pendingCount');
        if (p.length === 0) {
            if (bar) bar.classList.add('hidden');
            return;
        }
        if (bar) {
            bar.classList.remove('hidden');
            cnt.textContent = p.length + ' envío' + (p.length > 1 ? 's' : '') + ' pendiente' + (p.length > 1 ? 's' : '');
        }
    }

    function retryPendingTelegram() {
        var p = JSON.parse(localStorage.getItem(CONFIG.PENDING_KEY) || '[]');
        if (p.length === 0) { showToast('No hay envíos pendientes', 'info'); return; }
        var item = p[0];
        var rest = p.slice(1);
        localStorage.setItem(CONFIG.PENDING_KEY, JSON.stringify(rest));
        updatePendingUI();
        showToast('Reintentando envío...', 'info');
        generatePDFAndSend(item.data);
    }

    function viewPending() {
        var list = $('pendingList');
        var pending = JSON.parse(localStorage.getItem(CONFIG.PENDING_KEY) || '[]');
        if (list.classList.contains('hidden')) {
            var h = '';
            pending.forEach(function (item, i) {
                var d = item.data || {};
                h += '<div class="pending-item">';
                h += '<span>' + (i + 1) + '. ' + escHtml(d.sitio || '—') + ' | ' + (d.fecha || '—') + '</span>';
                h += '<button class="btn-delete-pending" onclick="window._deletePending(' + i + ')" title="Eliminar">✕</button>';
                h += '</div>';
            });
            list.innerHTML = h;
            list.classList.remove('hidden');
        } else {
            list.classList.add('hidden');
        }
    }

    function deletePending(index) {
        var pending = JSON.parse(localStorage.getItem(CONFIG.PENDING_KEY) || '[]');
        if (index < 0 || index >= pending.length) return;
        pending.splice(index, 1);
        if (pending.length === 0) {
            localStorage.removeItem(CONFIG.PENDING_KEY);
        } else {
            localStorage.setItem(CONFIG.PENDING_KEY, JSON.stringify(pending));
        }
        updatePendingUI();
        var list = $('pendingList');
        if (!list.classList.contains('hidden')) {
            viewPending();
        }
    }

    // ===== EVENTS =====
    function bindEvents() {
        $('formAlturas').addEventListener('submit', function (e) {
            e.preventDefault();

            var eppSeleccionados = [];
            document.querySelectorAll('.checkbox-group input:checked').forEach(function (cb) {
                eppSeleccionados.push(cb.value);
            });

            var tecnicosArray = [];
            document.querySelectorAll('.tech-card').forEach(function (card) {
                if (card.id && card.id.startsWith('techCard_')) {
                    var nombre = card.querySelector('.tech-nombre').value;
                    var cedula = card.querySelector('.tech-cedula').value;
                    var telefono = card.querySelector('.tech-telefono').value;
                    var canvas = card.querySelector('canvas');
                    var firmaBase64 = canvas.toDataURL('image/png');
                    tecnicosArray.push({
                        nombre: nombre,
                        cedula: cedula,
                        telefono: telefono,
                        firmaImagen: firmaBase64
                    });
                }
            });

            var coordCanvas = $('signatureCanvas_coord');
            var datosCoordinador = {
                nombre: $('coord-nombre').value,
                cedula: $('coord-cedula').value,
                telefono: $('coord-telefono').value,
                firmaImagen: coordCanvas.toDataURL('image/png')
            };

            var comprobacionesInicio = {};
            for (var i = 1; i <= 19; i++) {
                var rad = document.querySelector('input[name="u_q' + i + '"]:checked');
                comprobacionesInicio['pregunta_' + i] = rad ? rad.value : 'N/A';
            }

            var datosAlturaBaja = null;
            if ($('alturaSi').checked) {
                var bq1 = document.querySelector('input[name="b_q1"]:checked');
                var bq2 = document.querySelector('input[name="b_q2"]:checked');
                var bq3 = document.querySelector('input[name="b_q3"]:checked');
                datosAlturaBaja = {
                    q1: bq1 ? bq1.value : 'N/A',
                    q2: bq2 ? bq2.value : 'N/A',
                    q3: bq3 ? bq3.value : 'N/A',
                    observaciones: $('obs-alturabaja').value
                };
            }

            var cierreCoordCanvas = $('signatureCanvas_cierre_coord');
            var cierreJefeCanvas = $('signatureCanvas_cierre_jefe');
            var cq1 = document.querySelector('input[name="c_q1"]:checked');
            var cq2 = document.querySelector('input[name="c_q2"]:checked');
            var cq3 = document.querySelector('input[name="c_q3"]:checked');
            var cq4 = document.querySelector('input[name="c_q4"]:checked');

            var datosCierre = {
                q1: cq1 ? cq1.value : 'N/A',
                q2: cq2 ? cq2.value : 'N/A',
                q3: cq3 ? cq3.value : 'N/A',
                q4: cq4 ? cq4.value : 'N/A',
                coordinadorCierreNombre: $('cierre-coord-nombre').value,
                coordinadorCierreFirma: cierreCoordCanvas.toDataURL('image/png'),
                jefeCuadrillaNombre: $('cierre-jefe-nombre').value,
                jefeCuadrillaFirma: cierreJefeCanvas.toDataURL('image/png')
            };

            var datosPermiso = {
                id: Date.now().toString(),
                fecha: $('fecha').value,
                sitio: $('sitio').value,
                descripcion: $('descripcion').value,
                horaInicio: $('horaInicio').value,
                horaFin: $('horaFin').value,
                alturaMax: $('alturaMax').value,
                ats: document.querySelector('input[name="ats"]:checked').value,
                epp: eppSeleccionados.join(', '),
                tecnicos: tecnicosArray,
                coordinador: datosCoordinador,
                comprobacionesPreviasInicioTrabajo: comprobacionesInicio,
                verificacionAlturaBaja: datosAlturaBaja,
                cierreDocumento: datosCierre
            };

            // Guardado local
            var historialLocal = getRegs();
            historialLocal.unshift(datosPermiso);
            localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(historialLocal));

            generatePDFAndSend(datosPermiso);

            showToast('✅ Permiso guardado y enviado a Telegram.', 'success');
            this.reset();
            $('techContainer').innerHTML = '';
            techCounter = 0;
            agregarTecnico();
            showScreen('historial');
        });

        $('btnClearHistory').addEventListener('click', limpiarHistorial);
        $('btnDownloadHistory').addEventListener('click', descargarHistorial);
        $('btnRetryPending').addEventListener('click', retryPendingTelegram);
        $('btnViewPending').addEventListener('click', viewPending);

        window.addEventListener('online', function () {
            var p = JSON.parse(localStorage.getItem(CONFIG.PENDING_KEY) || '[]');
            if (p.length > 0) {
                showToast('Conexión restablecida. Reintentando pendientes...', 'info');
                retryPendingTelegram();
            }
        });
    }

    // ===== EXPOSE GLOBALS =====
    window.agregarTecnico = agregarTecnico;
    window._removerTecnico = removerTecnico;
    window._limpiarFirma = limpiarFirma;
    window.showScreen = showScreen;
    window._verDetalle = verDetalle;
    window.eliminarReg = eliminarReg;
    window.limpiarHistorial = limpiarHistorial;
    window._deletePending = deletePending;

})();
