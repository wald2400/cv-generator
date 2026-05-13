/**
 * CV Generator Pro — script principal
 * Premium: verificación por código tras pago (Mercado Pago abre en nueva pestaña).
 * Plantillas: HTML + CSS inline para coherencia en vista previa y PDF (html2canvas).
 */

/** Pago real Premium ($1 MXN) — Mercado Pago */
const MERCADOPAGO_URL = "https://mpago.la/2681dcq";

const OPENAI_MODEL = "gpt-3.5-turbo";
const STORAGE_CV = "cvData";

/** Códigos válidos para activar premium (demo académica + posibles extensiones). */
const CODIGOS_PREMIUM_VALIDOS = ["PREMIUM2024", "CVPRO-DEMO", "DEMO-PREMIUM"];

let plantillaCustomURL = "";

document.getElementById("plantillaCustom").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
        plantillaCustomURL = URL.createObjectURL(file);
    }
});

function esPremium() {
    return localStorage.getItem("premium") === "true";
}

/** Abre el checkout de Mercado Pago en una nueva pestaña. */
function activarPremium() {
    window.open(MERCADOPAGO_URL, "_blank", "noopener,noreferrer");
}

/**
 * Activa premium solo si el código coincide con la lista permitida.
 * Elimina la activación “falsa” sin comprobar nada.
 */
function verificarCodigoPremium() {
    const input = document.getElementById("codigoPremium");
    if (!input) return;
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) {
        alert("Ingresa el código de activación que recibiste tras el pago (o el código de prueba académica).");
        return;
    }
    if (CODIGOS_PREMIUM_VALIDOS.includes(codigo)) {
        localStorage.setItem("premium", "true");
        actualizarUI();
        alert("✅ Premium activado correctamente. Disfruta todas las funciones.");
        mostrarMensajeExito("Premium activo. PDF sin marca de agua, sin anuncios e IA desbloqueada.");
        input.value = "";
    } else {
        alert(
            "Código incorrecto o no reconocido.\n\nSi ya pagaste en Mercado Pago, revisa el correo o el comprobante por el código.\nPara la demostración en clase usa: PREMIUM2024"
        );
    }
}

function mostrarMensajeExito(texto) {
    const el = document.getElementById("msgExito");
    if (!el) return;
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(mostrarMensajeExito._t);
    mostrarMensajeExito._t = setTimeout(() => {
        el.hidden = true;
    }, 3500);
}

/** Sincroniza UI con estado premium: body, badge, anuncios, banner de pago, hints IA. */
function actualizarUI() {
    const premium = esPremium();
    document.body.classList.toggle("is-premium", premium);

    const badge = document.getElementById("badgePremium");
    if (badge) {
        badge.style.display = premium ? "inline-block" : "none";
    }

    const adTop = document.getElementById("adTopBanner");
    if (esPremium()) {
        const ad = document.querySelector(".ad");
        if (ad) ad.style.display = "none";
        if (adTop) adTop.style.display = "none";
    } else {
        const ad = document.querySelector(".ad");
        if (ad) ad.style.display = "block";
        if (adTop) adTop.style.display = "flex";
        const paymentBanner = document.getElementById("paymentBanner");
        if (paymentBanner) paymentBanner.style.display = "block";
    }

    const hintPdf = document.getElementById("hintPdfGratis");
    if (hintPdf) hintPdf.style.display = premium ? "none" : "";

    const hintIA = document.getElementById("hintIA");
    if (hintIA) {
        hintIA.textContent = premium
            ? "Puedes usar la IA con o sin API Key (sin clave se usa texto simulado)."
            : "La IA requiere versión Premium.";
    }

    const btnIA = document.getElementById("btnGenerarIA");
    if (btnIA) {
        btnIA.classList.toggle("btn-disabled", !premium);
        if (premium) {
            btnIA.removeAttribute("aria-disabled");
        } else {
            btnIA.setAttribute("aria-disabled", "true");
        }
    }
}

