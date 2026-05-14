/**
 * CV Studio — generador de CV para web (proyecto estático).
 * Plantillas: Editorial, Corporativo, Minimal (HTML + CSS inline para PDF).
 * Donación opcional vía Mercado Pago (enlace externo; sin desbloqueo en cliente).
 *
 * @author [Tu nombre]
 * @see ENTREGA.md — documentación para entrega académica
 */

"use strict";

const MERCADOPAGO_URL = "https://mpago.la/2681dcq";
const OPENAI_MODEL = "gpt-3.5-turbo";
const STORAGE_CV = "cvData";

/** Ancho lógico del CV en px (≈ A4 a ~96dpi, aspecto sobrio en pantalla y PDF). */
const CV_PAGE_WIDTH_PX = 680;

const PDF_MARGIN_MM = 12;
const PDF_SCALE = 2;

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_THEME = "cvStudioTheme";
const PREVIEW_PLACEHOLDER =
    "Completa los datos y pulsa «Actualizar vista».";

/** URLs blob usadas dentro de #preview; se revocan al regenerar para liberar memoria. */
let previewBlobUrls = [];

let plantillaCustomURL = "";

const inputPlantillaCustom = document.getElementById("plantillaCustom");
if (inputPlantillaCustom) {
    inputPlantillaCustom.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (plantillaCustomURL) {
            try {
                URL.revokeObjectURL(plantillaCustomURL);
            } catch (_) {}
            plantillaCustomURL = "";
        }
        if (file) {
            plantillaCustomURL = URL.createObjectURL(file);
        }
        generarCV(true);
    });
}

const inputFoto = document.getElementById("foto");
if (inputFoto) {
    inputFoto.addEventListener("change", function () {
        generarCV(true);
    });
}

function abrirDonacionMercadoPago() {
    window.open(MERCADOPAGO_URL, "_blank", "noopener,noreferrer");
}

function mostrarMensajeExito(texto) {
    const msg = document.getElementById("msgExito");
    if (!msg) return;
    msg.textContent = texto;
    msg.hidden = false;
    clearTimeout(mostrarMensajeExito._t);
    mostrarMensajeExito._t = setTimeout(() => {
        msg.hidden = true;
    }, 4000);
}

function mostrarMensajeError(texto, ms) {
    const dur = ms == null ? 6000 : ms;
    const msg = document.getElementById("msgError");
    if (!msg) {
        alert(texto);
        return;
    }
    msg.textContent = texto;
    msg.hidden = false;
    clearTimeout(mostrarMensajeError._t);
    mostrarMensajeError._t = setTimeout(() => {
        msg.hidden = true;
    }, dur);
}

function actualizarUI() {
    const hintIA = document.getElementById("hintIA");
    if (hintIA) {
        hintIA.textContent =
            "Puedes usar la IA con o sin API Key (sin clave se usa texto simulado).";
    }

    const btnIA = document.getElementById("btnGenerarIA");
    if (btnIA) {
        btnIA.classList.remove("btn-disabled");
        btnIA.removeAttribute("aria-disabled");
    }
}

function el(id) {
    return document.getElementById(id);
}

function revocarBlobsVistaPrevia() {
    previewBlobUrls.forEach(function (u) {
        try {
            URL.revokeObjectURL(u);
        } catch (_) {}
    });
    previewBlobUrls = [];
}

function registrarBlobVistaPrevia(url) {
    if (url && String(url).indexOf("blob:") === 0) {
        previewBlobUrls.push(url);
    }
}

function anunciarVistaPrevia(texto) {
    const node = el("announcerPreview");
    if (!node) {
        return;
    }
    node.textContent = "";
    window.requestAnimationFrame(function () {
        node.textContent = texto;
    });
}

