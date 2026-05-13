/** Pago real Premium ($1 MXN) — Mercado Pago */
const MERCADOPAGO_URL = "https://mpago.la/2681dcq";

const OPENAI_MODEL = "gpt-3.5-turbo";
const STORAGE_CV = "cvData";

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

function activarPremium() {
    window.open(MERCADOPAGO_URL, "_blank", "noopener,noreferrer");
}

function verificarPremium() {
    localStorage.setItem("premium", "true");
    actualizarUIPremium();
    alert("¡Premium activado!");
    mostrarMensajeExito("Premium activo. Ya puedes usar todas las funciones.");
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

function actualizarUIPremium() {
    const premium = esPremium();
    document.body.classList.toggle("is-premium", premium);

    document.querySelectorAll(".ad").forEach((el) => {
        el.style.display = premium ? "none" : "";
    });

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
        btnIA.setAttribute("aria-disabled", premium ? "false" : "true");
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

function generarCV() {
    const nombre = document.getElementById("nombre").value;
    const telefono = document.getElementById("telefono").value;
    const correo = document.getElementById("correo").value;
    const experiencia = document.getElementById("experiencia").value;
    const habilidades = document.getElementById("habilidades").value;
    const plantilla = document.getElementById("plantilla").value;
    const perfilHtml = escapeHtml(obtenerPerfilTexto()).replace(/\n/g, "<br>");

    const foto = document.getElementById("foto").files[0];
    const fotoURL = foto ? URL.createObjectURL(foto) : "";

    let contenido = "";

    if (plantillaCustomURL) {
        contenido = `<img src="${plantillaCustomURL}" alt="" style="width:100%;display:block;">`;
    } else if (plantilla === "clasico") {
        contenido = `
        <div class="cv-header">
            ${fotoURL ? `<img src="${fotoURL}" alt="">` : ""}
            <h2>${escapeHtml(nombre)}</h2>
            <p>${escapeHtml(correo)} | ${escapeHtml(telefono)}</p>
        </div>
        <h3>Perfil</h3><p>${perfilHtml}</p>
        <h3>Experiencia</h3><p>${escapeHtml(experiencia).replace(/\n/g, "<br>")}</p>
        <h3>Habilidades</h3><p>${escapeHtml(habilidades).replace(/\n/g, "<br>")}</p>`;
    } else if (plantilla === "moderno") {
        contenido = `
        <div style="background:#111827;color:white;padding:12px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;">${escapeHtml(nombre)}</h2>
            <p style="margin:8px 0 0;">${escapeHtml(correo)}</p>
        </div>
        <p style="margin:10px 0;">${escapeHtml(telefono)}</p>
        <h3>Perfil</h3><p>${perfilHtml}</p>
        <h3>Experiencia</h3><p>${escapeHtml(experiencia).replace(/\n/g, "<br>")}</p>
        <h3>Habilidades</h3><p>${escapeHtml(habilidades).replace(/\n/g, "<br>")}</p>`;
    } else {
        contenido = `
        <h2 style="color:#2563eb;">${escapeHtml(nombre)}</h2>
        <hr>
        <p>${escapeHtml(correo)} | ${escapeHtml(telefono)}</p>
        <h3>Perfil</h3><p>${perfilHtml}</p>
        <h3>Experiencia</h3><p>${escapeHtml(experiencia).replace(/\n/g, "<br>")}</p>
        <h3>Habilidades</h3><p>${escapeHtml(habilidades).replace(/\n/g, "<br>")}</p>`;
    }

    const preview = document.getElementById("preview");
    preview.style.opacity = "0";
    preview.innerHTML = contenido;
    requestAnimationFrame(() => {
        preview.style.opacity = "1";
    });
}

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

async function generarPerfilIA() {
    if (!esPremium()) {
        alert("Solo disponible en versión Premium");
        return;
    }

    const experiencia = document.getElementById("experiencia").value.trim();
    const habilidades = document.getElementById("habilidades").value.trim();
    const apiKey = (document.getElementById("openaiApiKey") && document.getElementById("openaiApiKey").value.trim()) || "";
    const btn = document.getElementById("btnGenerarIA");
    const label = btn ? btn.textContent : "";
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Generando…";
    }

    try {
        if (!apiKey) {
            document.getElementById("perfil").value = perfilFallbackLocal(experiencia, habilidades);
            mostrarMensajeExito("Perfil generado (modo local, sin API Key).");
            generarCV();
            return;
        }

        const userPrompt =
            `Experiencia:\n${experiencia || "(no indicada)"}\n\nHabilidades:\n${habilidades || "(no indicadas)"}\n\n` +
            `Redacta un perfil profesional en español de exactamente 3 líneas (tres líneas de texto corrido), tono formal, sin viñetas ni inventar datos que no estén en el texto.`;

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
                            "Eres redactor de CVs. Responde solo con el perfil profesional en español, exactamente 3 líneas, sin comillas ni encabezados.",
                    },
                    { role: "user", content: userPrompt },
                ],
                max_tokens: 350,
                temperature: 0.7,
            }),
        });

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        const texto = data.choices?.[0]?.message?.content?.trim();
        if (!texto) throw new Error("Vacío");

        document.getElementById("perfil").value = texto;
        mostrarMensajeExito("Perfil generado con OpenAI.");
        generarCV();
    } catch (e) {
        console.error(e);
        document.getElementById("perfil").value = perfilFallbackLocal(experiencia, habilidades);
        mostrarMensajeExito("No se pudo usar la API; se aplicó texto local de respaldo.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = label || "Generar perfil con IA";
        }
        actualizarUIPremium();
    }
}