function seleccionarPlantilla(tipo, elemento) {
    document.getElementById("plantilla").value = tipo;
    document.querySelectorAll(".plantilla").forEach((el) => el.classList.remove("activa"));
    elemento.classList.add("activa");
}

function escapeHtml(s) {
    if (s == null || s === "") return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

function obtenerPerfilTexto() {
    const t = document.getElementById("perfil").value.trim();
    if (t) return t;
    return "Persona responsable, con habilidades de trabajo en equipo y orientación a resultados.";
}

/** Valida nombre y correo obligatorios y formato mínimo de correo. */
function validarFormulario() {
    const nombre = (document.getElementById("nombre") && document.getElementById("nombre").value.trim()) || "";
    const correo = (document.getElementById("correo") && document.getElementById("correo").value.trim()) || "";

    if (!nombre) {
        alert("Por favor completa el campo obligatorio: Nombre completo.");
        return false;
    }
    if (!correo) {
        alert("Por favor completa el campo obligatorio: Correo electrónico.");
        return false;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    if (!emailOk) {
        alert("El correo electrónico no tiene un formato válido (ejemplo: nombre@dominio.com).");
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

/**
 * Construye HTML/CSS inline — plantilla Clásico (acento azul, dos columnas).
 */
function construirPlantillaClasico(ctx) {
    const skills = ctx.skillsItems.map((s) => `<div style="font-size:13px;color:#334155;margin:0 0 8px;padding-left:14px;position:relative;"><span style="position:absolute;left:0;color:#2563eb;">▸</span>${s}</div>`).join("");
    const skillsBlock = skills || '<div style="font-size:13px;color:#94a3b8;">Añade habilidades en el formulario</div>';
    const idiomasBlock = ctx.idiomasHtml
        ? `<div style="margin-top:20px;"><h3 style="margin:0 0 10px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Idiomas</h3><div style="font-size:13px;color:#334155;line-height:1.5;">${ctx.idiomasHtml}</div></div>`
        : "";

    return `
<div class="cv-doc cv-doc--clasico" style="font-family:'Roboto','Open Sans',Arial,sans-serif;background:#ffffff;color:#1e293b;max-width:820px;margin:0 auto;border-radius:8px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.12);border:1px solid #e2e8f0;">
  <header style="display:flex;flex-wrap:wrap;align-items:center;gap:20px;padding:28px 32px;border-bottom:4px solid #2563eb;background:linear-gradient(180deg,#f8fafc 0%,#ffffff 100%);">
    ${ctx.fotoBlock}
    <div style="flex:1;min-width:200px;">
      <h1 style="margin:0 0 6px;font-size:28px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">${ctx.nombre}</h1>
      <p style="margin:0 0 14px;font-size:15px;color:#2563eb;font-weight:600;">${ctx.titulo}</p>
      <div style="display:flex;flex-wrap:wrap;gap:14px 22px;font-size:13px;color:#475569;">
        <span><i class="fa-solid fa-envelope" style="color:#2563eb;margin-right:6px;"></i>${ctx.correo}</span>
        <span><i class="fa-solid fa-phone" style="color:#2563eb;margin-right:6px;"></i>${ctx.telefono}</span>
        <span><i class="fa-solid fa-location-dot" style="color:#2563eb;margin-right:6px;"></i>${ctx.ubicacion}</span>
      </div>
    </div>
  </header>
  <div style="display:flex;flex-wrap:wrap;">
    <aside style="width:32%;min-width:220px;background:#f1f5f9;padding:24px 20px;border-right:1px solid #e2e8f0;box-sizing:border-box;">
      <h3 style="margin:0 0 12px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Habilidades</h3>
      ${skillsBlock}
      ${idiomasBlock}
    </aside>
    <main style="flex:1;min-width:260px;padding:26px 28px;box-sizing:border-box;">
      <section style="margin-bottom:22px;">
        <h2 style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb;border-left:3px solid #2563eb;padding-left:10px;">Perfil</h2>
        <div style="font-size:14px;line-height:1.65;color:#334155;">${ctx.perfilHtml}</div>
      </section>
      <section>
        <h2 style="margin:0 0 10px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#2563eb;border-left:3px solid #2563eb;padding-left:10px;">Experiencia</h2>
        <div style="font-size:14px;line-height:1.65;color:#334155;">${ctx.expHtml}</div>
      </section>
    </main>
  </div>
</div>`;
}

/**
 * Construye HTML/CSS inline — plantilla Moderno (acento verde azulado, barra superior).
 */
function construirPlantillaModerno(ctx) {
    const skills = ctx.skillsItems.map((s) => `<div style="display:inline-block;margin:4px 6px 4px 0;padding:6px 12px;background:#ecfdf5;color:#065f46;border-radius:20px;font-size:12px;font-weight:600;">${s}</div>`).join("");
    const skillsBlock = skills || '<span style="font-size:12px;color:#94a3b8;">Añade habilidades</span>';
    const idiomasBlock = ctx.idiomasHtml
        ? `<div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.2);"><h3 style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">Idiomas</h3><div style="font-size:13px;line-height:1.55;">${ctx.idiomasHtml}</div></div>`
        : "";

    return `
<div class="cv-doc cv-doc--moderno" style="font-family:'Open Sans','Roboto',Arial,sans-serif;background:#ffffff;color:#1e293b;max-width:820px;margin:0 auto;border-radius:8px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.15);border:1px solid #e2e8f0;">
  <header style="background:linear-gradient(135deg,#0f766e 0%,#115e59 100%);color:#fff;padding:28px 32px;">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:20px;">
      ${ctx.fotoBlockDark}
      <div style="flex:1;min-width:200px;">
        <h1 style="margin:0 0 6px;font-size:26px;font-weight:700;letter-spacing:-0.02em;">${ctx.nombre}</h1>
        <p style="margin:0 0 14px;font-size:15px;opacity:0.95;font-weight:600;">${ctx.titulo}</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px 20px;font-size:13px;opacity:0.92;">
          <span><i class="fa-solid fa-envelope" style="margin-right:6px;"></i>${ctx.correo}</span>
          <span><i class="fa-solid fa-phone" style="margin-right:6px;"></i>${ctx.telefono}</span>
          <span><i class="fa-solid fa-location-dot" style="margin-right:6px;"></i>${ctx.ubicacion}</span>
        </div>
      </div>
    </div>
    <div style="margin-top:18px;">${skillsBlock}</div>
    ${idiomasBlock}
  </header>
  <div style="padding:28px 32px;background:#fafafa;">
    <section style="margin-bottom:24px;padding:20px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
      <h2 style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0f766e;">Perfil profesional</h2>
      <div style="font-size:14px;line-height:1.7;color:#334155;">${ctx.perfilHtml}</div>
    </section>
    <section style="padding:20px;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
      <h2 style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0f766e;">Experiencia</h2>
      <div style="font-size:14px;line-height:1.7;color:#334155;">${ctx.expHtml}</div>
    </section>
  </div>
</div>`;
}

/**
 * Construye HTML/CSS inline — plantilla Ejecutivo (gris oscuro + acento dorado).
 */
function construirPlantillaEjecutivo(ctx) {
    const skills = ctx.skillsItems
        .map(
            (s) =>
                `<li style="margin:0 0 8px;font-size:13px;color:#e2e8f0;padding-left:4px;">${s}</li>`
        )
        .join("");
    const skillsBlock = skills
        ? `<ul style="margin:0;padding-left:18px;">${skills}</ul>`
        : '<p style="font-size:13px;color:#64748b;margin:0;">Añade habilidades</p>';
    const idiomasBlock = ctx.idiomasHtml
        ? `<div style="margin-top:20px;"><h3 style="margin:0 0 8px;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#d97706;">Idiomas</h3><div style="font-size:12px;color:#cbd5e1;line-height:1.55;">${ctx.idiomasHtml}</div></div>`
        : "";

    return `
<div class="cv-doc cv-doc--ejecutivo" style="font-family:'Lato','Roboto',Arial,sans-serif;background:#f8fafc;color:#1e293b;max-width:820px;margin:0 auto;border-radius:8px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.2);border:1px solid #cbd5e1;">
  <header style="background:linear-gradient(180deg,#0f172a 0%,#1e293b 100%);color:#f8fafc;padding:26px 32px;border-bottom:3px solid #d97706;">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:22px;">
      ${ctx.fotoBlockEjecutivo}
      <div style="flex:1;min-width:200px;">
        <h1 style="margin:0 0 4px;font-size:27px;font-weight:700;letter-spacing:0.02em;">${ctx.nombre}</h1>
        <p style="margin:0 0 12px;font-size:14px;color:#d97706;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">${ctx.titulo}</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px 18px;font-size:12px;color:#94a3b8;">
          <span><i class="fa-solid fa-envelope" style="color:#d97706;margin-right:6px;"></i>${ctx.correo}</span>
          <span><i class="fa-solid fa-phone" style="color:#d97706;margin-right:6px;"></i>${ctx.telefono}</span>
          <span><i class="fa-solid fa-location-dot" style="color:#d97706;margin-right:6px;"></i>${ctx.ubicacion}</span>
        </div>
      </div>
    </div>
  </header>
  <div style="display:flex;flex-wrap:wrap;">
    <aside style="width:30%;min-width:200px;background:#1e293b;color:#e2e8f0;padding:24px 20px;box-sizing:border-box;">
      <h3 style="margin:0 0 14px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#d97706;">Competencias</h3>
      ${skillsBlock}
      ${idiomasBlock}
    </aside>
    <main style="flex:1;min-width:260px;padding:28px 30px;background:#ffffff;box-sizing:border-box;">
      <section style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#0f172a;border-bottom:2px solid #d97706;padding-bottom:8px;display:inline-block;">Resumen</h2>
        <div style="font-size:14px;line-height:1.7;color:#334155;margin-top:10px;">${ctx.perfilHtml}</div>
      </section>
      <section>
        <h2 style="margin:0 0 12px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#0f172a;border-bottom:2px solid #d97706;padding-bottom:8px;display:inline-block;">Trayectoria</h2>
        <div style="font-size:14px;line-height:1.7;color:#334155;margin-top:10px;">${ctx.expHtml}</div>
      </section>
    </main>
  </div>
</div>`;
}

/** Bloques de foto con estilos distintos por plantilla (para contraste en header oscuro). */
function bloquesFotoCV(fotoURL) {
    if (fotoURL) {
        const img = `<img src="${fotoURL}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #2563eb;box-shadow:0 4px 14px rgba(37,99,235,0.35);">`;
        const imgDark = `<img src="${fotoURL}" alt="" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.5);box-shadow:0 4px 16px rgba(0,0,0,0.3);">`;
        const imgEj = `<img src="${fotoURL}" alt="" style="width:96px;height:96px;border-radius:4px;object-fit:cover;border:2px solid #d97706;box-shadow:0 4px 16px rgba(0,0,0,0.4);">`;
        return { fotoBlock: img, fotoBlockDark: imgDark, fotoBlockEjecutivo: imgEj };
    }
    const placeholder =
        '<div style="width:96px;height:96px;border-radius:50%;background:#e2e8f0;border:2px dashed #94a3b8;display:flex;align-items:center;justify-content:center;font-size:11px;color:#64748b;text-align:center;padding:8px;">Sin foto</div>';
    const placeholderDark =
        '<div style="width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,0.12);border:2px dashed rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,0.7);text-align:center;padding:8px;">Sin foto</div>';
    const placeholderEj =
        '<div style="width:96px;height:96px;border-radius:4px;background:#334155;border:2px dashed #64748b;display:flex;align-items:center;justify-content:center;font-size:11px;color:#94a3b8;text-align:center;padding:8px;">Sin foto</div>';
    return { fotoBlock: placeholder, fotoBlockDark: placeholderDark, fotoBlockEjecutivo: placeholderEj };
}

/**
 * Genera la vista previa del CV a partir del formulario.
 * @param {boolean} [omitirValidacionFormulario] — true al cargar ejemplo o datos guardados sin validar de nuevo.
 */
function generarCV(omitirValidacionFormulario) {
    if (!omitirValidacionFormulario && !validarFormulario()) {
        return;
    }

    const nombre = document.getElementById("nombre").value;
    const tituloProfesional = document.getElementById("tituloProfesional").value;
    const ubicacion = document.getElementById("ubicacion").value;
    const telefono = document.getElementById("telefono").value;
    const correo = document.getElementById("correo").value;
    const experiencia = document.getElementById("experiencia").value;
    const habilidades = document.getElementById("habilidades").value;
    const idiomas = document.getElementById("idiomas") ? document.getElementById("idiomas").value : "";
    let plantilla = document.getElementById("plantilla").value;
    if (plantilla === "elegante") plantilla = "ejecutivo";

    const perfilHtml = escapeHtml(obtenerPerfilTexto()).replace(/\n/g, "<br>");
    const expHtml = escapeHtml(experiencia).replace(/\n/g, "<br>") || '<span style="color:#94a3b8;">Describe tu experiencia laboral.</span>';
    const idiomasRaw = idiomas.trim();
    const idiomasHtml = idiomasRaw ? escapeHtml(idiomasRaw).replace(/\n/g, "<br>") : "";

    const foto = document.getElementById("foto").files[0];
    const fotoURL = foto ? URL.createObjectURL(foto) : "";

    const titulo = tituloProfesional.trim() || "Profesional";
    const ubic = ubicacion.trim() || "—";
    const tel = telefono.trim() || "—";

    const skillsItems = habilidadesALista(habilidades).map((s) => escapeHtml(s));
    const fotos = bloquesFotoCV(fotoURL);

    const ctx = {
        nombre: escapeHtml(nombre),
        titulo: escapeHtml(titulo),
        correo: escapeHtml(correo),
        telefono: escapeHtml(tel),
        ubicacion: escapeHtml(ubic),
        perfilHtml,
        expHtml,
        idiomasHtml,
        skillsItems,
        fotoBlock: fotos.fotoBlock,
        fotoBlockDark: fotos.fotoBlockDark,
        fotoBlockEjecutivo: fotos.fotoBlockEjecutivo,
    };

    let contenido = "";

    if (plantillaCustomURL) {
        contenido = `<img src="${plantillaCustomURL}" alt="" style="width:100%;display:block;border-radius:8px;">`;
    } else if (plantilla === "clasico") {
        contenido = construirPlantillaClasico(ctx);
    } else if (plantilla === "moderno") {
        contenido = construirPlantillaModerno(ctx);
    } else {
        contenido = construirPlantillaEjecutivo(ctx);
    }

    const preview = document.getElementById("preview");
    preview.style.opacity = "0";
    preview.innerHTML = contenido;
    requestAnimationFrame(() => {
        preview.style.opacity = "1";
    });
}

/** Texto de respaldo cuando no hay API Key o falla OpenAI. */
function perfilFallbackLocal(experiencia, habilidades) {
    const exp = experiencia.trim() || "experiencia profesional";
    const hab = habilidades.trim() || "habilidades transferibles";
    return (
        `Profesional orientado a resultados, con base en ${hab.split(/[,\n]/)[0]?.trim() || "competencias relevantes"}. ` +
        `Su trayectoria incluye: ${exp.slice(0, 200)}${exp.length > 200 ? "…" : ""} ` +
        `Destaca por comunicación clara, trabajo en equipo y mejora continua. ` +
        `Busca aportar valor desde el primer día en entornos dinámicos.`
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
    if (!t) {
        throw new Error("Respuesta vacía de la API");
    }
    return t;
}

/** Genera perfil con OpenAI (si hay #apiKey) o fallback local; mensajes claros al usuario. */
async function generarPerfilIA() {
    if (!esPremium()) {
        alert("🔒 Solo disponible en versión Premium.");
        return;
    }

    const experiencia = document.getElementById("experiencia").value.trim();
    const habilidades = document.getElementById("habilidades").value.trim();
    if (!experiencia && !habilidades) {
        alert("Primero ingresa tu experiencia o habilidades.");
        return;
    }

    const perfilField = document.getElementById("perfil");
    if (!perfilField) return;

    const apiKeyInput = document.getElementById("apiKey");
    const apiKeyRaw = apiKeyInput ? apiKeyInput.value : "";
    const apiKey = apiKeyRaw.trim();
    const btn = document.getElementById("btnGenerarIA");
    const label = btn ? btn.textContent : "";
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Generando…";
    }

    try {
        const userPrompt =
            `Experiencia:\n${experiencia || "(no indicada)"}\n\nHabilidades:\n${habilidades || "(no indicadas)"}\n\n` +
            `Genera un perfil profesional en español de 3 a 4 líneas, tono formal, sin viñetas ni inventar datos que no aparezcan en el texto.`;

        if (!apiKey) {
            console.log("[CV Generator] Fallback local — motivo: API Key vacía; no se llama a OpenAI.");
            perfilField.value = perfilFallbackLocal(experiencia, habilidades);
            mostrarMensajeExito("Perfil generado en local (sin API Key).");
            generarCV(true);
            return;
        }

        let texto = "";
        try {
            texto = await llamarOpenAIPerfil(apiKey, userPrompt);
        } catch (primerError) {
            console.warn("[CV Generator] Primer intento OpenAI fallido; reintentando una vez más.", primerError);
            texto = await llamarOpenAIPerfil(apiKey, userPrompt);
        }

        perfilField.value = texto;
        mostrarMensajeExito("Perfil generado con OpenAI.");
        generarCV(true);
    } catch (e) {
        const motivo = e && e.message ? e.message : String(e);
        console.log("[CV Generator] Fallback local — motivo: error de red o API tras reintento.", motivo);
        console.error(e);
        perfilField.value = perfilFallbackLocal(experiencia, habilidades);
        mostrarMensajeExito("No se pudo conectar con OpenAI; se usó texto local.");
        alert(
            "No pudimos obtener el perfil desde OpenAI (clave inválida, sin saldo o error de red).\nSe rellenó el campo con un texto de ejemplo local. Revisa tu API Key o inténtalo más tarde."
        );
        try {
            generarCV(true);
        } catch (e2) {
            console.error(e2);
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = label || "Generar perfil con IA";
        }
        actualizarUI();
    }
}

/** Exporta la vista previa a PDF (html2canvas escala 2); marca de agua si no es premium. */
function descargarPDF() {
    if (!validarFormulario()) {
        return;
    }

    const { jsPDF } = window.jspdf;
    const preview = document.getElementById("preview");
    const premium = esPremium();

    html2canvas(preview, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 10;
        const maxW = pageW - margin * 2;
        const ratio = canvas.height / canvas.width;
        let imgW = maxW;
        let imgH = imgW * ratio;
        if (imgH > pageH - margin * 2) {
            imgH = pageH - margin * 2;
            imgW = imgH / ratio;
        }
        const xImg = (pageW - imgW) / 2;
        const yImg = margin;
        doc.addImage(imgData, "PNG", xImg, yImg, imgW, imgH);

        if (!esPremium()) {
            doc.setFontSize(12);
            doc.setTextColor(150, 150, 150);
            doc.text("Creado con CV Pro - Versión gratuita", 10, 280);
        }

        doc.save(premium ? "CV-Pro-Premium.pdf" : "CV-Pro-Gratis.pdf");
    });
}

function guardarCV() {
    const data = {
        nombre: document.getElementById("nombre").value,
        tituloProfesional: document.getElementById("tituloProfesional").value,
        ubicacion: document.getElementById("ubicacion").value,
        telefono: document.getElementById("telefono").value,
        correo: document.getElementById("correo").value,
        perfil: document.getElementById("perfil").value,
        experiencia: document.getElementById("experiencia").value,
        habilidades: document.getElementById("habilidades").value,
        idiomas: document.getElementById("idiomas") ? document.getElementById("idiomas").value : "",
        plantilla: document.getElementById("plantilla").value,
        premium: esPremium() ? "true" : "false",
    };
    localStorage.setItem(STORAGE_CV, JSON.stringify(data));
    alert("CV guardado");
}

function cargarCV() {
    const raw = localStorage.getItem(STORAGE_CV);
    if (!raw) {
        alert("No hay CV guardado");
        return;
    }
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        alert("Datos guardados no válidos");
        return;
    }

    document.getElementById("nombre").value = data.nombre || "";
    document.getElementById("tituloProfesional").value = data.tituloProfesional || "";
    document.getElementById("ubicacion").value = data.ubicacion || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("correo").value = data.correo || "";
    document.getElementById("perfil").value = data.perfil || "";
    document.getElementById("experiencia").value = data.experiencia || "";
    document.getElementById("habilidades").value = data.habilidades || "";
    if (document.getElementById("idiomas")) {
        document.getElementById("idiomas").value = data.idiomas || "";
    }
    let plantilla = data.plantilla || "clasico";
    if (plantilla === "elegante") plantilla = "ejecutivo";
    document.getElementById("plantilla").value = plantilla;

    if (data.premium === "true") {
        localStorage.setItem("premium", "true");
    } else if (data.premium === "false") {
        localStorage.removeItem("premium");
    }

    document.querySelectorAll(".plantilla").forEach((el) => el.classList.remove("activa"));
    const tipo = document.getElementById("plantilla").value;
    const activa = document.querySelector('.plantilla[data-tipo="' + tipo + '"]');
    if (activa) activa.classList.add("activa");

    actualizarUI();
    generarCV(true);
    alert("CV cargado");
}

/** Carga datos ficticios para mostrar el diseño de las plantillas (útil en demos). */
function cargarEjemploCV() {
    document.getElementById("nombre").value = "Ana María López Herrera";
    document.getElementById("tituloProfesional").value = "Desarrolladora Full Stack";
    document.getElementById("ubicacion").value = "Ciudad de México, México";
    document.getElementById("telefono").value = "+52 55 1234 5678";
    document.getElementById("correo").value = "ana.lopez@ejemplo.com";
    document.getElementById("perfil").value =
        "Especialista en desarrollo web con más de 5 años construyendo productos escalables. Apasionada por la calidad del código, la accesibilidad y el trabajo colaborativo en equipos ágiles.";
    document.getElementById("experiencia").value =
        "TechNova Solutions — Desarrolladora Senior (2021–Presente)\nLiderazgo técnico en módulos de pagos; migración a React y Node.js.\n\nDigital Craft — Desarrolladora (2018–2021)\nAPIs REST, integraciones y despliegues en la nube.";
    document.getElementById("habilidades").value =
        "JavaScript, TypeScript, React, Node.js\nGit, SQL, metodologías ágiles, comunicación efectiva";
    if (document.getElementById("idiomas")) {
        document.getElementById("idiomas").value = "Español — Nativo\nInglés — Avanzado (C1)";
    }
    document.getElementById("plantilla").value = "clasico";
    document.querySelectorAll(".plantilla").forEach((el) => el.classList.remove("activa"));
    const p = document.querySelector('.plantilla[data-tipo="clasico"]');
    if (p) p.classList.add("activa");
    generarCV(true);
    mostrarMensajeExito("Ejemplo cargado. Puedes cambiar plantilla y pulsar Generar CV.");
}

document.getElementById("btnGenerarIA").addEventListener("click", function () {
    if (!esPremium()) {
        alert("🔒 Solo disponible en versión Premium.");
        return;
    }
    generarPerfilIA();
});

document.addEventListener("DOMContentLoaded", function () {
    actualizarUI();
});