function sincronizarAriaPlantillas(tipoActivo) {
    document.querySelectorAll(".plantilla").forEach(function (btn) {
        const t = btn.getAttribute("data-tipo");
        const on = t === tipoActivo;
        btn.classList.toggle("activa", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
}

function escapeHtml(s) {
    if (s == null || s === "") return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

function obtenerPerfilTexto() {
    const perfil = el("perfil");
    const t = perfil ? perfil.value.trim() : "";
    if (t) return t;
    return "Profesional con orientación a resultados, trabajo en equipo y comunicación clara.";
}

function seleccionarPlantilla(tipo, elemento) {
    const hidden = el("plantilla");
    if (hidden) hidden.value = tipo;
    sincronizarAriaPlantillas(tipo);
}

function validarFormulario(opts) {
    const o = opts || {};
    if (!o.omitirExperiencia) {
        const nombreEl = el("nombre");
        const correoEl = el("correo");
        const expEl = el("experiencia");
        if (nombreEl && typeof nombreEl.reportValidity === "function") {
            if (!nombreEl.reportValidity()) {
                return false;
            }
            const tituloEl = el("tituloProfesional");
            if (tituloEl && !tituloEl.reportValidity()) {
                return false;
            }
            if (correoEl && !correoEl.reportValidity()) {
                return false;
            }
            if (expEl && !expEl.reportValidity()) {
                return false;
            }
        }
    }
    const nombre = (el("nombre") && el("nombre").value.trim()) || "";
    const correo = (el("correo") && el("correo").value.trim()) || "";
    const tituloPuesto = (el("tituloProfesional") && el("tituloProfesional").value.trim()) || "";
    const experiencia = (el("experiencia") && el("experiencia").value.trim()) || "";

    if (!tituloPuesto) {
        alert("Completa el puesto o titulación profesional.");
        return false;
    }
    if (!nombre) {
        alert("Completa el nombre completo.");
        return false;
    }
    if (!correo) {
        alert("Completa el correo electrónico.");
        return false;
    }
    if (!REGEX_CORREO.test(correo)) {
        alert("El correo no tiene un formato válido.");
        return false;
    }
    if (!o.omitirExperiencia && !experiencia) {
        alert("Completa la experiencia laboral (obligatorio para generar el CV o el PDF).");
        return false;
    }
    return true;
}

function habilidadesALista(texto) {
    return texto
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

const W = CV_PAGE_WIDTH_PX;

function bloquesFotoEditorial(fotoURL) {
    if (fotoURL) {
        return `<img src="${fotoURL}" alt="" style="width:100%;max-width:160px;height:auto;aspect-ratio:3/4;object-fit:cover;border:3px solid #0f172a;filter:grayscale(100%);display:block;">`;
    }
    return `<div style="width:100%;max-width:160px;aspect-ratio:3/4;background:#e2e8f0;border:3px solid #0f172a;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b;text-align:center;padding:10px;">Sin foto</div>`;
}

function bloquesFotoCorporate(fotoURL) {
    if (fotoURL) {
        return `<img src="${fotoURL}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid #f8c8d0;display:block;margin:0 auto 16px;">`;
    }
    return `<div style="width:96px;height:96px;border-radius:50%;margin:0 auto 16px;background:#5c5c5c;border:2px dashed #f8c8d0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#f8c8d0;text-align:center;">Sin foto</div>`;
}

function bloquesFotoMinimal(fotoURL) {
    if (fotoURL) {
        return `<img src="${fotoURL}" alt="" style="width:64px;height:64px;object-fit:cover;border:1px solid #000;display:block;">`;
    }
    return "";
}

function iconoContactoCirculo(innerFa) {
    return `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#0f172a;color:#fff;margin-right:8px;font-size:11px;">${innerFa}</span>`;
}

/** Plantilla Editorial — dos columnas, acento azul, serif + sans. */
function construirPlantillaEditorial(ctx) {
    const contactoFila = (icon, texto) =>
        `<div style="display:flex;align-items:center;margin:0 0 8px;font-size:12px;color:#334155;font-family:Montserrat,Arial,sans-serif;">${icon}<span>${texto}</span></div>`;
    const skillsHtml =
        ctx.skillsItems.length > 0
            ? ctx.skillsItems
                  .map(
                      (s) =>
                          `<div style="font-size:11px;margin:0 0 5px;padding-left:10px;border-left:2px solid #1e40af;font-family:Montserrat,sans-serif;color:#475569;">${s}</div>`
                  )
                  .join("")
            : '<div style="font-size:11px;color:#94a3b8;">—</div>';
    const idiomasCols = ctx.idiomasHtml
        ? `<div style="flex:1;min-width:110px;"><h4 style="margin:0 0 6px;font-family:Playfair Display,serif;font-size:12px;">Idiomas</h4><div style="font-size:11px;line-height:1.45;font-family:Montserrat,sans-serif;color:#475569;">${ctx.idiomasHtml}</div></div>`
        : "";
    const habCol = `<div style="flex:1;min-width:110px;"><h4 style="margin:0 0 6px;font-family:Playfair Display,serif;font-size:12px;">Habilidades</h4>${skillsHtml}</div>`;

    return `<div style="max-width:${W}px;margin:0 auto;background:#fff;color:#0f172a;font-family:Montserrat,Open Sans,sans-serif;overflow:hidden;">
<div style="height:4px;background:#1e40af;width:100%;"></div>
<div style="display:flex;flex-wrap:wrap;">
<aside style="width:32%;min-width:200px;box-sizing:border-box;padding:18px 14px;border-left:6px solid #0f172a;border-bottom:6px solid #0f172a;background:#fafafa;">
${ctx.fotoEditorial}
<h3 style="font-family:Playfair Display,Georgia,serif;font-size:13px;margin:14px 0 8px;">Sobre mí</h3>
<div style="font-size:11px;line-height:1.55;color:#475569;">${ctx.perfilHtml}</div>
<h3 style="font-family:Playfair Display,Georgia,serif;font-size:13px;margin:16px 0 8px;">Contacto</h3>
${contactoFila(iconoContactoCirculo('<i class="fa-solid fa-phone"></i>'), ctx.telefono)}
${contactoFila(iconoContactoCirculo('<i class="fa-solid fa-envelope"></i>'), ctx.correo)}
${contactoFila(iconoContactoCirculo('<i class="fa-solid fa-location-dot"></i>'), ctx.ubicacion)}
<h3 style="font-family:Playfair Display,Georgia,serif;font-size:13px;margin:16px 0 8px;">Más información</h3>
<div style="font-size:10px;line-height:1.5;color:#64748b;word-break:break-word;">${ctx.masInfoHtml}</div>
</aside>
<main style="flex:1;min-width:240px;box-sizing:border-box;padding:20px 20px 24px;">
<h1 style="margin:0 0 4px;font-family:Playfair Display,Georgia,serif;font-size:26px;font-weight:700;letter-spacing:-0.02em;">${ctx.nombre}</h1>
<p style="margin:0 0 12px;font-family:Montserrat,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1e40af;">${ctx.titulo}</p>
<h2 style="font-family:Playfair Display,serif;font-size:14px;margin:0 0 8px;border-bottom:1px solid #0f172a;padding-bottom:4px;">Experiencia laboral</h2>
<div style="font-size:12px;line-height:1.55;color:#334155;word-wrap:break-word;overflow-wrap:anywhere;">${ctx.expHtml}</div>
<h2 style="font-family:Playfair Display,serif;font-size:14px;margin:18px 0 8px;border-bottom:1px solid #0f172a;padding-bottom:4px;">Formación</h2>
<div style="font-size:12px;line-height:1.55;color:#334155;word-wrap:break-word;overflow-wrap:anywhere;">${ctx.eduHtml}</div>
<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:18px;padding-top:14px;border-top:1px solid #0f172a;">
${habCol}
${idiomasCols || '<div style="flex:1;"></div>'}
</div>
</main>
</div>
</div>`;
}

/** Plantilla Corporativo — sidebar, acento rosa. */
function construirPlantillaCorporate(ctx) {
    const pink = "#f8c8d0";
    const sideBg = "#5a5a5a";
    const label = (t) =>
        `<div style="display:inline-block;background:${pink};color:#111;padding:4px 10px;font-size:9px;font-weight:700;letter-spacing:0.1em;margin:0 0 10px;font-family:Montserrat,sans-serif;">${t}</div>`;
    const bars = ctx.skillsItems.slice(0, 8).map((s, i) => {
        const w = 55 + ((i * 17) % 35);
        return `<div style="margin:0 0 10px;font-family:Montserrat,sans-serif;font-size:11px;color:#fff;">
<div style="margin-bottom:3px;">${s}</div>
<div style="height:6px;background:#111;border-radius:3px;overflow:hidden;"><div style="width:${w}%;height:100%;background:${pink};border-radius:3px;"></div></div>`;
    });
    const skillsBlock = bars.length ? bars.join("") : '<p style="color:#ddd;font-size:11px;">—</p>';

    return `<div style="max-width:${W}px;margin:0 auto;overflow:hidden;font-family:Montserrat,Roboto,sans-serif;">
<div style="display:flex;flex-wrap:wrap;">
<aside style="width:34%;min-width:200px;background:${sideBg};color:#fff;box-sizing:border-box;padding:20px 16px;">
${ctx.fotoCorporate}
${label("CONTACTO")}
<div style="font-size:11px;line-height:1.65;margin-bottom:16px;">
<div style="margin-bottom:6px;"><i class="fa-solid fa-phone" style="margin-right:6px;color:${pink};"></i>${ctx.telefono}</div>
<div style="margin-bottom:6px;"><i class="fa-solid fa-envelope" style="margin-right:6px;color:${pink};"></i>${ctx.correo}</div>
<div><i class="fa-solid fa-location-dot" style="margin-right:6px;color:${pink};"></i>${ctx.ubicacion}</div>
</div>
${label("PERFIL")}
<div style="font-size:11px;line-height:1.55;color:#f1f5f9;margin-bottom:18px;word-wrap:break-word;">${ctx.perfilHtml}</div>
${label("HABILIDADES")}
${skillsBlock}
</aside>
<main style="flex:1;min-width:240px;background:#fff;box-sizing:border-box;padding:0;">
<div style="background:${pink};padding:14px 18px;">
<h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:0.03em;color:#111;font-family:Montserrat,sans-serif;">${ctx.nombreUpper}</h1>
</div>
<div style="background:#404040;padding:10px 18px;margin-bottom:6px;">
<p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.15em;color:#fff;">${ctx.tituloUpper}</p>
</div>
<div style="padding:18px 18px 22px;">
<h2 style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:0.08em;color:#111;">FORMACIÓN</h2>
<div style="font-size:12px;line-height:1.6;color:#333;margin-bottom:20px;word-wrap:break-word;">${ctx.eduHtml}</div>
<h2 style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:0.08em;color:#111;">EXPERIENCIA</h2>
<div style="font-size:12px;line-height:1.6;color:#333;word-wrap:break-word;overflow-wrap:anywhere;">${ctx.expHtml}</div>
</div>
</main>
</div>
</div>`;
}

/** Plantilla Minimal — monocromo, líneas, compacto. */
function construirPlantillaMinimal(ctx) {
    const fotoHeader =
        ctx.fotoMinimal ||
        `<div style="width:56px;height:56px;background:#eee;border:1px solid #000;"></div>`;
    return `<div style="max-width:${W}px;margin:0 auto;background:#fff;color:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:20px 22px 24px;">
<div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:3px solid #000;padding-bottom:12px;margin-bottom:12px;">
<div style="flex:1;min-width:180px;">
<h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:0.05em;">${ctx.nombreUpper}</h1>
<p style="margin:6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.06em;">${ctx.tituloUpper}</p>
<div style="height:1px;background:#000;margin-top:8px;max-width:240px;"></div>
</div>
<div style="text-align:right;font-size:11px;line-height:1.65;min-width:160px;">
<div>${fotoHeader}</div>
<div style="margin-top:6px;"><i class="fa-solid fa-phone"></i> ${ctx.telefono}</div>
<div><i class="fa-solid fa-envelope"></i> ${ctx.correo}</div>
<div><i class="fa-solid fa-location-dot"></i> ${ctx.ubicacion}</div>
</div>
</div>
<div style="font-size:12px;line-height:1.55;margin-bottom:14px;color:#222;word-wrap:break-word;">${ctx.perfilHtml}</div>
<div style="border-bottom:3px solid #000;margin-bottom:14px;"></div>
<div style="display:flex;flex-wrap:wrap;gap:18px;">
<div style="flex:1;min-width:180px;">
<h2 style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.08em;">FORMACIÓN</h2>
<div style="font-size:11px;line-height:1.55;color:#333;word-wrap:break-word;">${ctx.eduHtml}</div>
</div>
<div style="flex:1;min-width:180px;">
<h2 style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.08em;">HABILIDADES</h2>
<div style="font-size:11px;line-height:1.55;color:#333;">${ctx.skillsBullets}</div>
</div>
</div>
<div style="border-bottom:3px solid #000;margin:16px 0 14px;"></div>
<h2 style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.08em;">EXPERIENCIA LABORAL</h2>
<div style="font-size:12px;line-height:1.6;color:#333;word-wrap:break-word;overflow-wrap:anywhere;">${ctx.expHtml}</div>
</div>`;
}

/**
 * Normaliza valores guardados (nombres antiguos o de demostración).
 */
function normalizarPlantillaGuardada(p) {
    const map = {
        clasico: "editorial",
        moderno: "corporate",
        ejecutivo: "minimal",
        elegante: "minimal",
        elena: "editorial",
        andrea: "corporate",
        isabela: "minimal",
    };
    return map[p] || p || "editorial";
}

/**
 * Aplica estilos temporales al contenedor de captura para que html2canvas vea todo el alto del CV.
 */
function prepararPreviewParaCaptura(preview) {
    const prev = {
        maxHeight: preview.style.maxHeight,
        overflow: preview.style.overflow,
        overflowX: preview.style.overflowX,
        backgroundColor: preview.style.backgroundColor,
        classList: preview.className,
    };
    preview.classList.add("preview--pdf-capture");
    preview.style.maxHeight = "none";
    preview.style.overflow = "visible";
    preview.style.overflowX = "visible";
    preview.style.backgroundColor = "#ffffff";
    return prev;
}

function restaurarPreviewTrasCaptura(preview, prev) {
    preview.style.maxHeight = prev.maxHeight;
    preview.style.overflow = prev.overflow;
    preview.style.overflowX = prev.overflowX;
    preview.style.backgroundColor = prev.backgroundColor;
    preview.className = prev.classList;
}

/**
 * Inserta en el PDF el canvas completo en una o varias páginas A4 (sin deformar ni recortar contenido).
 */
function canvasAMultipaginaPDF(canvas, doc, opciones) {
    const margin = opciones.marginMm;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const footerReserve = opciones.footerReserveMm || 0;
    const usableH = pageH - 2 * margin - footerReserve;
    const pdfImgW = pageW - 2 * margin;

    const srcW = canvas.width;
    const srcH = canvas.height;
    const fullImgHmm = (pdfImgW * srcH) / srcW;

    if (fullImgHmm <= usableH + 0.35) {
        doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, pdfImgW, fullImgHmm);
        return;
    }

    const pxPorPaginaIdeal = Math.max(1, Math.floor((usableH / fullImgHmm) * srcH));
    let yPx = 0;
    let numPagina = 0;
    while (yPx < srcH) {
        const restantePx = srcH - yPx;
        const slicePx = Math.min(restantePx, pxPorPaginaIdeal > 0 ? pxPorPaginaIdeal : restantePx);
        if (slicePx <= 0) break;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = srcW;
        sliceCanvas.height = slicePx;
        const sctx = sliceCanvas.getContext("2d");
        sctx.fillStyle = "#ffffff";
        sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sctx.drawImage(canvas, 0, yPx, srcW, slicePx, 0, 0, srcW, slicePx);

        const sliceHmmDraw = (slicePx * pdfImgW) / srcW;
        if (numPagina > 0) {
            doc.addPage();
        }
        doc.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, pdfImgW, sliceHmmDraw);

        yPx += slicePx;
        numPagina++;
        if (numPagina > 100) break;
    }
}

function generarCV(omitirValidacion) {
    if (!omitirValidacion && !validarFormulario({})) {
        return;
    }

    revocarBlobsVistaPrevia();

    const nombre = el("nombre").value;
    const tituloProfesional = el("tituloProfesional").value;
    const ubicacion = el("ubicacion").value;
    const telefono = el("telefono").value;
    const correo = el("correo").value;
    const experiencia = el("experiencia").value;
    const habilidades = el("habilidades").value;
    const idiomas = el("idiomas") ? el("idiomas").value : "";
    const educacion = el("educacion") ? el("educacion").value : "";
    const masInformacion = el("masInformacion") ? el("masInformacion").value : "";
    let plantilla = normalizarPlantillaGuardada(el("plantilla").value);

    const perfilHtml = escapeHtml(obtenerPerfilTexto()).replace(/\n/g, "<br>");
    const expHtml =
        escapeHtml(experiencia).replace(/\n/g, "<br>") ||
        '<span style="color:#94a3b8;">Describe tu experiencia.</span>';
    const eduHtml =
        escapeHtml(educacion).replace(/\n/g, "<br>") || '<span style="color:#94a3b8;">—</span>';
    const idiomasHtml = idiomas.trim() ? escapeHtml(idiomas.trim()).replace(/\n/g, "<br>") : "";
    const masInfoHtml =
        escapeHtml(masInformacion.trim()).replace(/\n/g, "<br>") ||
        '<span style="color:#64748b;">Licencia, disponibilidad, etc.</span>';

    const foto = el("foto").files[0];
    const fotoURL = foto ? URL.createObjectURL(foto) : "";
    if (fotoURL) {
        registrarBlobVistaPrevia(fotoURL);
    }

    const titulo = tituloProfesional.trim() || "Profesional";
    const ubic = ubicacion.trim() || "—";
    const tel = telefono.trim() || "—";
    const skillsItems = habilidadesALista(habilidades).map((s) => escapeHtml(s));
    const skillsBullets = skillsItems.length
        ? skillsItems.map((s) => `<div style="margin:0 0 4px;"><span style="font-weight:bold;">·</span> ${s}</div>`).join("")
        : "—";

    const ctx = {
        nombre: escapeHtml(nombre),
        nombreUpper: escapeHtml(nombre.toUpperCase()),
        titulo: escapeHtml(titulo),
        tituloUpper: escapeHtml(titulo.toUpperCase()),
        correo: escapeHtml(correo),
        telefono: escapeHtml(tel),
        ubicacion: escapeHtml(ubic),
        perfilHtml,
        expHtml,
        eduHtml,
        idiomasHtml,
        masInfoHtml,
        skillsItems,
        skillsBullets,
        fotoEditorial: bloquesFotoEditorial(fotoURL),
        fotoCorporate: bloquesFotoCorporate(fotoURL),
        fotoMinimal: bloquesFotoMinimal(fotoURL),
    };

    let contenido = "";
    if (plantillaCustomURL) {
        registrarBlobVistaPrevia(plantillaCustomURL);
        contenido = `<div style="max-width:${W}px;margin:0 auto;"><img src="${plantillaCustomURL}" alt="" style="width:100%;display:block;border-radius:6px;"></div>`;
    } else if (plantilla === "corporate") {
        contenido = construirPlantillaCorporate(ctx);
    } else if (plantilla === "minimal") {
        contenido = construirPlantillaMinimal(ctx);
    } else {
        contenido = construirPlantillaEditorial(ctx);
    }

    const preview = el("preview");
    preview.style.opacity = "0";
    preview.innerHTML = contenido;
    requestAnimationFrame(function () {
        preview.style.opacity = "1";
        anunciarVistaPrevia("Vista del currículum actualizada.");
    });
}

function vistaPreviaCV() {
    if (!validarFormulario({})) return;
    generarCV(true);
    const preview = el("preview");
    if (preview) {
        preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}

function perfilFallbackLocal(experiencia, habilidades) {
    const exp = experiencia.trim() || "experiencia profesional";
    const hab = habilidades.trim() || "habilidades transferibles";
    return (
        `Profesional orientado a resultados, con base en ${hab.split(/[,\n]/)[0]?.trim() || "competencias relevantes"}. ` +
        `Trayectoria: ${exp.slice(0, 200)}${exp.length > 200 ? "…" : ""} ` +
        `Destaca por comunicación clara, trabajo en equipo y mejora continua.`
    );
}

async function llamarOpenAIPerfil(apiKey, userPrompt) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "Eres redactor de CVs. Responde solo con el texto del perfil profesional en español, entre 3 y 4 líneas, sin comillas ni encabezados.",
                },
                { role: "user", content: userPrompt },
            ],
            max_tokens: 400,
            temperature: 0.7,
        }),
    });
    if (!res.ok) {
        const errBody = await res.text();
        throw new Error("HTTP " + res.status + ": " + errBody.slice(0, 300));
    }
    const data = await res.json();
    const t =
        data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
            ? String(data.choices[0].message.content).trim()
            : "";
    if (!t) throw new Error("Respuesta vacía de la API");
    return t;
}