function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const preview = document.getElementById("preview");
    const premium = esPremium();

    html2canvas(preview, { scale: 2, useCORS: true, logging: false }).then((canvas) => {
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

        if (!premium) {
            const marca = "Creado con CV Pro - Versión gratuita";
            doc.saveGraphicsState();
            try {
                doc.setGState(new doc.GState({ opacity: 0.1, "stroke-opacity": 0.1 }));
                doc.setTextColor(120, 120, 120);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text(marca, pageW / 2, pageH / 2, {
                    angle: 45,
                    align: "center",
                    baseline: "middle",
                });
            } finally {
                doc.restoreGraphicsState();
            }
        }

        doc.save(premium ? "CV-Pro-Premium.pdf" : "CV-Pro-Gratis.pdf");
    });
}

function guardarCV() {
    const data = {
        nombre: document.getElementById("nombre").value,
        telefono: document.getElementById("telefono").value,
        correo: document.getElementById("correo").value,
        perfil: document.getElementById("perfil").value,
        experiencia: document.getElementById("experiencia").value,
        habilidades: document.getElementById("habilidades").value,
        plantilla: document.getElementById("plantilla").value,
        premium: localStorage.getItem("premium") === "true" ? "true" : "false",
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
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("correo").value = data.correo || "";
    document.getElementById("perfil").value = data.perfil || "";
    document.getElementById("experiencia").value = data.experiencia || "";
    document.getElementById("habilidades").value = data.habilidades || "";
    document.getElementById("plantilla").value = data.plantilla || "clasico";

    if (data.premium === "true") {
        localStorage.setItem("premium", "true");
    } else if (data.premium === "false") {
        localStorage.removeItem("premium");
    }

    document.querySelectorAll(".plantilla").forEach((el) => el.classList.remove("activa"));
    const tipo = document.getElementById("plantilla").value;
    const activa = document.querySelector('.plantilla[data-tipo="' + tipo + '"]');
    if (activa) activa.classList.add("activa");

    actualizarUIPremium();
    generarCV();
    alert("CV cargado");
}

document.getElementById("btnGenerarIA").addEventListener("click", function () {
    if (!esPremium()) {
        alert("Solo disponible en versión Premium");
        return;
    }
    generarPerfilIA();
});

document.addEventListener("DOMContentLoaded", function () {
    actualizarUIPremium();
});