async function generarPerfilIA() {
    const experiencia = el("experiencia").value.trim();
    const habilidades = el("habilidades").value.trim();
    if (!experiencia && !habilidades) {
        alert("Ingresa experiencia o habilidades para contextualizar la IA.");
        return;
    }

    const perfilField = el("perfil");
    if (!perfilField) return;

    const apiKey = (el("apiKey") && el("apiKey").value.trim()) || "";
    const btn = el("btnGenerarIA");
    const label = btn ? btn.textContent : "";
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Generando…";
    }

    try {
        const userPrompt =
            `Experiencia:\n${experiencia || "(no indicada)"}\n\nHabilidades:\n${habilidades || "(no indicadas)"}\n\n` +
            `Genera un perfil profesional en español de 3 a 4 líneas.`;

        if (!apiKey) {
            perfilField.value = perfilFallbackLocal(experiencia, habilidades);
            mostrarMensajeExito("Perfil generado en local (sin API Key).");
            generarCV(true);
            return;
        }

        let texto = "";
        try {
            texto = await llamarOpenAIPerfil(apiKey, userPrompt);
        } catch (e1) {
            console.warn("[CV Studio] Reintento OpenAI.", e1);
            texto = await llamarOpenAIPerfil(apiKey, userPrompt);
        }
        perfilField.value = texto;
        mostrarMensajeExito("Perfil generado con OpenAI.");
        generarCV(true);
    } catch (e) {
        console.error(e);
        perfilField.value = perfilFallbackLocal(experiencia, habilidades);
        mostrarMensajeExito("Se usó texto local (revisa tu API Key o la conexión).");
        alert(
            "No pudimos obtener el perfil desde OpenAI.\nRevisa la API Key y el saldo.\nSe rellenó el perfil con un texto de respaldo."
        );
        generarCV(true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = label || "Generar perfil con IA";
        }
        actualizarUI();
    }
}

function descargarPDF() {
    if (!validarFormulario({})) return;
    generarCV(true);

    if (!window.jspdf || !window.jspdf.jsPDF || typeof window.html2canvas !== "function") {
        mostrarMensajeError("No se cargaron las librerías del PDF (jsPDF / html2canvas). Comprueba tu conexión y recarga.");
        return;
    }

    const preview = el("preview");
    const { jsPDF } = window.jspdf;
    const btnPdf = el("btnDescargarPdf");
    const labelPdf = btnPdf ? btnPdf.textContent : "";

    if (btnPdf) {
        btnPdf.disabled = true;
        btnPdf.setAttribute("aria-busy", "true");
        btnPdf.classList.add("is-loading");
        btnPdf.textContent = "Generando PDF…";
    }

    window.setTimeout(function () {
        const snap = prepararPreviewParaCaptura(preview);

        html2canvas(preview, {
            scale: PDF_SCALE,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
        })
            .then((canvas) => {
                const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                canvasAMultipaginaPDF(canvas, doc, {
                    marginMm: PDF_MARGIN_MM,
                    footerReserveMm: 0,
                });
                doc.save("CV-Studio.pdf");
                mostrarMensajeExito("PDF generado correctamente.");
            })
            .catch(function (err) {
                console.error(err);
                mostrarMensajeError(
                    "No se pudo generar el PDF. Prueba con menos texto, otra imagen o recarga la página."
                );
            })
            .finally(function () {
                restaurarPreviewTrasCaptura(preview, snap);
                if (btnPdf) {
                    btnPdf.disabled = false;
                    btnPdf.removeAttribute("aria-busy");
                    btnPdf.classList.remove("is-loading");
                    btnPdf.textContent = labelPdf || "Descargar PDF";
                }
            });
    }, 280);
}

function recogerDatosCv() {
    return {
        nombre: el("nombre") ? el("nombre").value : "",
        tituloProfesional: el("tituloProfesional") ? el("tituloProfesional").value : "",
        ubicacion: el("ubicacion") ? el("ubicacion").value : "",
        telefono: el("telefono") ? el("telefono").value : "",
        correo: el("correo") ? el("correo").value : "",
        perfil: el("perfil") ? el("perfil").value : "",
        educacion: el("educacion") ? el("educacion").value : "",
        experiencia: el("experiencia") ? el("experiencia").value : "",
        habilidades: el("habilidades") ? el("habilidades").value : "",
        idiomas: el("idiomas") ? el("idiomas").value : "",
        masInformacion: el("masInformacion") ? el("masInformacion").value : "",
        plantilla: el("plantilla") ? el("plantilla").value : "editorial",
    };
}

function aplicarCvDesdeObjeto(data, opciones) {
    const o = opciones || {};
    if (!data || typeof data !== "object") {
        return;
    }
    const skipGenerar = o.skipGenerar === true;

    if (el("nombre")) el("nombre").value = data.nombre || "";
    if (el("tituloProfesional")) el("tituloProfesional").value = data.tituloProfesional || "";
    if (el("ubicacion")) el("ubicacion").value = data.ubicacion || "";
    if (el("telefono")) el("telefono").value = data.telefono || "";
    if (el("correo")) el("correo").value = data.correo || "";
    if (el("perfil")) el("perfil").value = data.perfil || "";
    if (el("educacion")) el("educacion").value = data.educacion || "";
    if (el("experiencia")) el("experiencia").value = data.experiencia || "";
    if (el("habilidades")) el("habilidades").value = data.habilidades || "";
    if (el("idiomas")) el("idiomas").value = data.idiomas || "";
    if (el("masInformacion")) el("masInformacion").value = data.masInformacion || "";

    const plantilla = normalizarPlantillaGuardada(data.plantilla || "editorial");
    if (el("plantilla")) el("plantilla").value = plantilla;
    sincronizarAriaPlantillas(plantilla);

    actualizarUI();
    if (!skipGenerar) {
        generarCV(true);
    }
}

function limpiarFormularioCompleto() {
    if (
        !confirm(
            "¿Vaciar todos los campos y la vista previa? El borrador en localStorage no cambia hasta que pulses Guardar de nuevo."
        )
    ) {
        return;
    }
    const ids = [
        "nombre",
        "tituloProfesional",
        "ubicacion",
        "telefono",
        "correo",
        "perfil",
        "educacion",
        "experiencia",
        "habilidades",
        "idiomas",
        "masInformacion",
    ];
    ids.forEach(function (id) {
        const node = el(id);
        if (node) node.value = "";
    });
    const fotoIn = el("foto");
    if (fotoIn) fotoIn.value = "";
    const pc = el("plantillaCustom");
    if (pc) pc.value = "";
    if (plantillaCustomURL) {
        try {
            URL.revokeObjectURL(plantillaCustomURL);
        } catch (_) {}
        plantillaCustomURL = "";
    }
    if (el("plantilla")) el("plantilla").value = "editorial";
    sincronizarAriaPlantillas("editorial");
    revocarBlobsVistaPrevia();
    const preview = el("preview");
    if (preview) {
        preview.innerHTML = PREVIEW_PLACEHOLDER;
        preview.style.opacity = "1";
    }
    anunciarVistaPrevia("Formulario vaciado.");
    mostrarMensajeExito("Campos reiniciados.");
}

function aplicarTemaInicial() {
    try {
        if (localStorage.getItem(STORAGE_THEME) === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
        }
    } catch (_) {}
}

function alternarTema() {
    try {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        if (isDark) {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem(STORAGE_THEME, "light");
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem(STORAGE_THEME, "dark");
        }
    } catch (_) {}
}

function guardarCV() {
    const data = Object.assign({}, recogerDatosCv());
    localStorage.setItem(STORAGE_CV, JSON.stringify(data));
    mostrarMensajeExito("Borrador guardado en este navegador.");
}

function cargarCV() {
    const raw = localStorage.getItem(STORAGE_CV);
    if (!raw) {
        alert("No hay borrador guardado.");
        return;
    }
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        alert("Datos no válidos.");
        return;
    }
    if (!data || typeof data !== "object") {
        alert("Datos no válidos.");
        return;
    }
    aplicarCvDesdeObjeto(data);
    mostrarMensajeExito("Borrador cargado.");
}

function cargarEjemploCV() {
    el("nombre").value = "María González Ruiz";
    el("tituloProfesional").value = "Responsable comercial B2B";
    el("ubicacion").value = "Ciudad de México, México";
    el("telefono").value = "+52 55 1234 5678";
    el("correo").value = "maria.gonzalez@ejemplo.com";
    el("perfil").value =
        "Perfil orientado a ventas consultivas y fidelización de cartera. Experiencia en entornos digitales y presenciales, con foco en KPIs y mejora continua.";
    el("educacion").value =
        "2015 – 2019\nUniversidad Nacional Ejemplo\nLic. en Administración de Empresas";
    el("experiencia").value =
        "Responsable comercial — TechDemo S.A. de C.V. (2020 – Presente)\n- Cartera B2B y CRM.\n- +18% ventas cruzadas en 12 meses.\n\nEjecutiva de cuentas — Retail Plus (2017 – 2020)\n- Canal tienda y e-commerce.";
    el("habilidades").value = "Negociación, CRM, Excel, presentaciones, trabajo en equipo";
    el("idiomas").value = "Español — Nativo\nInglés — Intermedio alto";
    el("masInformacion").value = "Licencia de conducir\nDisponibilidad nacional";
    el("plantilla").value = "editorial";
    sincronizarAriaPlantillas("editorial");
    generarCV(true);
    mostrarMensajeExito("Ejemplo cargado. Prueba Corporativo y Minimal.");
}

document.addEventListener("DOMContentLoaded", function () {
    aplicarTemaInicial();
    try {
        localStorage.removeItem("premium");
        sessionStorage.removeItem("cv_mp_token");
        sessionStorage.removeItem("cv_mp_started");
    } catch (_) {}
    const y = el("footerYear");
    if (y) y.textContent = String(new Date().getFullYear());
    actualizarUI();

    const btnIA = el("btnGenerarIA");
    if (btnIA) {
        btnIA.addEventListener("click", function () {
            generarPerfilIA();
        });
    }
});
